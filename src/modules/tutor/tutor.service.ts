// Tutor service. See prd.md §5.3.3 / §6.
import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { getBookedRanges } from '../../utils/timeSlots.js';

export type TutorListFilters = {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort?: 'rating' | 'priceAsc' | 'priceDesc' | 'newest';
  page?: number;
  pageSize?: number;
};

export type TutorProfileUpdate = {
  bio: string;
  headline?: string;
  hourlyRate: number;
  experience: number;
  categoryIds: string[];
  isPublished: boolean;
};

export type AvailabilitySlotInput = {
  weekday: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  startMinute: number;
  endMinute: number;
};

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

export const tutorService = {
  async list(filters: TutorListFilters) {
    const page = Math.max(1, Math.floor(filters.page ?? 1));
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(filters.pageSize ?? DEFAULT_PAGE_SIZE)));

    const where: Prisma.TutorProfileWhereInput = {
      isPublished: true,
      user: { isBanned: false },
    };

    if (filters.category) {
      where.categories = { some: { category: { slug: filters.category } } };
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.hourlyRate = {
        ...(filters.minPrice !== undefined && { gte: filters.minPrice }),
        ...(filters.maxPrice !== undefined && { lte: filters.maxPrice }),
      };
    }

    if (filters.minRating !== undefined) {
      where.ratingAvg = { gte: filters.minRating };
    }

    if (filters.q) {
      const q = filters.q;
      where.OR = [
        { headline: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const orderBy: Prisma.TutorProfileOrderByWithRelationInput = (() => {
      switch (filters.sort) {
        case 'priceAsc':
          return { hourlyRate: 'asc' };
        case 'priceDesc':
          return { hourlyRate: 'desc' };
        case 'newest':
          return { createdAt: 'desc' };
        case 'rating':
        default:
          return { ratingAvg: 'desc' };
      }
    })();

    const [items, total] = await Promise.all([
      prisma.tutorProfile.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          headline: true,
          hourlyRate: true,
          ratingAvg: true,
          ratingCount: true,
          user: { select: { id: true, name: true, avatarUrl: true } },
          categories: {
            select: { category: { select: { id: true, name: true, slug: true } } },
          },
        },
      }),
      prisma.tutorProfile.count({ where }),
    ]);

    return {
      items: items.map((t) => ({
        id: t.id,
        user: t.user,
        headline: t.headline,
        hourlyRate: t.hourlyRate,
        ratingAvg: t.ratingAvg,
        ratingCount: t.ratingCount,
        categories: t.categories.map((c) => c.category),
      })),
      page,
      pageSize,
      total,
    };
  },

  async getById(id: string) {
    const profile = await prisma.tutorProfile.findUnique({
      where: { id },
      select: {
        id: true,
        bio: true,
        headline: true,
        hourlyRate: true,
        experience: true,
        ratingAvg: true,
        ratingCount: true,
        isPublished: true,
        user: { select: { id: true, name: true, avatarUrl: true, isBanned: true } },
        categories: {
          select: { category: { select: { id: true, name: true, slug: true } } },
        },
        availability: {
          select: { id: true, weekday: true, startMinute: true, endMinute: true },
          orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            student: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!profile || profile.user.isBanned) throw ApiError.notFound('Tutor not found');

    const now = new Date();
    const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcomingBookings = await prisma.booking.findMany({
      where: {
        tutorProfileId: id,
        status: { not: 'CANCELLED' },
        scheduledAt: { gte: now, lt: horizon },
      },
      select: { scheduledAt: true, durationMin: true },
    });

    const { isPublished: _isPublished, user, categories, ...rest } = profile;

    return {
      ...rest,
      user: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
      categories: categories.map((c) => c.category),
      bookedRanges: getBookedRanges(upcomingBookings, now, horizon),
    };
  },

  async updateProfileForCurrentUser(userId: string, data: TutorProfileUpdate) {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) throw ApiError.notFound('Tutor profile not found');

    return prisma.$transaction(async (tx) => {
      await tx.tutorProfile.update({
        where: { id: profile.id },
        data: {
          bio: data.bio,
          headline: data.headline ?? null,
          hourlyRate: data.hourlyRate,
          experience: data.experience,
          isPublished: data.isPublished,
        },
      });

      await tx.tutorCategory.deleteMany({ where: { tutorProfileId: profile.id } });

      if (data.categoryIds.length > 0) {
        await tx.tutorCategory.createMany({
          data: data.categoryIds.map((categoryId) => ({
            tutorProfileId: profile.id,
            categoryId,
          })),
        });
      }

      return tx.tutorProfile.findUniqueOrThrow({
        where: { id: profile.id },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          categories: { include: { category: true } },
        },
      });
    });
  },

  async getAvailabilityForCurrentUser(userId: string) {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) throw ApiError.notFound('Tutor profile not found');

    return prisma.availability.findMany({
      where: { tutorProfileId: profile.id },
      orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
    });
  },

  async setAvailabilityForCurrentUser(userId: string, slots: AvailabilitySlotInput[]) {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) throw ApiError.notFound('Tutor profile not found');

    return prisma.$transaction(async (tx) => {
      await tx.availability.deleteMany({ where: { tutorProfileId: profile.id } });

      if (slots.length > 0) {
        await tx.availability.createMany({
          data: slots.map((s) => ({
            tutorProfileId: profile.id,
            weekday: s.weekday,
            startMinute: s.startMinute,
            endMinute: s.endMinute,
          })),
          skipDuplicates: true,
        });
      }

      return tx.availability.findMany({
        where: { tutorProfileId: profile.id },
        orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
      });
    });
  },

  async listSessionsForCurrentUser(userId: string) {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) throw ApiError.notFound('Tutor profile not found');

    return prisma.booking.findMany({
      where: { tutorProfileId: profile.id },
      include: {
        student: { select: { id: true, name: true, email: true, avatarUrl: true } },
        tutorProfile: { select: { id: true, hourlyRate: true } },
        review: { select: { id: true, rating: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  },

  async completeSessionForCurrentUser(userId: string, bookingId: string) {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) throw ApiError.notFound('Tutor profile not found');

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { tutorProfileId: true, status: true, scheduledAt: true, durationMin: true },
    });
    if (!booking) throw ApiError.notFound('Booking not found');
    if (booking.tutorProfileId !== profile.id) {
      throw ApiError.forbidden('Cannot modify other tutors\' bookings');
    }
    if (booking.status !== 'CONFIRMED') {
      throw new ApiError(400, 'BAD_STATE', 'Only confirmed bookings can be completed');
    }

    const endTime = new Date(booking.scheduledAt.getTime() + booking.durationMin * 60_000);
    if (endTime > new Date()) {
      throw new ApiError(400, 'BAD_STATE', 'Cannot complete a session before its end time');
    }

    return prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'COMPLETED', completedAt: new Date() },
      include: {
        student: { select: { id: true, name: true, email: true, avatarUrl: true } },
        tutorProfile: { select: { id: true, hourlyRate: true } },
      },
    });
  },
};
