// Category service. See prd.md §5.3.2.
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import type { CategoryCreateInput, CategoryUpdateInput } from './category.validation.js';

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  let slug = base || 'category';
  let i = 1;
  // Loop until we find an available slug.
  while (true) {
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${base}-${++i}`;
  }
}

export const categoryService = {
  async list() {
    const cats = await prisma.category.findMany({
      include: { _count: { select: { tutors: true } } },
      orderBy: { name: 'asc' },
    });
    return cats.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      iconKey: c.iconKey,
      tutorCount: c._count.tutors,
    }));
  },

  async create(data: CategoryCreateInput) {
    const slug = await uniqueSlug(slugify(data.name));
    try {
      return await prisma.category.create({
        data: { name: data.name, slug, iconKey: data.iconKey ?? null },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw ApiError.conflict('Category with this name already exists');
      }
      throw err;
    }
  },

  async update(id: string, data: CategoryUpdateInput) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Category not found');

    const nextName = data.name ?? existing.name;
    const slug =
      data.name && data.name !== existing.name
        ? await uniqueSlug(slugify(data.name), id)
        : existing.slug;

    try {
      return await prisma.category.update({
        where: { id },
        data: {
          name: nextName,
          slug,
          ...(data.iconKey !== undefined && { iconKey: data.iconKey }),
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw ApiError.conflict('Category with this name already exists');
      }
      throw err;
    }
  },

  async remove(id: string) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Category not found');
    await prisma.category.delete({ where: { id } });
  },
};
