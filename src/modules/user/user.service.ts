// User service. See prd.md §5.3.
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';

export const userService = {
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        isBanned: true,
        createdAt: true,
        tutorProfile: {
          select: {
            id: true,
            bio: true,
            hourlyRate: true,
            experience: true,
            headline: true,
            isPublished: true,
            ratingAvg: true,
            ratingCount: true,
          },
        },
      },
    });

    if (!user) throw ApiError.notFound('User not found');
    return user;
  },

  async updateMe(userId: string, data: { name?: string; avatarUrl?: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        avatarUrl: data.avatarUrl,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        isBanned: true,
        createdAt: true,
        tutorProfile: {
          select: {
            id: true,
            bio: true,
            hourlyRate: true,
            experience: true,
            headline: true,
            isPublished: true,
            ratingAvg: true,
            ratingCount: true,
          },
        },
      },
    });

    return updated;
  },
};
