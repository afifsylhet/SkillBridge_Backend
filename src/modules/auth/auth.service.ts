// Auth service. See prd.md §4 / §5.3.1.
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import type { LoginInput, RegisterInput } from './auth.validation.js';

const BCRYPT_COST = 12;

const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatarUrl: true,
} as const;

export const authService = {
  async registerUser(input: RegisterInput) {
    const email = input.email.toLowerCase();
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

    try {
      const user = await prisma.user.create({
        data: {
          name: input.name,
          email,
          passwordHash,
          role: input.role,
          ...(input.role === 'TUTOR' && {
            tutorProfile: {
              create: { bio: '', hourlyRate: 0, isPublished: false },
            },
          }),
        },
        select: PUBLIC_USER_SELECT,
      });
      return user;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ApiError(409, 'EMAIL_TAKEN', 'Email is already registered');
      }
      throw err;
    }
  },

  async loginUser(input: LoginInput) {
    const email = input.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    if (user.isBanned) {
      throw new ApiError(403, 'USER_BANNED', 'Your account has been banned');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
    };
  },

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tutorProfile: {
          include: {
            categories: { include: { category: true } },
          },
        },
      },
    });
    if (!user) throw new ApiError(401, 'AUTH_REQUIRED', 'Session user no longer exists');

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      isBanned: user.isBanned,
      tutorProfile:
        user.role === 'TUTOR' && user.tutorProfile
          ? {
              id: user.tutorProfile.id,
              bio: user.tutorProfile.bio,
              hourlyRate: user.tutorProfile.hourlyRate,
              experience: user.tutorProfile.experience,
              headline: user.tutorProfile.headline,
              isPublished: user.tutorProfile.isPublished,
              ratingAvg: user.tutorProfile.ratingAvg,
              ratingCount: user.tutorProfile.ratingCount,
              categories: user.tutorProfile.categories.map((tc) => ({
                id: tc.category.id,
                name: tc.category.name,
                slug: tc.category.slug,
              })),
            }
          : null,
    };
  },
};
