
# 📦 Courier Management System (CMS)
### Material 3 Expressive • Next.js 15 • Drizzle ORM

A high-performance, mobile-first web application designed for couriers to manage customers, track waybills, and optimize delivery routes using intelligent clustering.

---

## 🚀 Features Implemented

### 👥 Customer Management
* **Single Entry:** Detailed form with name, phone (+62 formatting), address, and additional notes.
* **GPS Pinning & Resolution:** High-accuracy geolocation capture with a single tap, plus an automatic Google Maps link resolver.
* **Image Support:** Capture house pictures via the `ImageInput` component for easier package drop-offs.
* **Smart Search:** Real-time, debounced search that filters customers by name, address, or phone number directly from the server.

### 📦 Delivery & Waybill Management
* **Global Entry Hub (`/deliveries/new`):** Unified tabbed interface for both Manual Entry and Bulk Paste modes.
* **Intelligent Bulk Paste:** Paste Excel/Sheets data (Waybill, COD, Name) and automatically cross-reference with the customer database.
* **"Resolve All" Engine:** Instantly generate new customer profiles for unknown names found during bulk pasting via a highly optimized bulk API endpoint.
* **Searchable Customer Modal:** MD3 Expressive custom dropdown that filters customers instantly without breaking the mobile layout.
* **Digital Receipt UI:** A stunning, physical-receipt-inspired waybill details page featuring dynamic status banners, absolute actions, and tear-off style COD summary blocks.

### 🌐 Intelligence & Monitoring
* **Road-Aware Routing:** Intelligent "Best Route Possible" algorithm using OSRM to map actual driving paths between stops.
* **ETC (Estimated Time of Completion):** Real-time journey metrics including total distance, duration, and projected finish time (id-ID localized).
* **System Analytics:** Multi-tab admin dashboard for tracking global activity, application errors, and real-time user traffic.
* **Mainframe Traffic Stream:** High-density, terminal-style access logs for real-time technical monitoring (GET/POST/PUT/DELETE).

### 🛡 Security & Administration
* **Fleet Management:** Full-featured user administration UI (Create, Promote/Demote, Reset Password, Offboard).
* **Global Confirmation Dialogs:** Standardized MD3 Expressive verification engine with bouncy animations and danger-state aware styling.
* **High-Security Wipe:** Triple-layered verification flow (MD3 Dialogs + Code Input) for permanent system data resets.
* **Activity Audit Trail:** 100% API coverage for logging every database modification with actor and timestamp details.

---

## 📅 Development Roadmap

### Phase 1 & 2: Core & Intelligence
- [x] **Global Entry Hub & Bulk Paste**
- [x] **M3 Navigation & Glass-morphism Redesign**
- [x] **Barcode/QR Scanning Integration**
- [x] **Live Heatmap Visualization**

### Phase 3: Authorization & Admin Controls
- [x] **Role-Based Access Control (RBAC):** `superadmin` vs `courier` roles implemented.
- [x] **Middleware Protection:** All `/admin` routes secured via `proxy.ts`.
- [x] **Bulk Trifecta:** Bulk delete UI/API for Customers, Waybills, and Clusters.
- [x] **Global Confirmation System:** MD3 Expressive verification engine.
- [x] **User Fleet Management:** UI to onboard, promote, or offboard users.

### Phase 4: Multi-Device & PWA
- [x] **Device Detection Guard:** Restrict mobile app view on desktops.
- [x] **Multi-Language (i18n):** Global support for English and Indonesia (localized dates/metrics).
- [x] **Global Theme Engine:** Dark/Light mode support with persistence.
- [ ] **Desktop Dispatcher View:** Dedicated multi-column HQ layout.
- [ ] **PWA Support:** Offline mode and push notifications for couriers.

---

## 🏗 Recent Architectural Updates (May 10, 2026)

### Monitoring, UI Standardization & i18n
* **Global Command Search:** Header-integrated engine for Customers, Waybills, and Staff (RBAC-aware) with bouncy animations.
* **Road-Aware TSP Routing:** Integrated OSRM API for realistic driving paths and Estimated Time of Completion (ETC).
* **Terminal UI Access Logs:** Added a high-density midnight terminal view for real-time technical traffic monitoring.
* **Global i18n Engine:** Implemented `LanguageProvider` with 100% UI coverage for English and Indonesian.
* **MD3 Bouncy Buttons:** Standardized all interactions to use `active:scale-90` animations and pill-shaped bordered aesthetics.
* **Unified Layout:** Moved Header to root layout with immediate Skeleton rendering for instant brand presence.
* **Error Boundary:** Global crash tracking system that automatically logs stack traces to the database.

---

## 🛠 Tech Stack
* **Framework:** Next.js 15
* **Database:** PostgreSQL
* **ORM:** Drizzle ORM
* **Styling:** Tailwind CSS (Material 3 principles)
* **Animation:** Framer Motion (Bouncy/Spring physics)
* **Routing Engine:** OSRM (Open Source Routing Machine)

---

## ⚙️ Installation & Setup

1. **Clone the repo:**
   ```bash
   git clone <your-repo-url>

2. Install Dependencies
   ```bash
   npm Install

3. Setup Environment
   Create a .env.local file
   ```env
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key"
   DATABASE_URL="postgres://..."

4. Database Migration
   ```bash
   npx drizzle-kit push
