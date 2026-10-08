# TravelBus Manager frontend

Phase 2 adds sign-in, registration, session restore, sign-out, and role-based route protection.

The UI reads `VITE_API_BASE_URL` and calls the existing API. Copy `.env.example` to `.env` before starting. The sample value is `http://localhost:8000`.

## Scripts

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
```

Passenger flows, driver trips, administration, revenue, live fleet tracking, account profiles, the assistant, and confirmation for booking and cancellation are connected to the existing API.
