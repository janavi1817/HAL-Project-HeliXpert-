# HeliXpert — Helicopter Intelligence Platform

**100% offline AI-powered helicopter fleet analytics platform** built with React + FastAPI + SQLite.

![HeliXpert](https://img.shields.io/badge/HeliXpert-v1.0.0-FFCC33?style=for-the-badge&logo=helicopter)
![Offline](https://img.shields.io/badge/Mode-100%25%20Offline-22c55e?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi)

---

## Features

- **AI Database Analyst** — Rule-based NLP + SQL engine over real helicopter datasets, no cloud required
- **3D Helicopter Model** — Interactive 360° rotating model with Three.js / React Three Fiber
- **Fleet Management** — 10 real helicopter models (Airbus, Bell, Sikorsky, etc.)
- **PHM Engine Telemetry** — 742,625 turboshaft sensor observations with health labels
- **Maintenance Logbook** — 6,169 annotated real-world aviation maintenance records
- **Image Vision AI** — Computer vision architecture for component defect detection (YOLOv8)
- **Knowledge Base** — Local RAG document search for technical manuals
- **Premium Theme** — Gold / Black (dark) and Gold / White (light) fully responsive UI

---

## Quick Start

### Requirements
- Python 3.9+
- Node.js 18+

### 1. Setup & Ingest Data
```bat
setup_offline.bat
```

### 2. Start Both Servers
```bat
start_helixpert.bat
```

Or manually:

**Backend:**
```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
cd HeliXpert
npm install
npm run dev
```

### 3. Open in Browser
- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs

---

## Project Structure

```
HeliXpert/
├── backend/                    # FastAPI backend
│   ├── ai/                     # AI orchestrator, SQL agent, schema
│   ├── api/                    # Route handlers (ai, documents, vision, prognostics)
│   ├── services/               # RAG service, vision service
│   ├── ingestion.py            # Dataset ingestion pipeline
│   └── main.py                 # FastAPI app with all endpoints
│
├── HeliXpert/                  # React frontend (Vite)
│   └── src/
│       ├── components/         # All UI components
│       ├── services/           # API client, data service, AI engine
│       └── contexts/           # Theme context (dark/light)
│
├── data/
│   ├── raw/
│   │   ├── helicopters/        # Helicopter fleet CSV
│   │   ├── components/         # Component reference CSV
│   │   ├── maintenance/        # Annotated maintenance logbook
│   │   └── phm_helicopter/     # PHM 2024 turboshaft sensor data
│   └── metadata/               # Dataset registry
│
├── models/vision/              # Vision AI model placeholder
├── setup_offline.bat           # One-click setup script
└── start_helixpert.bat         # Start both servers
```

---

## Data Sources

| Dataset | Records | Source |
|---------|---------|--------|
| Helicopter Fleet | 10 models | Airbus, Bell, Sikorsky public specs |
| PHM Turboshaft Telemetry | 742,625 obs | PHM 2024 Helicopter Engine Health |
| Annotated Maintenance Logbook | 6,169 records | Aviation maintenance records |
| Component Reference | 8 types | IPC reference taxonomy |

> **Note:** Raw H5 and large CSV files are excluded from this repo due to file size. Add them to `data/raw/` before running `setup_offline.bat`.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | System health check |
| GET | `/api/helicopters` | All helicopter records |
| GET | `/api/components` | Component reference data |
| GET | `/api/telemetry/summary` | PHM engine health summary |
| GET | `/api/faults` | Fault observations |
| GET | `/api/maintenance/summary` | Maintenance problem types |
| POST | `/api/analyst/query` | AI natural language query |
| GET | `/api/dashboard/stats` | Dashboard KPIs |

Full interactive docs at: `http://localhost:8000/docs`

---

## Tech Stack

**Frontend:** React 18, Vite, Tailwind CSS, Recharts, React Three Fiber / Drei, Lucide Icons

**Backend:** FastAPI, SQLite, Pandas, Uvicorn

**AI Engine:** Rule-based intent classifier + safe SQL generator (offline), optional Ollama integration

**Vision AI (placeholder):** YOLOv8 + ResNet50 architecture for component defect detection
