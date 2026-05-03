// Admin service. See prd.md §5.3.6.
import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import type { AdminBookingListQuery, AdminUserListQuery } from './admin.validation.js';

const DEFAULT_PAGE_SIZE = 20;

export const adminService = {
  async getStats() {
    const [totalUsers, students, tutors, admins, confirmed, completed, cancelled] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.user.count({ where: { role: 'TUTOR' } }),
        prisma.user.count({ where: { role: 'ADMIN' } }),
        prisma.booking.count({ where: { status: 'CONFIRMED' } }),
        prisma.booking.count({ where: { status: 'COMPLETED' } }),
        prisma.booking.count({ where: { status: 'CANCELLED' } }),
      ]);

    const completedBookings = await prisma.booking.findMany({
      where: { status: 'COMPLETED' },
      select: { durationMin: true, tutorProfile: { select: { hourlyRate: true } } },
    });

    const revenueProxy = completedBookings.reduce((sum, b) => {
      return sum + (b.durationMin / 60) * b.tutorProfile.hourlyRate;
    }, 0);

    const topCategories = await prisma.category.findMany({
      select: { name: true, _count: { select: { tutors: true } } },
      orderBy: { tutors: { _count: 'desc' } },
      take: 5,
    });

    return {
      totals: { users: totalUsers, students, tutors, admins },
      bookings: { confirmed, completed, cancelled },
      revenueProxy: Math.round(revenueProxy),
      topCategories: topCategories.map((c) => ({
        name: c.name,
        tutorCount: c._count.tutors,
      })),
    };
  },

  async listUsers(filters: AdminUserListQuery) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

    const where: Prisma.UserWhereInput = {};
    if (filters.role) where.role = filters.role;
    if (filters.banned !== undefined) where.isBanned = filters.banned;
    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { email: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatarUrl: true,
          isBanned: true,
          createdAt: true,
          tutorProfile: {
            select: { id: true, ratingAvg: true, ratingCount: true, isPublished: true },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return { items, page, pageSize, total };
  },

  async setUserBanStatus(actorId: string, targetUserId: string, isBanned: boolean) {
    if (actorId === targetUserId) {
      throw ApiError.forbidden('Admins cannot ban themselves');
    }
    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true },
    });
    if (!target) throw ApiError.notFound('User not found');
    if (target.role === 'ADMIN') {
      throw ApiError.forbidden('Cannot ban another admin');
    }

    return prisma.user.update({
      where: { id: targetUserId },
      data: { isBanned },
      select: { id: true, email: true, name: true, role: true, isBanned: true },
    });
  },

  async listBookings(filters: AdminBookingListQuery) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

    const where: Prisma.BookingWhereInput = {};
    if (filters.status) where.status = filters.status;

    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          student: { select: { id: true, name: true, email: true } },
          tutorProfile: {
            select: {
              id: true,
              hourlyRate: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { scheduledAt: 'desc' },
      }),
      prisma.booking.count({ where }),
    ]);

    return { items, page, pageSize, total };
  },
};
