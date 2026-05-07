
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
* **Scroll-Optimized Dashboard:** Sticky headers, search bars, and filter pills with an independently scrolling card list to maximize mobile viewport space.

### 🛠 Technical Core
* **Next.js 15 (App Router):** Using Server Components for data fetching and Client Components for interactive forms.
* **Drizzle ORM:** Type-safe SQL builder for Postgres, leveraging Relational Queries (`with: { customer: true }`) for effortless table joins and highly optimized bulk inserts.
* **M3 Expressive UI:** Clean, spacious design with high corner radii (`rounded-[32px]`), tonal color palettes, and glass-morphism overlays.

---

## 🛠 Tech Stack
* **Framework:** Next.js 15
* **Database:** PostgreSQL
* **ORM:** Drizzle ORM
* **Styling:** Tailwind CSS (Material 3 principles)
* **Deployment:** Termux (Local Development) / Node.js

---


## 📅 Development Roadmap

### Phase 1: Core App Completion (Up Next)
- [x] **Waybill Edit Page:** Update delivery status, receiver info, and proof of delivery (`/deliveries/[id]/edit`).
- [x] **Home Page (`/`) Redesign:** Adding quick-action hero buttons for the Global Entry Hub and KPI stats.
- [x] **M3 Navigation Redesign:** Transitioning Header and Breadcrumbs to a cleaner, glass-morphism system.

### Phase 2: Intelligence, Routing & Scanning
- [x] **Scanning Support:** Integration for barcode/QR scanning via mobile camera to quickly find or input waybills.
- [x] **Enhanced Clustering:** Adding "Districts" and "Priority Zones" to the schema for neighborhood grouping.
- [x] **Heatmap Visualization:** Dashboard view showing delivery density for the day.

### Phase 3: Authorization & Admin Controls (New!)
- [ ] **Role-Based Access Control (RBAC):** Implement `superadmin`, `admin`, and `courier` roles in the database and NextAuth JWT.
- [ ] **Middleware Route Protection:** Secure pages based on user roles.
- [ ] **Admin Command Center:** Hidden dashboard for superadmins containing:
  - User management (assign roles, revoke access).
  - System analytics and delivery KPIs.
  - User activity history and audit logs.
  - Application error and access logs.

### Phase 4: Multi-Device Architecture (New!)
- [ ] **Device Detection Guard:** Use Next.js Middleware to detect user agents and restrict desktop access to the mobile app view.
- [ ] **Desktop-Optimized Layout:** Build a distinct, multi-column dashboard view specifically designed for desktop fleet managers and dispatchers.



---

## 🏗 Recent Architectural Updates (May 7, 2026)

### Unified Delivery Hub & Relational Queries
We fully deprecated the nested `/customers/[id]/new-waybill` route. Waybill creation is now exclusively handled by the **Global Delivery Hub (`/deliveries/new`)**.
* **URL Parameter Locking:** We pass `?customerId=[id]` to lock the hub to a specific customer when adding from their profile.
* **Drizzle Relations:** Implemented robust schema relations allowing us to query deliveries and their associated customer data in a single, lightweight server call.
* **Bulk Resolving:** Replaced multiple sequential `POST` requests with a single `/api/customers/bulk` endpoint to handle massive Excel pastes without hitting rate limits.

### Routes & Navigation
- `/` : *Pending Redesign*
- `/customers` : Manage recipient database and neighborhood clusters.
- `/deliveries` : Main dashboard with sticky filters, search, and dynamic status cards.
- `/deliveries/new` : The primary hub for batch package entry and manual scanning.
- `/deliveries/[id]` : Detailed "Digital Receipt" view for individual waybills.

---

## ⚙️ Installation & Setup

1. **Clone the repo:**
   ```bash
   git clone <your-repo-url>

2. Install Dependencies
   ```bash
   npm Install

3. Setup Environment
   Create a .env or .env.local file in the root directory
   ```env
   NEXTAUTH_HOST="http://localhost:3000"
   NEXTAUTH_SECRET="write-your-secret-key-here"
   DATABASE_URL="postgres://user:password@localhost:5432/cms_db"

4. Database Migration
   ```bash
   npx drizzle-kit push

5. Run Development Server
   ```bash
   npm run dev
   # or
   pnpm run dev

## 📱 Mobile Workflow
- This app is optimized for use in Termux on Android.
- GPS: Requires "High Accuracy" mode and browser location permissions. Ensure localhost:3000 is used for a secure context.
- Search: Debounced to prevent unnecessary server load on mobile data.
- Bulk: Designed for one-handed thumb interaction with a "Draft-to-Card" logic.
