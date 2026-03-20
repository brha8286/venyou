import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('subculture123', 10);

  // ── Users ──────────────────────────────────────────────────────────────────

  const brandon = await prisma.user.upsert({
    where: { email: 'brandon@subculture.audio' },
    update: {},
    create: {
      name: 'Brandon',
      email: 'brandon@subculture.audio',
      passwordHash,
      systemRole: 'admin',
      smsEnabled: true,
    },
  });

  const victor = await prisma.user.upsert({
    where: { email: 'victor@subculture.audio' },
    update: {},
    create: {
      name: 'Victor',
      email: 'victor@subculture.audio',
      passwordHash,
      systemRole: 'manager',
    },
  });

  const brian = await prisma.user.upsert({
    where: { email: 'brian@subculture.audio' },
    update: {},
    create: {
      name: 'Brian',
      email: 'brian@subculture.audio',
      passwordHash,
      systemRole: 'manager',
    },
  });

  const elijah = await prisma.user.upsert({
    where: { email: 'elijah@subculture.audio' },
    update: {},
    create: {
      name: 'Elijah',
      email: 'elijah@subculture.audio',
      passwordHash,
      systemRole: 'crew',
    },
  });

  const seth = await prisma.user.upsert({
    where: { email: 'seth@subculture.audio' },
    update: {},
    create: {
      name: 'Seth',
      email: 'seth@subculture.audio',
      passwordHash,
      systemRole: 'crew',
    },
  });

  console.log(`Seeded ${5} users`);

  // ── Venues ─────────────────────────────────────────────────────────────────

  const venues = [
    {
      name: 'The Tracks',
      city: 'Austin',
      state: 'TX',
      isHomeVenue: true,
    },
    {
      name: 'Bathe Austin',
      city: 'Austin',
      state: 'TX',
      isHomeVenue: false,
    },
    {
      name: 'Cozy Cannabis',
      city: 'Austin',
      state: 'TX',
      isHomeVenue: false,
    },
    {
      name: 'Royal Rooms',
      city: 'Austin',
      state: 'TX',
      isHomeVenue: false,
    },
  ];

  for (const venue of venues) {
    await prisma.venue.upsert({
      where: { id: '00000000-0000-0000-0000-000000000000' }, // no unique field besides id; force create
      update: {},
      create: venue,
    });
  }

  // Clean up duplicate venues from re-runs — keep only the latest per name
  const allVenues = await prisma.venue.findMany({ orderBy: { createdAt: 'desc' } });
  const seenNames = new Set<string>();
  for (const v of allVenues) {
    if (seenNames.has(v.name)) {
      await prisma.venue.delete({ where: { id: v.id } });
    } else {
      seenNames.add(v.name);
    }
  }

  console.log(`Seeded ${venues.length} venues`);

  // ── Event Template: In-House Subculture Event ──────────────────────────────

  const inHouseTemplate = await prisma.eventTemplate.upsert({
    where: { name: 'In-House Subculture Event' },
    update: {},
    create: {
      name: 'In-House Subculture Event',
      description: 'Standard template for Subculture-produced events at our home venue.',
    },
  });

  // Delete existing task templates for this event template (idempotent re-seed)
  await prisma.taskTemplate.deleteMany({
    where: { eventTemplateId: inHouseTemplate.id },
  });

  interface TaskTemplateSeed {
    phase: string;
    name: string;
    dueOffsetDays: number;
    defaultRole: string;
    sortOrder: number;
    conditional?: { fieldName: string; valueText: string };
  }

  const inHouseTaskTemplates: TaskTemplateSeed[] = [
    // Talent phase
    { phase: 'talent', name: 'Finalize lineup', dueOffsetDays: -30, defaultRole: 'event_manager', sortOrder: 10 },

    // Promotion phase
    { phase: 'promotion', name: 'Produce announcement flyer', dueOffsetDays: -30, defaultRole: 'marketing_lead', sortOrder: 20 },
    { phase: 'promotion', name: 'Publish month-prior post', dueOffsetDays: -30, defaultRole: 'marketing_lead', sortOrder: 21 },
    { phase: 'promotion', name: 'Produce hype video', dueOffsetDays: -14, defaultRole: 'marketing_lead', sortOrder: 22 },
    { phase: 'promotion', name: 'Publish two-weeks-prior post', dueOffsetDays: -14, defaultRole: 'marketing_lead', sortOrder: 23 },
    { phase: 'promotion', name: 'Publish week-prior post', dueOffsetDays: -7, defaultRole: 'marketing_lead', sortOrder: 24 },
    { phase: 'promotion', name: 'Publish three-days-prior post', dueOffsetDays: -3, defaultRole: 'marketing_lead', sortOrder: 25 },
    { phase: 'promotion', name: 'Publish day-of post', dueOffsetDays: 0, defaultRole: 'marketing_lead', sortOrder: 26 },

    // Crew phase
    { phase: 'crew', name: 'Assign PM', dueOffsetDays: -21, defaultRole: 'event_manager', sortOrder: 30 },
    { phase: 'crew', name: 'Assign A1', dueOffsetDays: -14, defaultRole: 'event_manager', sortOrder: 31 },
    { phase: 'crew', name: 'Organize load-in hands', dueOffsetDays: -7, defaultRole: 'event_manager', sortOrder: 32 },
    { phase: 'crew', name: 'Organize load-out hands', dueOffsetDays: -7, defaultRole: 'event_manager', sortOrder: 33 },

    // Transportation phase (all conditional on transport_required)
    {
      phase: 'transportation', name: 'Determine gear package', dueOffsetDays: -7,
      defaultRole: 'technical_lead', sortOrder: 40,
      conditional: { fieldName: 'transport_required', valueText: 'true' },
    },
    {
      phase: 'transportation', name: 'Select truck vendor', dueOffsetDays: -5,
      defaultRole: 'driver', sortOrder: 41,
      conditional: { fieldName: 'transport_required', valueText: 'true' },
    },
    {
      phase: 'transportation', name: 'Reserve truck', dueOffsetDays: -3,
      defaultRole: 'driver', sortOrder: 42,
      conditional: { fieldName: 'transport_required', valueText: 'true' },
    },

    // Event Day phase
    { phase: 'event_day', name: 'Load-in', dueOffsetDays: -1, defaultRole: 'event_manager', sortOrder: 50 },
    { phase: 'event_day', name: 'Soundcheck', dueOffsetDays: 0, defaultRole: 'technical_lead', sortOrder: 51 },

    // Strike phase
    { phase: 'strike', name: 'Strike system', dueOffsetDays: 0, defaultRole: 'event_manager', sortOrder: 60 },
  ];

  for (const tmpl of inHouseTaskTemplates) {
    const { conditional, ...data } = tmpl;

    const created = await prisma.taskTemplate.create({
      data: {
        ...data,
        eventTemplateId: inHouseTemplate.id,
      },
    });

    if (conditional) {
      await prisma.taskTemplateCondition.create({
        data: {
          taskTemplateId: created.id,
          fieldName: conditional.fieldName,
          operator: 'eq',
          valueText: conditional.valueText,
        },
      });
    }
  }

  console.log(`Seeded ${inHouseTaskTemplates.length} task templates for "${inHouseTemplate.name}"`);

  // ── Event Template: Third-Party Event ──────────────────────────────────────

  const thirdPartyTemplate = await prisma.eventTemplate.upsert({
    where: { name: 'Third-Party Event' },
    update: {},
    create: {
      name: 'Third-Party Event',
      description: 'Template for events where Subculture provides audio services for a third-party promoter.',
    },
  });

  await prisma.taskTemplate.deleteMany({
    where: { eventTemplateId: thirdPartyTemplate.id },
  });

  const thirdPartyTaskTemplates: TaskTemplateSeed[] = [
    // Promotion phase (reduced set — no talent phase)
    { phase: 'promotion', name: 'Publish week-prior post', dueOffsetDays: -7, defaultRole: 'marketing_lead', sortOrder: 20 },
    { phase: 'promotion', name: 'Publish day-of post', dueOffsetDays: 0, defaultRole: 'marketing_lead', sortOrder: 21 },

    // Crew phase
    { phase: 'crew', name: 'Assign PM', dueOffsetDays: -21, defaultRole: 'event_manager', sortOrder: 30 },
    { phase: 'crew', name: 'Assign A1', dueOffsetDays: -14, defaultRole: 'event_manager', sortOrder: 31 },
    { phase: 'crew', name: 'Organize load-in hands', dueOffsetDays: -7, defaultRole: 'event_manager', sortOrder: 32 },
    { phase: 'crew', name: 'Organize load-out hands', dueOffsetDays: -7, defaultRole: 'event_manager', sortOrder: 33 },

    // Transportation phase (all conditional)
    {
      phase: 'transportation', name: 'Determine gear package', dueOffsetDays: -7,
      defaultRole: 'technical_lead', sortOrder: 40,
      conditional: { fieldName: 'transport_required', valueText: 'true' },
    },
    {
      phase: 'transportation', name: 'Select truck vendor', dueOffsetDays: -5,
      defaultRole: 'driver', sortOrder: 41,
      conditional: { fieldName: 'transport_required', valueText: 'true' },
    },
    {
      phase: 'transportation', name: 'Reserve truck', dueOffsetDays: -3,
      defaultRole: 'driver', sortOrder: 42,
      conditional: { fieldName: 'transport_required', valueText: 'true' },
    },

    // Event Day phase
    { phase: 'event_day', name: 'Load-in', dueOffsetDays: -1, defaultRole: 'event_manager', sortOrder: 50 },
    { phase: 'event_day', name: 'Soundcheck', dueOffsetDays: 0, defaultRole: 'technical_lead', sortOrder: 51 },

    // Strike phase
    { phase: 'strike', name: 'Strike system', dueOffsetDays: 0, defaultRole: 'event_manager', sortOrder: 60 },
  ];

  for (const tmpl of thirdPartyTaskTemplates) {
    const { conditional, ...data } = tmpl;

    const created = await prisma.taskTemplate.create({
      data: {
        ...data,
        eventTemplateId: thirdPartyTemplate.id,
      },
    });

    if (conditional) {
      await prisma.taskTemplateCondition.create({
        data: {
          taskTemplateId: created.id,
          fieldName: conditional.fieldName,
          operator: 'eq',
          valueText: conditional.valueText,
        },
      });
    }
  }

  console.log(`Seeded ${thirdPartyTaskTemplates.length} task templates for "${thirdPartyTemplate.name}"`);

  console.log('Seeding complete.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
