// Booking service — slot conflict check authoritative on the server. See prd.md §6.
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import {
  isWithinAvailabilityWindow,
  hasBookingConflict,
  canCancelBooking,
} from '../../utils/timeSlots.js';
import type { BookingCreateInput } from './booking.validation.js';

const BOOKING_INCLUDE = {
  student: { select: { id: true, name: true, email: true, avatarUrl: true } },
  tutorProfile: {
    select: {
      id: true,
      hourlyRate: true,
      headline: true,
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  },
  review: { select: { id: true, rating: true, comment: true, createdAt: true } },
} satisfies Prisma.BookingInclude;

export const bookingService = {
  async create(studentId: string, data: BookingCreateInput) {
    const tutor = await prisma.tutorProfile.findUnique({
      where: { id: data.tutorProfileId },
      include: { availability: true, user: { select: { isBanned: true } } },
    });
    if (!tutor || tutor.user.isBanned) throw ApiError.notFound('Tutor not found');
    if (!tutor.isPublished) throw ApiError.notFound('Tutor not found');

    const scheduledAt = new Date(data.scheduledAt);
    const endTime = new Date(scheduledAt.getTime() + data.durationMin * 60_000);

    const startsInWindow = tutor.availability.some((slot) =>
      isWithinAvailabilityWindow(scheduledAt, slot),
    );
    if (!startsInWindow) {
      throw ApiError.unprocessableEntity('Booking starts outside tutor availability');
    }

    const endsInWindow = tutor.availability.some((slot) => {
      // For end of session: end-1 minute must still be inside the window.
      const lastInstant = new Date(endTime.getTime() - 60_000);
      return isWithinAvailabilityWindow(lastInstant, slot);
    });
    if (!endsInWindow) {
      throw ApiError.unprocessableEntity('Booking duration extends beyond availability window');
    }

    return prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findMany({
        where: {
          tutorProfileId: data.tutorProfileId,
          status: { not: 'CANCELLED' },
        },
        select: { scheduledAt: true, durationMin: true },
      });

      if (hasBookingConflict(scheduledAt, data.durationMin, existing)) {
        throw ApiError.conflict('Time slot already booked');
      }

      try {
        // Sessions start as PENDING — the tutor must explicitly confirm
        // before the slot is locked in for the student.
        return await tx.booking.create({
          data: {
            studentId,
            tutorProfileId: data.tutorProfileId,
            scheduledAt,
            durationMin: data.durationMin,
            notes: data.notes,
            status: 'PENDING',
          },
          include: BOOKING_INCLUDE,
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw ApiError.conflict('Time slot already booked');
        }
        throw err;
      }
    });
  },

  async listForStudent(
    studentId: string,
    status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED',
  ) {
    return prisma.booking.findMany({
      where: { studentId, ...(status ? { status } : {}) },
      include: BOOKING_INCLUDE,
      orderBy: { scheduledAt: 'desc' },
    });
  },

  async getByIdForUser(userId: string, role: string, id: string) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        ...BOOKING_INCLUDE,
        tutorProfile: {
          select: {
            id: true,
            hourlyRate: true,
            headline: true,
            userId: true,
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!booking) throw ApiError.notFound('Booking not found');

    const isStudent = booking.studentId === userId;
    const isTutor = booking.tutorProfile.userId === userId;
    if (!isStudent && !isTutor && role !== 'ADMIN') {
      throw ApiError.forbidden('Cannot view this booking');
    }
    return booking;
  },

  async cancel(studentId: string, id: string) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { studentId: true, status: true, scheduledAt: true },
    });
    if (!booking) throw ApiError.notFound('Booking not found');
    if (booking.studentId !== studentId) {
      throw ApiError.forbidden('Only the booking student can cancel');
    }
    if (booking.status !== 'CONFIRMED' && booking.status !== 'PENDING') {
      throw new ApiError(400, 'BAD_STATE', 'Only pending or confirmed bookings can be cancelled');
    }
    // Cutoff applies once a tutor has confirmed; pending requests can always
    // be withdrawn by the student because they aren't holding the tutor's time yet.
    if (booking.status === 'CONFIRMED' && !canCancelBooking(booking.scheduledAt)) {
      throw new ApiError(400, 'BAD_STATE', 'Cancellation must be at least 2 hours in advance');
    }

    return prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      include: BOOKING_INCLUDE,
    });
  },

  async confirmByTutor(tutorUserId: string, bookingId: string) {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId: tutorUserId },
      select: { id: true },
    });
    if (!profile) throw ApiError.notFound('Tutor profile not found');

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { tutorProfileId: true, status: true, scheduledAt: true },
    });
    if (!booking) throw ApiError.notFound('Booking not found');
    if (booking.tutorProfileId !== profile.id) {
      throw ApiError.forbidden('Cannot modify other tutors\' bookings');
    }
    if (booking.status !== 'PENDING') {
      throw new ApiError(400, 'BAD_STATE', 'Only pending bookings can be confirmed');
    }
    if (booking.scheduledAt.getTime() <= Date.now()) {
      throw new ApiError(400, 'BAD_STATE', 'Cannot confirm a session that has already started');
    }

    return prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
      include: BOOKING_INCLUDE,
    });
  },

  async declineByTutor(tutorUserId: string, bookingId: string) {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId: tutorUserId },
      select: { id: true },
    });
    if (!profile) throw ApiError.notFound('Tutor profile not found');

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { tutorProfileId: true, status: true },
    });
    if (!booking) throw ApiError.notFound('Booking not found');
    if (booking.tutorProfileId !== profile.id) {
      throw ApiError.forbidden('Cannot modify other tutors\' bookings');
    }
    if (booking.status !== 'PENDING') {
      throw new ApiError(400, 'BAD_STATE', 'Only pending bookings can be declined');
    }

    return prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      include: BOOKING_INCLUDE,
    });
  },
};
