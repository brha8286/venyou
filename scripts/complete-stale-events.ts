/**
 * One-off cleanup: mark past events as completed so their leftover tasks stop
 * generating overdue reminders.
 *
 * An event is "stale" when it isn't already completed/cancelled and its end
 * date (endDate ?? eventDate) is more than GRACE_DAYS before today.
 *
 * Dry run (default) — lists what would change, touches nothing:
 *   npx tsx scripts/complete-stale-events.ts
 * Apply:
 *   npx tsx scripts/complete-stale-events.ts --apply
 *
 * Run against production by setting DATABASE_URL for the invocation:
 *   DATABASE_URL="<prod-url>" npx tsx scripts/complete-stale-events.ts --apply
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const GRACE_DAYS = 3;
const apply = process.argv.includes("--apply");

async function main() {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - GRACE_DAYS);

  const candidates = await prisma.event.findMany({
    where: { status: { in: ["planning", "active"] } },
    select: { id: true, title: true, eventDate: true, endDate: true },
    orderBy: { eventDate: "asc" },
  });

  const stale = candidates.filter((e) => (e.endDate ?? e.eventDate) < cutoff);

  if (stale.length === 0) {
    console.log("No stale events found. Nothing to do.");
    return;
  }

  console.log(`${stale.length} stale event(s):`);
  for (const e of stale) {
    const d = (e.endDate ?? e.eventDate).toISOString().slice(0, 10);
    console.log(`  • ${d}  ${e.title}`);
  }

  if (!apply) {
    console.log("\nDry run — pass --apply to mark these completed.");
    return;
  }

  const { count } = await prisma.event.updateMany({
    where: { id: { in: stale.map((e) => e.id) } },
    data: { status: "completed" },
  });
  console.log(`\nMarked ${count} event(s) completed.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
