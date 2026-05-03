// Seeds admin, categories, demo tutors, and demo activity. See prd.md §12.
import { prisma } from '../src/config/prisma.js';
import bcrypt from 'bcrypt';

const ADMIN_EMAIL = 'admin@skillbridge.dev';
const ADMIN_PASSWORD = 'Admin@12345';
const STUDENT_EMAIL = 'student@skillbridge.dev';
const STUDENT_PASSWORD = 'Student@123';
const TUTOR_PASSWORD = 'Tutor@123';

const CATEGORIES = [
  { name: 'Web Development', slug: 'web-development', iconKey: 'code' },
  { name: 'Mobile Development', slug: 'mobile-development', iconKey: 'code' },
  { name: 'Data Science', slug: 'data-science', iconKey: 'chart' },
  { name: 'Machine Learning', slug: 'machine-learning', iconKey: 'flask' },
  { name: 'Design', slug: 'design', iconKey: 'palette' },
  { name: 'Marketing', slug: 'marketing', iconKey: 'briefcase' },
  { name: 'Languages', slug: 'languages', iconKey: 'globe' },
  { name: 'Music', slug: 'music', iconKey: 'music' },
];

const TUTOR_PROFILES = [
  {
    name: 'Ada Lovelace',
    email: 'tutor1@skillbridge.dev',
    headline: 'Senior Web Engineer · React + Node',
    bio: 'I help students master modern full-stack development with React, Node, and Postgres. Friendly, structured, and project-driven.',
    hourlyRate: 45,
    experience: 8,
    categorySlugs: ['web-development', 'mobile-development'],
  },
  {
    name: 'Linus Pauling',
    email: 'tutor2@skillbridge.dev',
    headline: 'Data Scientist · Python and SQL',
    bio: 'Former research engineer. I teach Python, SQL, and applied statistics with hands-on Jupyter sessions.',
    hourlyRate: 55,
    experience: 10,
    categorySlugs: ['data-science', 'machine-learning'],
  },
  {
    name: 'Grace Hopper',
    email: 'tutor3@skillbridge.dev',
    headline: 'Product Designer · UX + UI',
    bio: 'I coach designers from portfolio review to advanced Figma workflows and design systems.',
    hourlyRate: 50,
    experience: 7,
    categorySlugs: ['design', 'marketing'],
  },
  {
    name: 'Rosa Iglesias',
    email: 'tutor4@skillbridge.dev',
    headline: 'Spanish Coach · Conversational and Business',
    bio: 'Native Spanish speaker. I make grammar painless and conversation natural with role-plays.',
    hourlyRate: 30,
    experience: 6,
    categorySlugs: ['languages'],
  },
  {
    name: 'Kenji Tanaka',
    email: 'tutor5@skillbridge.dev',
    headline: 'Pianist · Theory and Performance',
    bio: 'Conservatory-trained pianist. I teach jazz, classical theory, and improv from beginner to advanced.',
    hourlyRate: 40,
    experience: 12,
    categorySlugs: ['music'],
  },
  {
    name: 'Priya Nair',
    email: 'tutor6@skillbridge.dev',
    headline: 'ML Engineer · Deep Learning',
    bio: 'I help students build real ML projects with PyTorch and structured curriculums for interview prep.',
    hourlyRate: 60,
    experience: 9,
    categorySlugs: ['machine-learning', 'data-science'],
  },
];

const WEEKDAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

async function main() {
  console.log('Seeding categories...');
  const categories = [];
  for (const c of CATEGORIES) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, iconKey: c.iconKey },
      create: c,
    });
    categories.push(cat);
  }
  console.log(`  ${categories.length} categories ready`);

  console.log('Seeding admin...');
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      name: 'SkillBridge Admin',
      role: 'ADMIN',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    },
  });
  console.log(`  admin: ${admin.email}`);

  console.log('Seeding student...');
  const student = await prisma.user.upsert({
    where: { email: STUDENT_EMAIL },
    update: {},
    create: {
      email: STUDENT_EMAIL,
      passwordHash: await bcrypt.hash(STUDENT_PASSWORD, 12),
      name: 'Demo Student',
      role: 'STUDENT',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student',
    },
  });
  console.log(`  student: ${student.email}`);

  console.log('Seeding tutors...');
  const tutorProfiles: Array<{ profileId: string; user: { id: string; name: string } }> = [];
  for (const t of TUTOR_PROFILES) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        email: t.email,
        passwordHash: await bcrypt.hash(TUTOR_PASSWORD, 12),
        name: t.name,
        role: 'TUTOR',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(t.email)}`,
      },
    });

    const profile = await prisma.tutorProfile.upsert({
      where: { userId: user.id },
      update: {
        bio: t.bio,
        headline: t.headline,
        hourlyRate: t.hourlyRate,
        experience: t.experience,
        isPublished: true,
      },
      create: {
        userId: user.id,
        bio: t.bio,
        headline: t.headline,
        hourlyRate: t.hourlyRate,
        experience: t.experience,
        isPublished: true,
      },
    });

    // Reset categories
    await prisma.tutorCategory.deleteMany({ where: { tutorProfileId: profile.id } });
    const linked = categories.filter((c) => t.categorySlugs.includes(c.slug));
    if (linked.length > 0) {
      await prisma.tutorCategory.createMany({
        data: linked.map((c) => ({ tutorProfileId: profile.id, categoryId: c.id })),
        skipDuplicates: true,
      });
    }

    // Reset and create availability windows: 4-5 windows per tutor
    await prisma.availability.deleteMany({ where: { tutorProfileId: profile.id } });
    const seed = (t.email.charCodeAt(t.email.length - 1) % 3) + 4; // 4-6
    for (let j = 0; j < seed; j++) {
      const weekday = WEEKDAYS[j % WEEKDAYS.length]!;
      const startMinute = 9 * 60 + (j * 60); // 09:00, 10:00, ...
      const endMinute = startMinute + 180; // 3-hour blocks
      await prisma.availability.create({
        data: { tutorProfileId: profile.id, weekday, startMinute, endMinute },
      });
    }

    tutorProfiles.push({ profileId: profile.id, user: { id: user.id, name: t.name } });
  }
  console.log(`  ${tutorProfiles.length} tutor profiles ready`);

  console.log('Seeding completed bookings + reviews...');
  // Create one COMPLETED booking + review for each of the first 3 tutors.
  for (let i = 0; i < 3; i++) {
    const t = tutorProfiles[i]!;
    const past = new Date();
    past.setDate(past.getDate() - (5 + i));
    past.setUTCHours(14, 0, 0, 0);

    const existing = await prisma.booking.findFirst({
      where: { tutorProfileId: t.profileId, scheduledAt: past },
    });
    if (existing) continue;

    const booking = await prisma.booking.create({
      data: {
        studentId: student.id,
        tutorProfileId: t.profileId,
        scheduledAt: past,
        durationMin: 60,
        status: 'COMPLETED',
        completedAt: new Date(past.getTime() + 60 * 60_000),
      },
    });

    const rating = 4 + (i % 2); // 4 or 5
    await prisma.review.create({
      data: {
        bookingId: booking.id,
        studentId: student.id,
        tutorProfileId: t.profileId,
        rating,
        comment:
          rating === 5
            ? 'Excellent session — clear, patient, and well-prepared. Highly recommend.'
            : 'Good explanation of the core concepts and helpful examples throughout.',
      },
    });
  }

  // Recompute aggregates for all tutors with reviews.
  for (const t of tutorProfiles) {
    const agg = await prisma.review.aggregate({
      where: { tutorProfileId: t.profileId },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await prisma.tutorProfile.update({
      where: { id: t.profileId },
      data: {
        ratingAvg: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
        ratingCount: agg._count._all,
      },
    });
  }

  // Create one upcoming CONFIRMED booking for the demo student so the dashboard has content.
  const upcomingTutor = tutorProfiles[0]!;
  const upcoming = new Date();
  upcoming.setDate(upcoming.getDate() + 3);
  upcoming.setUTCHours(10, 0, 0, 0);
  const upcomingExists = await prisma.booking.findFirst({
    where: { tutorProfileId: upcomingTutor.profileId, scheduledAt: upcoming },
  });
  if (!upcomingExists) {
    await prisma.booking.create({
      data: {
        studentId: student.id,
        tutorProfileId: upcomingTutor.profileId,
        scheduledAt: upcoming,
        durationMin: 60,
        status: 'CONFIRMED',
        notes: 'Looking forward to the session!',
      },
    });
  }

  console.log('\nSeed complete.');
  console.log('--------------------------------');
  console.log(`Admin:   ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`Student: ${STUDENT_EMAIL} / ${STUDENT_PASSWORD}`);
  console.log(`Tutors:  tutor{1-6}@skillbridge.dev / ${TUTOR_PASSWORD}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error('Seed error:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
