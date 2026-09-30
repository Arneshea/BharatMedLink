# 🏥 BharatMedLink — National Emergency Coordination & Referral Network

**BharatMedLink** is an end-to-end, intelligent emergency coordination and referral network designed for India's healthcare ecosystem. It bridges patients, emergency response services (108), primary emergency centers, and tertiary referral hospitals into a unified, real-time coordination protocol.

The core guiding principle of BharatMedLink is:
> **Right Patient ➔ Right Hospital ➔ Right Specialist ➔ At the Right Time.**

Instead of patients blindly traveling to facilities only to face rejection due to lack of ICU beds, ventilators, or specialists, BharatMedLink implements an active **Broadcast & Pre-Arrival Acceptance** protocol ensuring bed reservation and handoff readiness before the patient arrives.

---

## 🌟 Core Coordination Workflow

```
1. Self-Triage ➔ 2. Priority Matching ➔ 3. Broadcast & Accept ➔ 4. Transport & Handoff ➔ 5. Referral Loop
```

1. **Self-Triage ("Enter Symptoms")**: AI-assisted preliminary severity assessment and clinical symptom categorization. Final clinical decisions remain with licensed medical professionals.
2. **Priority Matching (6-Criteria Algorithmic Ranking)**:
   - 🎯 **Clinical Fit (35%)**: Mandatory specialty, equipment, ICU, Cath Lab, OT, trauma tier.
   - 🚗 **Travel ETA (25%)**: Real-world driving estimates via OpenStreetMap / OSRM.
   - 🛏️ **Capacity Headroom (15%)**: Real-time bed and ICU availability ratios.
   - 👨‍⚕️ **Specialist Coverage (12%)**: On-call specialist availability.
   - 🛡️ **Historical Reliability (8%)**: Hospital verification tier & acceptance compliance.
   - ⏱️ **Data Freshness (5%)**: Recency of capacity and status verification.
3. **Broadcast & Pre-Arrival Acceptance**: Requests are simultaneously broadcast to top-matched hospitals. Hospital staff actively accept or decline intake before the patient leaves their location.
4. **Transport & Handoff**: The patient selects their preferred accepting hospital. A digital patient dossier is immediately linked, and real-time GPS navigation with live ETA streams to the patient.
5. **Referral Loop ("Find Higher-tier Hospital")**: If the receiving hospital later determines that tertiary care or advanced intervention is required, the referral engine identifies the optimal tertiary center and coordinates structured doctor-to-doctor digital handoff.

---

## 🔐 Role-Based Authentication & Portals

BharatMedLink features isolated role-based authentication and specialized dashboards:

### 1. 🧑‍🦽 Patient Portal (`/patient/dashboard`)
- **Profile & Health Dossier**: Captures UHID, age, sex, blood group, known allergies, chronic conditions, current medications, previous surgeries, and emergency contact details.
- **Enter Symptoms**: Preliminary AI symptom triage and emergency routing.
- **Find Higher-tier Hospital**: Upload or manually enter hospital discharge notes or doctor transfer advice to match specialized tertiary centers.
- **Active Navigation & Tracking**: Interactive Leaflet navigation map with live OSRM route tracing, travel distance in km, driving ETA in minutes, and direct hospital calling.
- **108 Emergency Dispatch**: One-touch instant emergency dispatch accessible from every screen.

### 2. 🏥 Hospital Operations Board (`/hospital/dashboard`)
- **Operations Metric Board**: Real-time metrics on total beds, occupied beds, ICU capacity, and specialist coverage (displays `NA` when unconfigured — never fabricates numbers).
- **Incoming Emergency Requests**: Live stream of incoming triage requests showing patient details, vitals baseline, and symptoms. Staff can review and immediately **Accept** or **Decline** with clinical reasons.
- **Referral Request Center**: Manage tertiary hospital-to-hospital referrals, dispatch multi-parameter requests, review live acceptance status, and execute **Doctor-to-Doctor Handoff Signoff**.
- **Hospital Registration Support**: Select an existing registered hospital in the network, or register a new facility with custom bed capacities and capabilities.

### 3. 🛡️ Network Admin Dashboard (`/admin/dashboard`)
- **Hospital Verification Hub**: Review hospital registration statuses (🟢 *Confirmed / Registered*, 🟡 *Pending / Unregistered*, 🔴 *Unable to Accept*).
- **Chronological Audit Trail**: Immutable logging of every system event (triage submission, hospital broadcast, acceptance, patient selection, and handoff).
- **Network Status & Capacity Oversight**: Aggregated regional capacity metrics.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | React 18, TypeScript, Vite | Single-page application styled with Tailwind & custom CSS |
| **Maps & Routing** | Leaflet, React-Leaflet, OSRM | OpenStreetMap tile layers with driving route polyline rendering |
| **Backend API** | Python Flask, Werkzeug | REST API, state machine validation, CORS support |
| **Database** | PostgreSQL (Supabase) | Relational schema, Row Level Security (RLS), atomic transitions |
| **Triage & NLP** | Hugging Face Transformers | Clinical symptom extraction and severity categorization |
| **State Machines** | Python transition guards | Ensures strict lifecycle adherence across all workflows |

---

## 📁 Repository Layout

```
BharatMedLink/
├── backend/
│   ├── app/
│   │   ├── routes/              # API blueprints: auth, hospitals, journeys, patient_requests, referrals
│   │   ├── referral_engine/     # Multi-parameter candidate matching and ranking
│   │   ├── services/            # Database connector, routing, NLP triage
│   │   └── utils/               # State machine guards and validation
│   ├── run.py                   # Flask entry point (port 8000)
│   └── requirements.txt         # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── pages/               # Auth, Patient, Hospital, Admin dashboards & sub-pages
│   │   ├── components/          # Shared layout, navigation bar, emergency buttons
│   │   ├── context/             # AuthContext with role-based session management
│   │   ├── services/            # Axios API client & Supabase Realtime client
│   │   └── App.tsx              # Router configuration (default lands on /login)
│   ├── package.json             # NPM dependencies
│   └── vite.config.ts           # Vite bundler configuration
└── database/
    ├── migrations/              # SQL migrations (schema, atomic transitions, RLS)
    └── seed/                    # Demo seed data
```

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js (v18+) & npm
- Python (v3.10+) & pip
- PostgreSQL / Supabase project

### 1. Database Setup
1. Create a PostgreSQL database (e.g. on [Supabase](https://supabase.com/)).
2. In the Supabase SQL Editor, run:
   - `database/migrations/001_init_schema.sql`
   - `database/migrations/002_atomic_transitions.sql`
   - `database/migrations/003_rls_policies.sql`
   - `database/seed/demo_seed.sql`

### 2. Backend Setup
```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# Linux/macOS
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env and supply:
# SUPABASE_DB_URL=postgresql://user:password@host:5432/postgres
# DEMO_ADMIN_TOKEN=demo-admin-secret-token

python run.py
```
Backend will be available at `http://127.0.0.1:8000/`. Verify health at `http://127.0.0.1:8000/health`.

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env:
# VITE_API_BASE_URL=http://127.0.0.1:8000

npm run dev
```
Frontend will be available at `http://localhost:5173/`.

---

## 🌐 Production Deployment Guide

### Option A: Free Cloud PaaS Deployment (Recommended for Demos & SIH)

#### 1. Backend on Render
1. Push repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com/), click **New +** ➔ **Web Service**.
3. Select your repository and configure:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt gunicorn`
   - **Start Command**: `gunicorn -w 4 -b 0.0.0.0:$PORT "app:create_app()"`
4. Add Environment Variables:
   - `DATABASE_URL`: `postgresql://<user>:<password>@<host>:5432/postgres`
   - `FLASK_ENV`: `production`
   - `CORS_ORIGIN`: `*`
5. Click **Deploy**. Note your backend URL (e.g. `https://bharatmedlink-api.onrender.com`).

#### 2. Frontend on Vercel
1. In [Vercel Dashboard](https://vercel.com/), click **Add New...** ➔ **Project**.
2. Select your repository and configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://bharatmedlink-api.onrender.com`
4. Click **Deploy**. Your app will be live with free global HTTPS.

---

### Option B: Linux VPS Deployment (AWS EC2 / DigitalOcean / Hostinger)

#### 1. System Dependencies
```bash
sudo apt update && sudo apt install -y python3-pip python3-venv nodejs npm nginx git certbot python3-certbot-nginx
```

#### 2. Backend Gunicorn Service
```bash
git clone <your-repo-url> /var/www/bharatmedlink
cd /var/www/bharatmedlink/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt gunicorn
```

Create `/etc/systemd/system/bharatmedlink.service`:
```ini
[Unit]
Description=BharatMedLink Backend Gunicorn Service
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/var/www/bharatmedlink/backend
Environment="PATH=/var/www/bharatmedlink/backend/.venv/bin"
EnvironmentFile=/var/www/bharatmedlink/backend/.env
ExecStart=/var/www/bharatmedlink/backend/.venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8000 "app:create_app()"
Restart=always

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload && sudo systemctl enable --now bharatmedlink
```

#### 3. Build Frontend & Nginx Proxy
```bash
cd /var/www/bharatmedlink/frontend
npm install && npm run build
```

Configure `/etc/nginx/sites-available/default`:
```nginx
server {
    listen 80;
    server_name yourdomain.com; # Or your server IP

    location / {
        root /var/www/bharatmedlink/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🔒 Security & Data Integrity Principles

- **No Fabricated Real-Time Capacity**: If a hospital hasn't explicitly configured bed or ICU occupancy, the system strictly outputs **`NA`** rather than guessing or asserting guaranteed real-time availability.
- **No Mock Patient Defaults**: Patient clinical history, allergies, and blood group are never defaulted or assumed. If omitted during intake, they appear as **`NA`**.
- **Audit Logging**: Every transition (self-triage submission, hospital response, patient selection, doctor handoff signoff) writes an immutable record to the `audit_events` ledger.
- **Clinical Governance**: AI self-triage acts solely as a triage aid; clinical responsibility remains with licensed medical officers.
