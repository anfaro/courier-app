# 🗺️ Courier Super App Roadmap

## ✅ v1.0.1 (Image Storage Overhaul)
- [x] WebP conversion + iimg.live CDN integration
- [x] Migration script (`npm run migrate:images`)

## ✅ v1.1.0 — Foundation & Field Ops (Current)
- [x] Settings redesign (MD3 expressive: profile card, preferences, about)
- [x] Global version source (`lib/version.ts` — single source of truth)
- [x] Visit tracking (check-in/out, live timer, timeline per customer)
- [x] Bulk geocoding (Nominatim, 1.1s rate-limit, admin button)
- [x] Route history (save/load/delete trips from the map)
- [x] Clean up deliveries UI remnants (nav, dashboard, search, etc.)
- [x] i18n completeness audit (visit, map, geocode, customer keys)
- [x] Bug fixes: online status, SystemHealth, broken translation keys

## 🚧 v1.2.x — Navigation & Offline Resilience
- [ ] **Offline-first mode**: Queue CRUD operations in IndexedDB when offline, sync when online
- [ ] **Optimistic local creation**: Create records in local state first, sync to server in background
- [ ] **Server-side pagination**: Add `limit`/`offset` to list queries (customers, clusters) to fix ~50s load times
- [ ] **Lazy-load relations**: Replace N+1 `with: { clusters: { with: { cluster: true } } }` with server-side pagination
- [ ] **Loading skeletons + timeout fallback**: UX improvement for slow connections
- [ ] **Pagination in admin tables**: Users, logs, error logs

## 🧭 v1.3.x — Search, Share & UX Polish
- [ ] **Admin data table overhaul**: Sortable columns, inline editing, bulk actions
- [ ] **Share feature**: Share customer/waybill links via system share sheet
- [ ] **Global search fix**: Search bar UX polish (debounce, keyboard nav)
- [ ] **Accessibility pass**: Focus rings, screen reader labels, reduced motion

## 🗺️ v1.4.x — Logistics & Zone Intelligence
- [ ] Cluster density map (heatmap of delivery distribution)
- [ ] Zone reassignment tool (bulk move customers between clusters)
- [ ] Real-time fleet tracking (active courier location)

## 📦 v1.5.x — Delivery & POD Auditing
- [ ] POD quality control (gallery-style auditor for proof photos)
- [ ] Waybill lifecycle timeline (creation → fulfillment)
- [ ] Failed delivery queue (intervention center)

## 🛠️ v1.6.x — System Health & Config
- [ ] Maintenance mode toggle
- [ ] Dynamic app config (API keys, business rules in admin UI)
- [ ] Flash announcements to couriers

## 👥 v1.7.x — Expanded Fleet Management
- [ ] Granular RBAC (dispatcher, hub manager roles)
- [ ] Performance analytics (leaderboards, speed metrics)

---

## 🌟 v2.0 — The Desktop Era
- **Full-screen command center**: Optimized for large displays
- **Multi-window support**: Maps, logs, chat simultaneously
- **Portable config loading**: `$HOME/.courier/` config directory
- **Companion CLI tool** (`courier-cli`): Manage server from terminal
- **Image storage overhaul**: Separate `images` table, S3/CDN
- **Route optimization AI**: Auto-generate efficient delivery sequences
- **Redis support**: Distributed caching, pub/sub
- **Real-time chat**: Dispatch ↔ courier messaging
- **Customer portal**: Self-service tracking

## 🌟 v3.0 — Native Mobile
- **Expo Android & iOS apps**: Offline-first, push notifications, native features
