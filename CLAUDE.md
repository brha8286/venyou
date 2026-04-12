# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

**venyou** is an internal event operations tool for Subculture Audio (SCA). It manages events, tasks, venues, team assignments, and notifications for an Austin-based audio/speaker rental company.

Stack: Next.js 15 + React 19 + TypeScript + PostgreSQL + Prisma + NextAuth v5 + Tailwind CSS v4

## Commands

```bash
npm run dev          # Dev server with Turbopack (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint

npm run db:generate  # Generate Prisma client after schema changes
npm run db:migrate   # Create and apply a new migration
npm run db:push      # Push schema to DB without migration (dev shortcut)
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio GUI
```

Local database runs via Docker:
```bash
docker compose up -d db   # Start Postgres only
docker compose up         # Start full stack (db + app)
```

DB connection: `postgresql://subculture:subculture@localhost:5432/planning`

## Architecture

### App Router Structure
- `src/app/(auth)/login` — Public login page
- `src/app/(dashboard)/*` — All protected routes; middleware enforces auth
- `src/app/api/*` — API routes (Next.js Route Handlers)
- `src/app/api/cron/*` — Scheduled job endpoints (protected by `CRON_SECRET`)

### Auth & Permissions
- NextAuth v5 Credentials provider with bcrypt; session uses JWT strategy
- Session extends with `systemRole`: `"admin" | "manager" | "crew"`
- Permission helpers in `src/lib/permissions.ts` (`isAdmin()`, `canCreateEvent()`, etc.)
- Role hierarchy: crew (assigned tasks only) → manager (events/venues/rolodex) → admin (full access)
- Event-level roles (separate from system roles): `event_manager`, `technical_lead`, `a2`, `marketing_lead`, `driver` — defined in `src/lib/roles.ts`

### Task Generation Pipeline
When an event is created with a template, `generateTasksForEvent()` (`src/lib/task-generation.ts`):
1. Fetches all active `TaskTemplate` records for the template
2. Evaluates `TaskTemplateCondition` records against event flags (`is_home_venue`, `transport_required`, `co_hosted`, `merch_present`)
3. Calculates `startDate`/`dueDate` using `startOffsetDays`/`dueOffsetDays` relative to `eventDate`
4. Resolves assignee: explicit `defaultAssigneeUserId` → role-based lookup via `EventAssignment` → event manager fallback
5. Creates `Task` + `TaskNotification` records for each applicable template

### Notification System
- `src/lib/notifications.ts` handles sending: Resend API (primary) → SMTP fallback for email; Twilio for SMS (optional)
- `/api/cron/daily-reminders` sends each active user a daily summary email with past-due tasks and the next 7 days of upcoming tasks; users with neither are skipped
- `/api/cron/notifications` (every 15 min) drains pending `TaskNotification` records
- Services degrade gracefully if unconfigured

### Database Schema Key Relationships
- `Event` → belongs to `EventTemplate`, `Venue`, and optionally a `Contact` (client)
- `Task` → belongs to `Event`, optionally linked to `TaskTemplate`; assigned to a `User`
- `EventAssignment` → maps `User` to an event role for a specific event (unique on `eventId + userId + eventRole`)
- `TaskNotification` → tracks send status per task/user/channel combination

## Environment Variables

See `.env.example`. Required:
- `DATABASE_URL` — PostgreSQL connection string
- `AUTH_SECRET` — NextAuth secret (`openssl rand -base64 32`)
- `AUTH_URL` — App base URL
- `RESEND_API_KEY` / SMTP vars — Email sending
- `CRON_SECRET` — Bearer token for cron endpoints
- Optional: `TWILIO_*` for SMS
