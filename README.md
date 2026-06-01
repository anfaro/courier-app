# Courier SuperApps

Mobile-first courier management system with customer management, session tracking, route planning, and earnings monitoring. Built for Indonesian couriers and logistics teams.

**Stack:** Next.js 16 (App Router) • Drizzle ORM • PostgreSQL (Supabase) • NextAuth v4 • Tailwind CSS v4 • Framer Motion v12 • Leaflet / OSRM

---

## Changelog

### v1.3.0 — Configurable Rate
- Rate per package now configurable per user in Settings
- New `rate` column on `users` table (integer, default 1500)
- Earnings page reads dynamic rate from user settings
- `GET /api/settings` returns user settings including rate
- `POST /api/settings` accepts optional `rate` field
- Rate input in Settings with Rp prefix, number input, step 100

### v1.2.1 — Multi-Package & Split Support
- Multi-package per delivery row (`packages` column on `sessionDeliveries`)
- Quantity controls (`[-]`/`[+]`) in incoming modal with running total
- Split modal: when marking >1 packages as done/return/reschedule, choose how many
- Historical sections (Returned, Rescheduled) collapsible with spring-toggle
- Pending deliveries in scrollable container, history below
- Customer selection map auto-selects all pending customers on mount
- Map collapsible with expand/collapse + spring animation
- Map layout restructured: top bar normal flow, map `flex-1`, route controls `shrink-0`

### v1.2.0 — Progress & Financial Update
- Session dashboard (`/progress`) with cards, progress bars, per-user scoping
- Session detail with incoming arrivals, delivery list grouped by status
- Earnings page (`/earnings`) with hero total, Rp 1.500/package rate, cutoff periods (6-20 / 20-6)
- Map embedded in session detail (standalone `/map` page removed)
- MD3 expressive BottomNav redesign (filled pill indicator, spring animations)
- Profile dropdown with Earnings + Admin links
- `sessions`, `incomings`, `sessionDeliveries` tables

### v1.1.0 — Visit Tracking, Bulk Geocoding, Route History
- Check-in/out with live timers and visit history per customer
- Bulk geocoding (Nominatim with rate limiting) for superadmins
- Save/load/delete route history in customer selection map
- Database migrations for `visits` and `trips` tables
- Settings page redesign (Profile Card, Preferences, Profile Info, About)
- Global version source of truth (`lib/version.ts`)
- Bug fixes: user online status, removed broken delivery references from admin pages

### v1.0.0 — Foundation
- Customer, delivery, and cluster CRUD
- Leaflet map with OSRM routing and customer pins
- Search with server-side results across customers, staff, clusters
- Admin dashboard with analytics tabs (activity, errors, access logs)
- Fleet management (user CRUD, role management)
- System health monitoring
- File uploads with proof-of-delivery and house picture support
- i18n (en/id) with custom LanguageProvider
- Dark/light theme with CSS variables

---

## Setup

```bash
git clone <repo-url>
npm install
# Create .env.local with DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET
npx drizzle-kit push
npm run dev
```

## License

MIT
