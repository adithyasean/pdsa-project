# PDSA Game Suite — Minimum Cost Assignment

BSc (Hons) Computing · PDSA Module · Batch 24.2  
**National Institute of Business Management — School of Computing and Engineering**

---

## Overview

A web-based game that solves the **Assignment Problem**: optimally assigning N employees to N tasks to minimise total cost.  
Each game round generates a random N (50–100) and a random cost matrix ($20–$200 per cell).  
Two algorithms are compared side-by-side with execution times recorded in a database.

---

## Algorithms

| Algorithm | Complexity | Optimal? |
|-----------|-----------|----------|
| **Greedy** | O(n²) | No — heuristic |
| **Hungarian (Kuhn-Munkres)** | O(n³) | Yes — guaranteed global optimum |

**Greedy:** For each employee in order, assign the cheapest unassigned task.  
**Hungarian:** Row/column reduction + König's theorem minimum line cover to find the true optimum.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3, FastAPI, SQLite |
| Frontend | React 19, Vite, Recharts |
| Testing | pytest |

---

## Project Structure

```
pdsa-project/
├── backend/
│   ├── main.py                  # FastAPI app & API routes
│   ├── database.py              # SQLite schema and queries
│   ├── models.py                # Pydantic request/response models
│   ├── algorithms/
│   │   ├── greedy.py            # Greedy assignment algorithm
│   │   └── hungarian.py         # Hungarian algorithm
│   ├── tests/
│   │   └── test_algorithms.py   # 14 unit tests (pytest)
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── api.js               # Backend fetch wrappers
│       └── components/
│           ├── GameMenu.jsx     # Landing screen
│           ├── MinimumCost.jsx  # Main game screen
│           ├── ResultsDisplay.jsx
│           └── TimingChart.jsx  # Recharts timing bar chart
└── docs/
    └── COURSEWORK.md            # Assignment brief
```

---

## Getting Started

### Prerequisites

- [uv](https://docs.astral.sh/uv/) (Python package manager)
- Node.js 18+

### Backend

```bash
cd backend

# Install dependencies and create virtualenv automatically
uv sync

# Start server
uv run uvicorn main:app --reload
# Runs at http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Runs at http://localhost:5173
```

### Run Tests

```bash
cd backend
uv run pytest -v
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/round/new` | Generate new round (random N + cost matrix) |
| `POST` | `/api/round/solve` | Run both algorithms, save results to DB |
| `GET` | `/api/rounds` | Retrieve full game history |

---

## Game Modes

- **Auto** — both algorithms solve immediately; view results and timing
- **Manual** — assign all employees yourself using the matrix grid, then compare against algorithms
- **Mixed** — make some assignments manually, then hand the remainder to an algorithm

---

## Database Schema

```sql
game_rounds (
    id          INTEGER PRIMARY KEY,
    n           INTEGER,
    created_at  DATETIME
)

algorithm_results (
    id             INTEGER PRIMARY KEY,
    round_id       INTEGER REFERENCES game_rounds(id),
    algorithm_name TEXT,     -- "Greedy" or "Hungarian"
    total_cost     INTEGER,
    time_ms        REAL
)
```

---

## Authors

| Name | Role |
|------|------|
| Adithya Ekanayaka | Backend — algorithms, database, API, unit tests |
| Sadew Yasas | Frontend — React UI, game screens, timing chart |
