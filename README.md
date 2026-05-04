
# 📦 Courier Management System (CMS)
### Material 3 Expressive • Next.js 15 • Drizzle ORM

A high-performance, mobile-first web application designed for couriers to manage customers, track waybills, and optimize delivery routes using intelligent clustering.

---

## 🚀 Features Implemented

### 👥 Customer Management
* **Single Entry:** Detailed form with name, phone (+62 formatting), address, and additional notes.
* **Manual Bulk Import:** A "Draft-to-Card" workflow where couriers can rapidly fill out forms and push them into a condensed list before saving all at once.
* **GPS Pinning:** High-accuracy geolocation capture with a single tap.
* **Image Support:** Capture house pictures via the `ImageInput` component for easier package drop-offs.
* **Smart Search:** Real-time, debounced search (300ms) that filters customers by name, address, or phone number directly from the server.

### 🛠 Technical Core
* **Next.js 15 (App Router):** Using Server Components for data fetching and Client Components for interactive forms.
* **Drizzle ORM:** Type-safe SQL builder for Postgres, handling complex bulk inserts and `ilike` search queries.
* **M3 Expressive UI:** Clean, spacious design with "Glass-morphism" headers, rounded-full buttons, and high-contrast typography for field use.
* **Optimized API:** Dedicated bulk endpoints to handle array-based data processing.

---

## 🛠 Tech Stack
* **Framework:** Next.js 15
* **Database:** PostgreSQL
* **ORM:** Drizzle ORM
* **Styling:** Tailwind CSS (Material 3 principles)
* **Deployment:** Termux (Local Development) / Node.js

---

## 📅 Development Roadmap

### Phase 1: Smart Data Intake 
- [x] Manual Bulk Customer Entry
- [ ] **Excel/Sheets Smart Paste:** Regex-based parsing of tab-separated values.
- [ ] **Preview Validation:** UI table to verify parsed data before database commit.

### Phase 2: Waybill Logistics 
- [ ] **Bulk Waybill Entry:** Creating multiple package entries linked to existing customers.
- [ ] **Scanning Support:** Integration for barcode/QR scanning via camera.

### Phase 3: Intelligence & Routing 
- [ ] **Enhanced Clustering:** Adding "Districts" and "Priority Zones" to schema for neighborhood grouping.
- [ ] **Heatmap Visualization:** Dashboard view showing delivery density.

### Phase 4: UI Refinement 
- [ ] **M3 Header:** Glass-morphism navigation with system status indicators.
- [ ] **Courier Dashboard:** KPI cards for daily success rates and pending tasks.

---

## 🛠 Installation & Setup

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
   or
   ```bash
   pnpm run dev

## 📱 Mobile Workflow
- This app is optimized for use in Termux on Android.
- GPS: Requires "High Accuracy" mode and browser location permissions. Ensure localhost:3000 is used for a secure context.
- Search: Debounced to prevent unnecessary server load on mobile data.
- Bulk: Designed for one-handed thumb interaction with a "Draft-to-Card" logic.
