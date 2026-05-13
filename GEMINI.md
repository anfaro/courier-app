# Project Courier SuperApp

## Architecture & Infrastructure
- **Framework:** Next.js 15+ (App Router)
- **Database:** PostgreSQL hosted on **Supabase**
- **ORM:** Drizzle ORM
- **Authentication:** NextAuth.js (Auth.js)

## Coding Conventions
### Identity Management
- **Primary Keys:** All tables use 7-character alphanumeric **nanoids** as primary keys (e.g., `varchar(7)`).
- **ID Generation:** Always use the `generateId()` helper from `@/lib/utils` when inserting new records.
- **Foreign Keys:** Must match the `varchar(7)` type of the referenced primary key.

### Database Operations
- **Migrations:** Managed via `drizzle-kit`. 
  - Use `npm run db:generate` to create migrations.
  - Use `npm run db:push` for development syncing.
- **Type Safety:** Maintain strict synchronization between `lib/schema.ts` and the physical database. Avoid manual `parseInt` calls on IDs as they are now strings.

## UI & UX
- **Styling:** Tailwind CSS with a focus on "MD3 Expressive" mobile-first design.
- **Components:** High-quality, polished components with interactive feedback (Framer Motion).
