// Review service. See prd.md §5.3.5.
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';

export const reviewService = {
  async list(tutorProfileId?: string) {
    return prisma.review.findMany({
      where: tutorProfileId ? { tutorProfileId } : {},
      include: { student: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(
    studentId: string,
    data: { bookingId: string; rating: number; comment: string },
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      select: {
        studentId: true,
        status: true,
        tutorProfileId: true,
        review: { select: { id: true } },
      },
    });
    if (!booking) throw ApiError.notFound('Booking not found');
    if (booking.studentId !== studentId) {
      throw ApiError.forbidden('Can only review own bookings');
    }
    if (booking.status !== 'COMPLETED') {
      throw new ApiError(400, 'BAD_STATE', 'Can only review completed bookings');
    }
    if (booking.review) {
      throw ApiError.conflict('Review already exists for this booking');
    }

    return prisma.$transaction(async (tx) => {
      let review;
      try {
        review = await tx.review.create({
          data: {
            bookingId: data.bookingId,
            studentId,
            tutorProfileId: booking.tutorProfileId,
            rating: data.rating,
            comment: data.comment,
          },
          include: { student: { select: { id: true, name: true, avatarUrl: true } } },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw ApiError.conflict('Review already exists for this booking');
        }
        throw err;
      }

      const agg = await tx.review.aggregate({
        where: { tutorProfileId: booking.tutorProfileId },
        _avg: { rating: true },
        _count: { _all: true },
      });

      await tx.tutorProfile.update({
        where: { id: booking.tutorProfileId },
        data: {
          ratingAvg: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
          ratingCount: agg._count._all,
        },
      });

      return review;
    });
  },
};
