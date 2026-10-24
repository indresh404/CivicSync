# CivicSync: Cross-Department Road-Work Coordination Platform

> **"One City. One Plan. Zero Rework."**
> Deterministic, explainable municipal infrastructure synchronization platform built for city authorities (Roads, Water, Electricity, Sewerage, Telecom, Gas).

---

## 📌 Answers to Key User Questions

### 1. Are Any Other API Keys Needed?
**NO! No other API key is required.**
* **Map Tiles:** Uses **MapLibre GL JS** with standard **OpenStreetMap (OSM) / CartoDB raster tiles**, which are 100% free, open-source, and require zero Mapbox or Google Maps tokens.
* **Spatial & Conflict Engine:** 100% deterministic, pure Python mathematics (Haversine great-circle formula, line interpolation, date intervals). Zero external geocoders, solvers, or ML APIs required.
* **Database:** Configured with your MongoDB Atlas URI (`MONGO_URI`) with resilient automatic local SQLite fallback.
* **Authentication:** Built-in JWT signed with your `JWT_SECRET`.

---

## 🏗️ Folder Structure

```
CivicSync/
├── backend/
│   ├── auth.py              # JWT authentication, salted hashing, RBAC (ADMIN, DEPARTMENT_USER)
│   ├── config.py            # Environment, ports (PORT=5000), constants, weights
│   ├── conflict_engine.py   # Pure Python distance, line sampling, overlap, severity, sequencing
│   ├── database.py          # SQLAlchemy session engine & SQLite fallback
│   ├── main.py              # FastAPI REST endpoints (/auth, /projects, /conflicts, /roads, /public)
│   ├── models.py            # Department, User, Project, Conflict, AuditLog, Config
│   ├── mongo_db.py          # MongoDB PyMongo connector with resilient fallback
│   ├── requirements.txt     # Python dependencies
│   └── seed_data.py         # Deterministic seed generator for Scenarios A, B, and C
├── app/
│   ├── admin/page.tsx       # Operations dashboard, map, road history, conflict gate, audit
│   ├── login/page.tsx       # Split-screen sign-in with 1-click demo account switcher
│   ├── works/page.tsx       # Public citizen works portal (no auth required)
│   ├── globals.css          # Tailwind CSS styles
│   ├── layout.tsx           # Inter font and root layout
│   └── page.tsx             # Public landing page
├── components/
│   ├── AdminHeader.tsx      # Municipal header with search & modal launcher
│   ├── AdminSidebar.tsx     # Navigation & role simulation switcher
│   ├── ConflictDetailModal.tsx # Side-by-side cards, mini Gantt, severity breakdown, ack tracker
│   ├── Footer.tsx           # Footer with Known Limitations callout
│   ├── LocationPickerMap.tsx# Interactive drawing picker for Point+Radius & Line
│   ├── MapComponent.tsx     # Full-bleed MapLibre map, time slider, department colors, RED rings
│   ├── Navbar.tsx           # Header navigation
│   ├── ProjectDrawer.tsx    # Slide-over inspector with "View Road History" action
│   └── RegisterProjectModal.tsx # 3-step drawer (Details -> Location+Live Preview -> Review)
├── lib/
│   ├── api.ts               # Frontend API client with offline demo fallbacks
│   ├── types.ts             # TypeScript definitions
│   └── utils.ts             # Tailwind class merging & date formatting
├── tests/
│   └── test_civicsync.py    # 11 unit tests for conflict engine & business rules
├── docker-compose.yml       # Docker compose for optional PostgreSQL & Backend
├── Dockerfile.backend       # Container definition for FastAPI
├── .env.example             # Example environment variables
└── README.md                # Comprehensive documentation & 3-minute demo script
```

---

## 🗄️ Database Schema & Data Model

| Model | Fields | Purpose |
| :--- | :--- | :--- |
| **`Department`** | `id`, `name`, `color` | Agency registration & pin color coding (6 departments) |
| **`User`** | `id`, `email`, `password_hash`, `name`, `department_id`, `role` | JWT authenticated users (`ADMIN` or `DEPARTMENT_USER`) |
| **`Project`** | `id`, `department_id`, `created_by`, `title`, `project_type`, `geometry_type` (point/line), `lat`, `lng`, `end_lat`, `end_lng`, `radius_m`, `road_name`, `road_type` (Arterial/Residential), `start_date`, `end_date`, `status` (Planned/Approved/Ongoing/Completed), `has_conflict`, `created_at` | Infrastructure work orders |
| **`Conflict`** | `id`, `project_a_id`, `project_b_id`, `calculated_distance`, `threshold`, `overlap_start`, `overlap_end`, `overlapping_days`, `severity_score`, `severity_breakdown` (JSON), `suggested_sequence`, `resolution` (Pending/Sequenced/JointTrench/Overridden), `ack_a`, `ack_b`, `created_at` | Detected spatial-temporal collisions |
| **`AuditLog`** | `id`, `action_type`, `project_id`, `conflict_id`, `user_id`, `actor`, `department`, `note`, `timestamp` | Append-only municipal decision ledger |
| **`Config`** | `key`, `value`, `description` | Runtime parameters (`distance_threshold_m=50`, `cooldown_months=24`, etc.) |

---

## ⚙️ Business Rules Implementation

1. **Collision Rule:** Distance `< 50m` AND schedule overlap (inclusive). Lines use equidistant point sampling.
2. **Deterministic Severity:**
   $$\text{Severity} = 0.45 \cdot \text{Closeness} + 0.35 \cdot \text{Overlap} + 0.20 \cdot \text{Road Importance}$$
   * Bands: Low `< 0.33`, Medium `< 0.66`, High `≥ 0.66`. Full breakdown stored in JSON and displayed in UI.
3. **Sequencing Rule:** Underground utility work (`Pipeline`, `Cabling`, `Sewerage`, `Gas line`) must precede surface work (`Resurfacing`). Outputs exact phase dates (e.g. Phase 1: 05 Nov – 20 Nov; Phase 2: 22 Nov – 07 Dec).
4. **Dig Cooldown Policy:** If a `Resurfacing` project on the road completed within `24 months`, new underground projects trigger a warning: *"Road resurfaced X months ago"* and require a justification note.
5. **Monsoon Rule:** Projects scheduled between `01 June` and `30 September` display an advisory flood & trench-collapse warning.
6. **Approval Gate:** Planned → Approved requires generated conflict report. If conflicts exist, both departments must record acknowledgments (`ack_a` and `ack_b`), or an administrator must log a formal justification override.
7. **Joint Trenching:** Agencies can propose joint trenching with shared dates, marking conflict `JointTrench`.

---

## 🚀 Quickstart & Setup

### Prerequisites
* Python 3.11+
* Node.js 18+ & npm

### 1. Environment Configuration
Create or inspect `.env.local` / `.env`:
```env
PORT=5000
NEXT_PUBLIC_API_URL=http://localhost:5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.up2l13c.mongodb.net/?appName=Cluster0
JWT_SECRET=mySuperSecretKey
CONFLICT_THRESHOLD_METERS=50.0
ASSUMED_COST_PER_REDIG=350000.0
COOLDOWN_MONTHS=24
```

### 2. Run the Platform
In a terminal, start both backend and frontend concurrently:
```bash
# Windows PowerShell
.\run.ps1

# Or via npm
npm run dev:all
```
* **Frontend:** [http://localhost:3000](http://localhost:3000)
* **Backend API:** [http://localhost:5000](http://localhost:5000)
* **API Documentation (Swagger):** [http://localhost:5000/docs](http://localhost:5000/docs)
* **Public Citizen Portal:** [http://localhost:3000/works](http://localhost:3000/works)
* **Staff Login:** [http://localhost:3000/login](http://localhost:3000/login)

### 3. Run the Conflict Engine Test Suite
```bash
python -m pytest tests/test_civicsync.py -v
```
All 11 unit tests verify distance math, sampled lines, overlap detection, severity normalization, sequencing, cooldown rules, monsoon warnings, approval gate blocking, and joint trenching.

---

## 🎬 3-Minute Scripted Demonstration Walkthrough

### Minute 1: The Shared Map & Scenario A (High Severity)
1. Navigate to **[http://localhost:3000/login](http://localhost:3000/login)**. Click the **"Chief Roads Engineer"** demo account and sign in.
2. Open the **"Live Map"** tab. Observe the Mira Road corridor with department pins and the **RED pulsating ring** highlighting a conflict on **Mira Bhayandar Road**.
3. Click the red-ringed pin to open the slide-over drawer:
   * **Project A:** Roads Department — Asphalt Resurfacing & Milling (5–20 Nov 2026).
   * **Project B:** Water Department — 600mm Potable Water Trunk Main (10–25 Nov 2026).
4. Click **"Review Sequence"** to open the Conflict Report Modal:
   * Point out the **Severity Gauge** (High Severity, Score 82/100).
   * Expand **"Why this score?"** to show the explainable weighted breakdown.
   * View the **Mini Gantt** showing the red concurrent digging collision window.
   * Highlight the **Sequencing Rule**: *"Complete Water Department Pipeline (05 Nov – 20 Nov) before Roads Department Resurfacing (22 Nov – 07 Dec)."*

### Minute 2: Scenario B (Joint Trenching) & The Approval Gate
1. In the **"Conflicts"** tab, click **`CONF-2026-002`** on Silver Park Residential Lane:
   * Electricity 11kV cabling clashing with Telecom 5G fiber trenching.
   * Click **"Propose Joint Trenching"**: resolution updates immediately to `JointTrench` and an audit entry is created.
2. Navigate to **"Approvals Gate"** tab:
   * Notice Project `PRJ-2026-001` (Roads Resurfacing) has its **Approve** button disabled.
   * Hover over the status: *"Approval Gate Blocked: Active conflict requires acknowledgment from Water Department."*
3. Switch your role to **"Water Department"** in the sidebar:
   * Open the conflict and click **"Acknowledge Suggested Sequence"**.
   * Return to **Approvals Gate**: the gate clears, both `ack_a` and `ack_b` are verified, and the project can now be approved!

### Minute 3: Scenario C (Cooldown Violation & Admin Override) & Public Portal
1. Open the **"Road History"** tab and select **"Kanakia Road"**:
   * Headline stat: *"Dug 1 time in the last 12 months"*.
   * Note that Kanakia Road underwent complete asphalt resurfacing 3 months ago.
2. Click **"+ Register Project"**:
   * Select **Gas Department**, Work Category: **Gas line**, Road: **Kanakia Road**.
   * In Step 2 (Location), the live preview banner warns in real time of the active cooldown.
   * In Step 3 (Review), see the **Dig Cooldown Warning**: *"Road resurfaced 3 months ago (Municipal Cooldown is 24 months)"*.
3. Switch to **"City Administrator"** and show how emergency public safety repairs can be granted an **Administrative Override** with a mandatory justification note.
4. Visit **[http://localhost:3000/works](http://localhost:3000/works)** to demonstrate the read-only public citizen works portal showing approved, synchronized road projects with zero municipal rework!

---

## ⚠️ Known Limitations
* **Assumed Constants:** Avoided cost calculations use standard municipal averages (₹350,000 per dig avoided).
* **Timely Registration:** The coordination engine depends on departments submitting work schedules prior to tendering.
* **Domain Precedence Rule:** The sequencing rule implements a fixed municipal policy (underground before surface; earlier start first) rather than an automated combinatorial optimizer.
