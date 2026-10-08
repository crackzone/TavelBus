# TravelBus Manager — Render Deployment Guide

Complete step-by-step instructions to deploy TravelBus Manager to Render.

---

## 🏛️ Target Architecture on Render

`	ext
                  GitHub Repository (crackzone/TavelBus)
                               │
               ┌───────────────┴───────────────┐
               │                               │
               ▼                               ▼
      RENDER WEB SERVICE             RENDER STATIC SITE
       (FastAPI Backend)            (React/Vite Frontend)
   Root: backend/                   Root: frontend/
   Port: \                      Publish: dist/
               │                               │
               ▼                               │
      RENDER POSTGRESQL                        │
      (Cloud Managed DB)                       │
               ▲                               │
               └────────── API / WS / SSE ─────┘
`

---

## 🚀 Step 1: Create Render PostgreSQL Database

1. Log into your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** and select **PostgreSQL**.
3. Configure the database:
   - **Name:** 	ravelbus-db
   - **Database:** 	ravelbus_db
   - **User:** 	ravelbus_user
   - **Region:** Choose your preferred region (e.g. Frankfurt, Oregon, or Ohio).
   - **Plan:** Free (or higher).
4. Click **Create Database**.
5. Once created, copy the **Internal Database URL** (e.g., postgres://travelbus_user:...@dpg-...-a/travelbus_db).

---

## 🚀 Step 2: Deploy Backend Web Service

1. On the Render Dashboard, click **New +** and select **Web Service**.
2. Connect your GitHub repository: crackzone/TavelBus.
3. Configure settings:
   - **Name:** 	ravelbus-api
   - **Region:** Same region as your database.
   - **Branch:** main
   - **Root Directory:** ackend
   - **Runtime:** Python
   - **Build Command:**
     `ash
     pip install -r requirements.txt
     `
   - **Start Command:**
     `ash
     uvicorn app.main:app --host 0.0.0.0 --port \
     `
   - **Plan:** Free.

4. In **Advanced** -> **Health Check Path**, enter:
   `	ext
   /health
   `

5. Under **Environment Variables**, add:
   | Key | Value | Notes |
   |---|---|---|
   | ENVIRONMENT | production | Enables production security & logging |
   | DATABASE_URL | *Paste your Render Internal Database URL* | Automatically normalized to postgresql+asyncpg:// |
   | SECRET_KEY | *Generate 32-char hex string* | E.g. openssl rand -hex 32 |
   | ALGORITHM | HS256 | JWT signing algorithm |
   | ACCESS_TOKEN_EXPIRE_MINUTES | 60 | Token validity |
   | CORS_ORIGINS | https://travelbus-frontend.onrender.com | Update with your frontend URL once created |
   | GEMINI_API_KEY | *Your Google AI Studio API key* | Optional: enables live GenAI responses |
   | GEMINI_MODEL | gemini-3.8-flash | Active model on Google GenAI |

6. Click **Create Web Service**.
7. Note down your backend URL (e.g. https://travelbus-api.onrender.com).

---

## 🚀 Step 3: Run Database Migrations on Render

Once the backend is created, run the initial Alembic database schema migration:

**Option A — Render Shell (Recommended):**
1. In the 	ravelbus-api Web Service, click **Shell** in the left menu.
2. Run:
   `ash
   alembic upgrade head
   `

**Option B — Pre-Deploy Command:**
Under **Settings** -> **Build & Deploy** -> **Pre-Deploy Command**, enter:
`ash
alembic upgrade head
`

---

## 🚀 Step 4: Deploy Frontend Static Site

1. In Render Dashboard, click **New +** and select **Static Site**.
2. Connect repository: crackzone/TavelBus.
3. Configure settings:
   - **Name:** 	ravelbus-frontend
   - **Branch:** main
   - **Root Directory:** rontend
   - **Build Command:**
     `ash
     npm install && npm run build
     `
   - **Publish Directory:**
     `ash
     dist
     `
4. Under **Environment Variables**, add:
   | Key | Value |
   |---|---|
   | VITE_API_BASE_URL | https://travelbus-api.onrender.com | *(Replace with your actual backend URL from Step 2)* |
   | VITE_USE_MOCK_API | alse |

5. Under **Redirects/Rewrites**:
   Add an SPA rewrite rule so React Router handles browser refresh on all routes:
   - **Source:** /*
   - **Destination:** /index.html
   - **Action:** Rewrite

6. Click **Create Static Site**.
7. Note your frontend URL (e.g. https://travelbus-frontend.onrender.com).

---

## 🚀 Step 5: Update CORS on Backend

1. Go back to your 	ravelbus-api Web Service -> **Environment**.
2. Update CORS_ORIGINS to include your live frontend URL:
   `	ext
   https://travelbus-frontend.onrender.com
   `
3. Save changes (Render will automatically redeploy the backend).

---

## 🧪 Step 6: Verify Live Production Services

- **Backend Health:** GET https://travelbus-api.onrender.com/health (Returns {"status": "healthy"})
- **Backend Ready:** GET https://travelbus-api.onrender.com/ready (Returns {"database": "connected"})
- **OpenAPI Documentation:** GET https://travelbus-api.onrender.com/docs (when ENVIRONMENT is not production)
- **Frontend App:** Open https://travelbus-frontend.onrender.com in your browser.
  - Test Passenger Registration & Login
  - Test Trip Search & Seat Booking
  - Test Live Tracking (WebSocket & SSE streams)
  - Test AI Assistant
