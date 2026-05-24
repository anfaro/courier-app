# 🗺️ Courier Super App Roadmap

## 🚀 Current Milestone: v0.1.x (Foundation & Polish)
Focus: Core stability, smooth animations, and essential fleet management.
- [x] Smooth Theme Transitions (Telegram-style circular expansion)
- [x] Animated Bottom Navigation (Framer Motion)
- [x] Admin Hub Activity/Error Logs
- [x] Basic Fleet Management (User onboarding)
- [x] Basic RBAC (Superadmin vs Courier)

---

## 🏗️ Upcoming Features (v0.2.x - v0.9.x)

### 🗺️ Logistics & Zone Intelligence (Feature #2)
- [x] **Cluster Density Map**: Visual heatmap of delivery distribution.
- [x] **Zone Reassignment**: Tool for bulk moving customers between clusters.
- [x] **Real-time Fleet Tracking**: Active courier location tracking via activity logs.

### 📦 Delivery & POD Auditing (Feature #3)
- [x] **POD Quality Control**: Gallery-style auditor for proof-of-delivery photos.
- [x] **Waybill Lifecycle Timeline**: Detailed tracking from creation to fulfillment.
- [x] **Failed Delivery Queue**: Dedicated intervention center for failed shipments.

### 👥 Expanded Fleet Management (Feature #4 Refinement)
- [x] **Granular RBAC**: Expand beyond Superadmin/Courier to include Dispatchers and Hub Managers.
- [x] **Performance Analytics**: Leaderboards and speed metrics.

### 🛠️ System Health & Config (Feature #6)
- [x] **Maintenance Mode**: Global toggle for system-wide downtime.
- [x] **Dynamic App Config**: Admin UI for managing API keys and business rules.
- [x] **Hot-Reloadable Database Connection**: Replace static `db` singleton with a connection pool manager that reads credentials from a gitignored JSON config file (`data/db-config.json`). Changing DB settings via admin UI writes to the file and triggers live pool reconnect — no server restart required.
  - First boot falls back to `DATABASE_URL` env var if config file doesn't exist yet.
  - Emergency "Reset to env var" button in admin UI as a recovery escape hatch.
- [x] **Flash Announcements**: Push notifications for active couriers.

---

## 🌟 Major Version 2.0 (The Desktop Era)

### 🖥️ Desktop Version
- **Full-Screen Command Center**: Optimized dashboard for large displays (Dispatchers).
- **Multi-Window Support**: Manage maps, logs, and user chats simultaneously.
- **Keyboard-First Workflow**: Rapid entry and navigation for back-office efficiency.

### ⚙️ Deployment & DevOps
- **Portable Config Loading**: App reads `.env` and config files from `$HOME/.courier/` at startup instead of relying on project-root files. Allows the same build artifact to run on any server with a per-user config directory.
- **Companion CLI Tool** (`courier-cli`): Standalone command-line tool to manage the app from the server terminal.
  - Start/stop/restart the production server.
  - Manage database credentials and connection pools.
  - Trigger backup/restore operations.
  - View logs, system health, and audit trail without the web UI.
  - Seed data, migrate schemas, and run diagnostics.

### 💾 Data Architecture & Storage
- **Image Storage Overhaul**: Move `housePictureUrl` and `proofOfDeliveryUrl` to a separate `images` table (polymorphic FK via `entity_type` + `entity_id`).
  - Customers support **multiple house images** (gallery view, reordering, set primary).
- **S3/CDN Integration**: Offload image hosting from local filesystem to cloud storage.

### 📈 Scaling & Advanced Features
- **Route Optimization AI**: Auto-generating the most efficient delivery sequence.
- **Redis Support**: Distributed caching, session management, and real-time pub/sub features.
- **Real-time Chat**: Direct communication between dispatch and couriers.
- **Customer Portal**: Self-service tracking and order management.

---

## 🌟 Major Version 3.0 (The Mobile Era)

### 📱 Mobile Apps (Expo)
- **Native Android & iOS builds**: Courier companion apps built with Expo.
- **Offline-first mode**: Queue deliveries and log PODs without internet.
- **Push notifications**: Real-time dispatch alerts.
