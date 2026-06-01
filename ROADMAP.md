# 🗺️ Courier Super App Roadmap

## ✅ v1.0–1.3 — Foundation
- Customer, cluster, delivery CRUD
- Map with OSRM routing and customer pins
- Global search across customers, staff, clusters
- Admin dashboard with analytics (activity, errors, access logs)
- Fleet management (user CRUD, role management)
- Visit tracking with check-in/out and live timers
- Bulk geocoding via Nominatim
- Session tracking with incoming management and delivery status flow
- Earnings page with configurable per-package rate
- HugeIcons, MD3 expressive design, i18n (en/id)

## 🚧 v2.0 — DB-Independent Architecture

The app should boot and function without any external database. All data lives locally first; the remote PostgreSQL is optional, added later when the user chooses to sync.

### Local-First Data Layer
- [ ] **IndexedDB store**: All entities (customers, clusters, sessions, deliveries, visits) stored in IndexedDB via Dexie.js or idb
- [ ] **Local schema**: Same shape as Drizzle schema but persisted in IndexedDB
- [ ] **Boot without DB**: App loads from local storage on first launch — zero config, no env vars required
- [ ] **Graceful DB detection**: App works with no PostgreSQL; remote features (sync, admin logs) are hidden or disabled when DB is absent
- [ ] **Onboarding wizard**: First-run flow to set up local profile, optionally connect remote DB later

### Sync Layer
- [ ] **Sync engine**: Background sync between IndexedDB and PostgreSQL when both are available
- [ ] **Conflict resolution**: Last-write-wins with local timestamp tracking per record
- [ ] **Sync status indicators**: Per-record badges showing "synced", "pending", "conflict"
- [ ] **Manual sync trigger**: Pull-to-refresh or button to force sync

### API Abstraction
- [ ] **Data access layer**: Single `dataProvider` interface — swap between local (IndexedDB) and remote (PostgreSQL via API routes) at runtime
- [ ] **API routes detect DB**: Route handlers check for DB connection; return local-only or error gracefully when DB is missing
- [ ] **Offline queue**: Mutations queued locally when offline, replayed when connection returns
- [ ] **Optimistic UI**: All mutations update local state immediately, background sync handles persistence

### UX Changes
- [ ] **No login wall for local mode**: App can run fully without auth when DB is absent (skip middleware auth check for local-only mode)
- [ ] **Setup screen**: One-time config for DB connection string, NEXTAUTH_SECRET
- [ ] **Export/import**: Full data export as JSON, import on another device

---

## 🌟 v3.0 — The Desktop Era
- Full-screen command center optimized for large displays
- Multi-window support (maps, logs, chat simultaneously)
- Portable config loading (`~/.courier/` config directory)
- Companion CLI tool (`courier-cli`) for server management
- Separate `images` table with S3/CDN storage
- Route optimization AI for efficient delivery sequences
- Redis support for distributed caching and pub/sub
- Real-time dispatch-to-courier messaging
- Customer self-service portal

## 🌟 v4.0 — Native Mobile
- Expo Android & iOS apps
- Offline-first (built on the v2.0 IndexedDB foundations)
- Push notifications, native camera, GPS background tracking
