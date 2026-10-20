# Zer0wasteX — SIH26259 MLP Management Platform

AI-assisted Multi-Layer Plastic (MLP) management platform for PWMU/MRF operations, built on the existing Zer0wasteX stack (React/Vite + Node/Express + Supabase + FastAPI vision service + ESP32 ingest).

## SIH26259 Scope Implemented
- MRF operations dashboard: daily intake, throughput, recovered material, contamination/rejection, storage utilization, dispatch count, pending collections, open alerts.
- MLP taxonomy: general plastic + sachet/laminated pouch/wrapper/polybag/contaminated MLP with explicit heuristic/demo labeling.
- Smart-bin monitoring: fill/weight telemetry retained with collection status, pickup assignment, route, priority, alert state.
- MRF workflow lifecycle + audit: intake → sorting → quality_inspection → baling_storage → recycler_dispatch.
- AI image scoring: `/health`, `/classes`, `/score` preserved with hosted/local/mock adapters and visible model source.
- Citizen/operator reporting: drop events retained + operator inspection upload records.
- Demo mode: deterministic seeded local mode (`DEMO_MODE=true`) without Supabase credentials.
- Production mode: Supabase-backed mode still supported.

## Repository Structure
- `/frontend` React + Vite + Leaflet UI
- `/backend` Express REST APIs and ESP32 integration support
- `/db/schema.sql` Supabase/Postgres schema
- `/ml` FastAPI vision scoring service
- `/scripts` validation and submission packaging scripts
- `/docs/SIH26259_DEMO_GUIDE.md` full demo guide and API reference

## Quick Start (Demo Mode)
### 1) Backend
```bash
cd /home/runner/work/zerowastex/zerowastex/backend
cp .env.example .env
npm install
npm run dev
```

### 2) Frontend
```bash
cd /home/runner/work/zerowastex/zerowastex/frontend
cp .env.example .env
npm install
npm run dev
```

### 3) Vision Service
```bash
cd /home/runner/work/zerowastex/zerowastex/ml
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn vision_service:app --host 0.0.0.0 --port 8000 --reload
```

## Core APIs
- `GET /health`
- `GET /api/dashboard/overview`
- `GET /api/material-taxonomy`
- `GET /api/bins`
- `PATCH /api/bins/:id/collection`
- `GET/POST /api/workflow/records`
- `PATCH /api/workflow/records/:id/status`
- `GET /api/workflow/records/:id/audit`
- `GET/POST /api/inspections`
- `POST /api/drop-event`
- `GET /api/drop-events`

Vision service:
- `GET /health`
- `GET /classes`
- `POST /score`

## Validation & Packaging
```bash
cd /home/runner/work/zerowastex/zerowastex
./scripts/validate_demo.sh
```

Submission zip:
```bash
./scripts/package_submission.sh
```

## Security Notes
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend.
- Keep `.env` files uncommitted.
- Configure CORS explicitly via `CORS_ORIGINS`.

## Limitations
- MLP sub-classes are heuristic/demo unless backed by a trained/hosted model.
- Demo mode is deterministic seeded simulation and not production telemetry.

For full architecture, setup, API payloads, model/license notes, and video checklist, see:
`/home/runner/work/zerowastex/zerowastex/docs/SIH26259_DEMO_GUIDE.md`
