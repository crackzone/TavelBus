# TravelBus Manager

A production-oriented modular monolith for an intercity bus fleet management business. Features passenger bookings, seat locks, GPS tracking, and an AI-powered assistant with strict guardrails.

---

## 🛠️ Technology Stack
- **Framework:** FastAPI with Python 3.12+ & Pydantic v2
- **Database:** PostgreSQL 16 with async SQLAlchemy 2.0 & asyncpg
- **Database Migrations:** Alembic
- **Testing:** pytest, pytest-asyncio, httpx
- **Containers:** Docker, Docker Compose
- **Security:** Bcrypt password hashing, JWT bearer tokens, Role-Based Access Control (RBAC)
- **Target Cloud:** Google Cloud Platform (Cloud Run, Cloud SQL, Pub/Sub, Vertex AI Gemini)

---

## 🚀 Quickstart Guide (Local Development)

### 1. Prerequisites
- Python 3.12+
- PostgreSQL (via Docker or local WSL instance)

### 2. Environment Setup
Create your local environment file:
```bash
cp .env.example .env
```

Install dependencies:
```bash
pip install -e ".[dev]"
```

### 3. Database Migrations
Apply all database migrations up to head:
```bash
alembic upgrade head
```

To autogenerate new schema changes in future phases:
```bash
alembic revision --autogenerate -m "description of migration"
alembic upgrade head
```

### 4. Seed Initial Demonstration Data
Populate the database with sample admin, buses, routes, stops, and scheduled trips:
```bash
python -m scripts.seed_phase3
```
*Note: The seed script is completely idempotent and safe to run multiple times.*

### 5. Running the API Server
Start the Uvicorn dev server:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive OpenAPI Documentation: `http://localhost:8000/docs`

---

## 🚌 Domain Features & Endpoints

### Authentication & Profiles (`/api/v1/auth`)
- `POST /api/v1/auth/register` — Register passenger, driver, or admin (201 Created)
- `POST /api/v1/auth/login` — Authenticate and receive JWT access token
- `GET /api/v1/auth/me` — Inspect profile of current authenticated user

### Fleet Management (Admin Only — `/api/v1/admin/buses`)
- `POST  /api/v1/admin/buses` — Register new bus
- `GET   /api/v1/admin/buses` — List all buses (with optional `?status=` filter)
- `GET   /api/v1/admin/buses/{bus_id}` — Get single bus details
- `PATCH /api/v1/admin/buses/{bus_id}` — Update bus display name or capacity
- `POST  /api/v1/admin/buses/{bus_id}/deactivate` — Safely deactivate bus

### Route & Stop Management (Admin Only — `/api/v1/admin/routes`, `/api/v1/admin/stops`)
- `POST  /api/v1/admin/routes` — Create new route
- `GET   /api/v1/admin/routes` — List all routes (active and inactive)
- `GET   /api/v1/admin/routes/{route_id}` — Get route details with sequenced stops
- `PATCH /api/v1/admin/routes/{route_id}` — Update route properties
- `POST  /api/v1/admin/routes/{route_id}/deactivate` — Deactivate route
- `POST  /api/v1/admin/routes/{route_id}/reactivate` — Reactivate route
- `POST  /api/v1/admin/routes/{route_id}/stops` — Add stop to route with sequence number
- `GET   /api/v1/admin/routes/{route_id}/stops` — List sequenced stops for a route
- `PATCH /api/v1/admin/stops/{stop_id}` — Update stop name, sequence, or coordinates
- `DELETE /api/v1/admin/stops/{stop_id}` — Remove a stop

### Trip Scheduling (Admin Only — `/api/v1/admin/trips`)
- `POST  /api/v1/admin/trips` — Schedule trip (validates overlap, active bus, active route)
- `GET   /api/v1/admin/trips` — List trips (filters: `route_id`, `bus_id`, `status`)
- `GET   /api/v1/admin/trips/{trip_id}` — View trip details
- `PATCH /api/v1/admin/trips/{trip_id}` — Reschedule or update trip
- `POST  /api/v1/admin/trips/{trip_id}/cancel` — Cancel trip (preserved in history)

### Seat & Booking Management (`/api/v1/bookings`, `/api/v1/trips/{trip_id}/seats`)
- `GET  /api/v1/trips/{trip_id}/seats` — View seat map & real-time availability
- `POST /api/v1/bookings` — Book seat with row-level lock & `Idempotency-Key` header
- `GET  /api/v1/bookings` — List passenger's own bookings
- `GET  /api/v1/bookings/{booking_id}` — View single booking with ownership checks
- `POST /api/v1/bookings/{booking_id}/cancel` — Cancel booking, refund payment & free seat
- `GET  /api/v1/admin/bookings` — Admin view of all bookings across the platform

### Driver Trips & Telemetry (`/api/v1/driver`)
- `GET  /api/v1/driver/trips` — Driver lists trips assigned to them
- `POST /api/v1/driver/trips/{trip_id}/start` — Driver marks trip `IN_PROGRESS`
- `POST /api/v1/driver/trips/{trip_id}/location` — Driver device streams GPS ping (lat, lon, speed, heading)
- `POST /api/v1/driver/trips/{trip_id}/finish` — Driver marks trip `COMPLETED`

### Live Bus Tracking & Real-Time Updates (`/api/v1/trips`)
- `GET  /api/v1/trips/{trip_id}/location` — Passenger view of current bus position & next stop ETA
- `GET  /api/v1/trips/{trip_id}/events/tracking` — Server-Sent Events (SSE) live telemetry stream
- `WS   /api/v1/trips/{trip_id}/ws/tracking` — WebSocket bidirectional streaming connection

### Revenue & Operations Analytics (`/api/v1/admin/revenue`, `/api/v1/admin/trips`)
- `GET  /api/v1/admin/revenue/summary` — Gross revenue, refunds, net revenue, bookings count
- `GET  /api/v1/admin/revenue/by-route` — Route-level financial and occupancy aggregations
- `GET  /api/v1/admin/revenue/by-bus` — Bus-level operational performance
- `GET  /api/v1/admin/trips/{trip_id}/manifest` — Passenger manifest with seat allocations & load factor

### GenAI Assistant (`/api/v1/assistant`)
- `POST /api/v1/assistant/chat` — Conversational assistant grounded in baggage/cancellation policies, booking lookups, live bus GPS location, and trip search

### Agentic Tools with Human-in-the-Loop Confirmation (`/api/v1/agent/tools`)
- `POST /api/v1/agent/tools/propose` — Propose sensitive mutation (`BOOK_TICKET`, `CANCEL_BOOKING`) and obtain single-use token
- `POST /api/v1/agent/tools/confirm` — User explicitly confirms or aborts proposed action

## ☁️ Google Cloud Deployment (Cloud Run & Cloud SQL)

### 1. Required Google Cloud APIs
Enable the necessary services in your GCP project:
```bash
gcloud services enable \
    run.googleapis.com \
    sqladmin.googleapis.com \
    secretmanager.googleapis.com \
    artifactregistry.googleapis.com \
    logging.googleapis.com \
    monitoring.googleapis.com
```

### 2. Infrastructure as Code via Terraform
Initialize and deploy the managed resources (Artifact Registry, Secret Manager, Cloud SQL PostgreSQL 16, Cloud Run):
```bash
cd terraform
terraform init
terraform apply -var="project_id=YOUR_GCP_PROJECT_ID"
```

### 3. Deploying Container via Script
Use the provided automated scripts:
- **Bash (Linux / macOS):**
  ```bash
  export GCP_PROJECT_ID="your-project-id"
  export GCP_REGION="us-central1"
  ./scripts/deploy_cloud_run.sh
  ```
- **PowerShell (Windows):**
  ```powershell
  $env:GCP_PROJECT_ID="your-project-id"
  .\scripts\deploy_cloud_run.ps1
  ```

### 4. Cost-Conscious Cloud Run Architecture
- **Scale to Zero:** `min-instances = 0` (zero charges during idle hours).
- **Concurrency:** `80` requests handled per instance.
- **CPU Throttling:** Enabled (`cpu-idle = true`) so CPU cycles are only billed during request processing.
- **Secrets Management:** Injected directly into container environment variables at runtime via Secret Manager references without hardcoding in container layers.
- **Structured JSON Logging:** Automatically enables Google Cloud Logging JSON format (`severity`, `sourceLocation`, `request_id`) in production mode.

---

## ⚡ Trip Overlap Validation Rules

Two trips overlap when:
```
new_departure < existing_arrival  AND  new_arrival > existing_departure
```
The application checks and rejects conflicting trips on:
1. **The same Bus**: Returns `409 Conflict` with code `BUS_TRIP_CONFLICT`.
2. **The same Driver**: Returns `409 Conflict` with code `DRIVER_TRIP_CONFLICT`.
*Cancelled trips are excluded from overlap checks.*

---

## 🧪 Testing & Linting

Run all 57 automated unit and integration tests:
```bash
pytest
```

Run code formatting & linting checks:
```bash
python -m ruff check .
```

---

## 💡 Example Seed Credentials
- **Admin Email:** `admin@travelbus.local`
- **Password:** `AdminSecure2026!`
- **Sample Buses:** `KA-01-EA-1001` (Active), `KA-01-EA-1002` (Active), `KA-01-EA-1003` (Active), `KA-01-EA-1004` (Maintenance)
- **Sample Route:** `Bangalore - Mysore Express Highway` (4 sequenced stops)
