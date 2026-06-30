# Courier SuperApps

> **v1.4.2** — Mobile-first courier management system for Indonesian logistics teams.

[![Next.js](https://img.shields.io/badge/Next.js_16-000000?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React_19-087EA4?logo=react)](https://react.dev)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F?logo=drizzle)](https://orm.drizzle.team)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql)](https://supabase.com)
[![NextAuth](https://img.shields.io/badge/NextAuth_v4-8134AF?)](https://next-auth.js.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion_12-0055FF?logo=framer)](https://www.framer.com/motion)
[![Leaflet](https://img.shields.io/badge/Leaflet-199900?logo=leaflet)](https://leafletjs.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#license)

---

## Screenshots

> *(Screenshots coming soon. In the meantime, run `npm run dev` and explore!)*

---

## Features

### 👥 Customer Management
Full CRUD with paginated list, server-side search, multi-criteria sorting (newest, oldest, recent visit, most visited), and quick filters (pinned, unpinned, visited). Bulk selection enables mass delete and cluster assignment. Each customer supports location pinning (lat/lng), house picture upload, WhatsApp deep links, Google Maps navigation, visit history with check-in/out, and shareable token links.

### 📋 Session & Delivery Tracking
Create daily delivery sessions, log incoming package batches with timestamps, and track delivery status (pending → done / returned / rescheduled). Split modal handles partial deliveries when a row has multiple packages. Progress bars with animated fill, collapsible history sections, and session finalization lock. Per-session analytics chart on the dashboard.

### 🗺️ Route Planning
Leaflet map with OSRM routing engine displays optimized delivery routes. Customer pins with cluster-colored markers. Collapsible map panel in session detail. Save/load/delete named routes for future reuse. Auto-select pending customers on mount.

### 📦 Cluster Management
Group customers into clusters (areas, routes, regions) via M2M junction table. Paginated list with inline edit modal, bulk delete, and per-cluster customer counts. Link directly from a cluster to its filtered customer list.

### 💰 Earnings Tracker
Configurable per-package rate (Rp/courier, default 1500). Earnings page with hero total, cutoff period navigation (7th–20th / 21st–6th), daily bar chart, and stat cards (best day, daily average, total sessions). IDR currency formatting throughout.

### 🔍 Search
Global search across customers, couriers, and clusters with server-side results. Search from any page via the global endpoint at `/api/search/global`.

### 🔐 Authentication & Roles
NextAuth v4 with CredentialsProvider and JWT strategy. Two roles: **courier** (standard) and **superadmin** (full access). Login via email/username. Password reset flow with cryptographically signed tokens. Extended JWT session (id, name, email, role, rate, targetSystem, getGeocode).

### 🛡️ Admin Hub
Superadmin command center with system health monitoring, activity/error/access log analytics, fleet management (user CRUD, role promotion), bulk geocoding via Nominatim (rate-limited), database backup/restore, hot-reloadable database connection settings with multiple saved profiles, and data wipe functionality.

### ⚙️ Settings
Profile card with avatar initial, editable name, and role badge. Theme toggle (light/dark) with CSS variable theming and view-transition animation. Language switcher (English / Indonesian) with locale-aware date formatting. Configurable per-package rate, target system toggle, and auto-geocode toggle. About section with version and commit hash.

### 📷 Image Upload
Multi-provider fallback chain: **Supabase Storage** → **imgBB** → **iimg.live**. Supports house pictures and proof-of-delivery images. Upload via multipart form to `/api/upload`.

### 📱 PWA & Mobile-First
Service worker registered on mount, `beforeinstallprompt` event handling, iOS install instructions, and web app manifest. Desktop User-Agents are redirected to `/not-mobile`. Material Design 3 expressive design language with glassmorphism, spring-based Framer Motion animations, and `active:scale-90` tactile feedback on all touchable elements.

### 🌐 i18n
Custom `LanguageProvider` with English (`en`) and Indonesian (`id`) locales. Dot-separated translation keys covering nav, auth, home, delivery, customer, cluster, admin, settings, map, search, role, session, visit, and earnings domains.

### 🎨 Theming
CSS variable–driven dark/light theme with 180+ lines of Tailwind v4 customization. Includes `.dark` variant, MD3 color tokens (bg-card, text-primary, text-secondary, border-card-border, bg-surface-hover), `.btn-primary`/`.btn-outline`/`.btn-danger` button classes, custom scrollbar, water wave animation, and bubble rise effect.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Full-stack React framework |
| **Language** | TypeScript 5.9 | Type safety |
| **UI** | React 19, Tailwind CSS v4, Framer Motion 12 | Component library, styling, animations |
| **Database** | PostgreSQL (Supabase via `postgres` driver) | Primary data store |
| **ORM** | Drizzle ORM 0.45 | Type-safe queries, migrations |
| **Auth** | NextAuth v4 (JWT + Credentials) | Authentication & session management |
| **Maps** | Leaflet 1.9, react-leaflet 5, OSRM | Interactive mapping & routing |
| **Barcode** | html5-qrcode | Camera-based barcode/QR scanning |
| **Icons** | Inline SVG (Heroicons-style) | No icon library dependency |
| **i18n** | Custom LanguageProvider (context) | English & Indonesian |
| **Hosting** | Supabase / Aiven / any PostgreSQL | Database hosting |

---

## Architecture

### App Structure
```
app/
├── api/          → 63+ REST API route files
│   ├── auth/     → Login, register, password reset
│   ├── customers/→ Customer CRUD, search, stats, visits, share
│   ├── clusters/ → Cluster CRUD
│   ├── sessions/ → Session/incoming/delivery management
│   ├── admin/    → Users, geocode, wipe, bulk ops, system (health, logs, backup, DB config)
│   ├── upload/   → Image upload
│   └── search/   → Global search
├── (page routes) → dashboard, customers, clusters, progress, earnings, settings, admin
└── layout.tsx    → Root layout with Header + BottomNav
```

### Provider Hierarchy
```
SessionProvider → LanguageProvider → ThemeProvider → ToastProvider → ConfirmationProvider → ErrorBoundary
```

### API Route Patterns
- **Hard auth** (returns 401/403): `/api/search/global`, `/api/admin/*`
- **Soft auth** (token optional for logging): customer/cluster/session/etc. resource routes
- **Response**: collections wrapped (`{ customers: [...] }`), singletons returned directly, errors mostly `{ message }`

### Database Schema (10 tables)
All primary keys are `varchar(7)` generated by nanoid (custom alphabet). `latitude`/`longitude` and `codAmount` stored as **text**, not numeric. Relations defined via Drizzle's `relations()` API.

| Table | Purpose |
|---|---|
| `users` | Couriers & admins (rate, targetSystem, getGeocode, role, tokenVersion) |
| `customers` | Customer profiles with lat/lng, house picture, share token |
| `clusters` | Grouping areas/routes |
| `customerClusters` | M2M junction: customers ↔ clusters |
| `customerVisits` | Check-in/out timestamps with notes |
| `sessions` | Daily delivery sessions |
| `incomings` | Incoming package batches per session |
| `sessionDeliveries` | Per-customer delivery rows with status & package count |
| `savedRoutes` | Persisted route configurations |
| `logs` / `errorLogs` / `accessLogs` | Audit & monitoring |

### Component Architecture
All 44 components are `"use client"`. Patterns include:
- **Standard scroll**: `min-h-screen bg-background pb-24` with `max-w-3xl` centered main
- **Full-height fixed header**: `h-[100dvh]` with inner `overflow-y-auto`, used for map & admin pages

---

## Quick Start

```bash
# Clone the repo
git clone <repo-url>
cd courier-app

# Install dependencies
npm install

# Configure environment (see below)
cp .env.local.example .env.local

# Apply database schema
npx drizzle-kit push

# Start development server
npm run dev
```

### Required Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | App base URL (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | NextAuth JWT signing secret |

### Optional Environment Variables

| Variable | Description |
|---|---|
| `IIMG_LIVE_API_KEY` | API key for iimg.live image hosting |
| `IMGBB_API_KEY` | API key for imgBB image hosting (fallback) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase Storage for images (primary) |

### Common Commands

```bash
npm run dev          # Start dev server (webpack, no turbopack)
npx drizzle-kit generate  # Generate migration from schema changes
npx drizzle-kit push      # Push schema/migrations to database
npm run lint         # Lint (may not work in Termux)
npm run typecheck    # TypeScript type checking
```

> **Note:** Development is done on non-root Termux Android. `next build` may fail in this environment.

---

## Project Structure

```
├── app/                  # Next.js App Router pages & API routes
│   ├── api/             # 63+ REST API route files
│   ├── admin/           # Admin hub, users, database
│   ├── clusters/        # Cluster list, detail, edit, new
│   ├── customers/       # Customer list, detail, edit, new, stats
│   ├── progress/        # Session dashboard & detail
│   ├── earnings/        # Earnings tracker
│   ├── settings/        # User settings
│   ├── layout.tsx       # Root layout
│   ├── providers.tsx    # Provider hierarchy
│   ├── template.tsx     # Page transition animations
│   └── globals.css      # Tailwind v4 + theme variables
├── components/          # 44 client components
│   ├── LeafletMap.tsx   # Map with OSRM routing
│   ├── ScannerModal.tsx # HTML5 barcode scanner
│   ├── VisitManager.tsx # Check-in/out UI
│   ├── PageHeader.tsx   # Back button + title
│   ├── BottomNav.tsx    # Mobile bottom navigation
│   └── ...              # All UI components
├── lib/                 # Core library modules
│   ├── schema.ts       # Drizzle ORM schema (10 tables)
│   ├── db.ts           # DB client (proxy-based, hot-reloadable)
│   ├── db-manager.ts   # Connection profiles & hot-reload
│   ├── logger.ts       # Activity/error/access logging
│   ├── images.ts       # Image upload with fallback chain
│   ├── earnings.ts     # Cutoff period math
│   ├── utils.ts        # generateId() via nanoid
│   └── cache.ts        # In-memory cache with TTL
├── drizzle/             # Migration files & meta
├── proxy.ts             # Middleware (auth, mobile-only, admin guard)
├── public/              # Static assets, service worker
└── ROADMAP.md           # Future plans
```

---

## Roadmap

| Version | Focus | Highlights |
|---|---|---|
| **v1.x** ✅ | Foundation | Current: customer/cluster/session CRUD, map, earnings, admin, PWA |
| **v2.0** 🚧 | Local-First | IndexedDB store, offline queue, sync engine, no-login local mode |
| **v3.0** | Desktop Era | Full-screen command center, AI route optimization, Redis, real-time chat |
| **v4.0** | Native Mobile | Expo Android & iOS, push notifications, GPS background tracking |

See [ROADMAP.md](./ROADMAP.md) for full details.

---

## License

MIT
