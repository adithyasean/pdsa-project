import random
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from database import init_db, save_round, get_all_rounds, update_player_name
from models import NewRoundResponse, SolveRequest, SolveResponse, AlgorithmResult, RoundHistoryItem, UpdatePlayerNameRequest
from algorithms.greedy import greedy_assignment
from algorithms.hungarian import hungarian_assignment


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Minimum Cost Assignment Game", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/round/new", response_model=NewRoundResponse)
def new_round(n: int | None = None, t: int | None = None):
    """Generate a new game round: random N (or given n) and a random cost matrix."""
    if n is None:
        n = random.randint(50, 100)
    
    # Cap n at 500 for safety
    n = min(max(1, n), 500)
    cost_matrix = [
        [random.randint(20, 200) for _ in range(n)]
        for _ in range(n)
    ]
    return NewRoundResponse(n=n, cost_matrix=cost_matrix)


@app.post("/api/round/solve", response_model=SolveResponse)
def solve_round(body: SolveRequest):
    """
    Run both algorithms on the given cost matrix.

    If partial_assignment is provided, algorithms only fill in the unassigned
    employees (those with a null value in the array).
    """
    n = body.n
    matrix = body.cost_matrix

    if len(matrix) != n or any(len(row) != n for row in matrix):
        raise HTTPException(status_code=400, detail="cost_matrix dimensions must be n x n")

    partial = body.partial_assignment or [None] * n
    if len(partial) != n:
        raise HTTPException(status_code=400, detail="partial_assignment length must equal n")

    # 1. Full Matrix Baselines (Greedy & Hungarian)
    baselines = []
    for algo_name, algo_fn in [("Greedy", greedy_assignment), ("Hungarian", hungarian_assignment)]:
        t0 = time.perf_counter()
        assignment, cost, steps = algo_fn(matrix)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        baselines.append({
            "name": algo_name,
            "assignment": assignment,
            "cost": cost,
            "time_ms": round(elapsed_ms, 4),
            "steps": steps
        })

    # 2. User Result (Partial/Full assignment completed optimally)
    # Even if partial is empty, we'll treat it as a "User" entry (which would match Hungarian)
    user_assigned_employees = [i for i, t in enumerate(partial) if t is not None]
    user_assigned_tasks = {t for t in partial if t is not None}
    free_employees = [i for i, t in enumerate(partial) if t is None]
    free_tasks = [j for j in range(n) if j not in user_assigned_tasks]

    user_total_cost_calc = 0
    if user_assigned_employees:
        user_total_cost_calc = sum(matrix[i][partial[i]] for i in user_assigned_employees)

    full_user_assignment = list(partial)
    user_steps = [] # could populate if we want, but usually not needed for "User"
    
    if free_employees:
        sub_matrix = [[matrix[i][j] for j in free_tasks] for i in free_employees]
        # Complete optimally for the "User" entry
        sub_assignment, sub_cost, _ = hungarian_assignment(sub_matrix)
        user_total_cost_calc += sub_cost
        for idx, emp in enumerate(free_employees):
            full_user_assignment[emp] = free_tasks[sub_assignment[idx]]

    user_result = AlgorithmResult(
        algorithm_name="User",
        assignment=full_user_assignment,
        total_cost=user_total_cost_calc,
        time_ms=0.0, # Manual effort
        steps=[]
    )

    # 3. Combine and Save
    all_results = [user_result] + [
        AlgorithmResult(
            algorithm_name=b["name"],
            assignment=b["assignment"],
            total_cost=b["cost"],
            time_ms=b["time_ms"],
            steps=b["steps"]
        ) for b in baselines
    ]

    # Find the best (Hungarian) cost to save as total_cost
    hungarian_cost = next((r.total_cost for r in all_results if r.algorithm_name == "Hungarian"), user_total_cost_calc)

    round_id = save_round(
        n,
        [{"algorithm_name": r.algorithm_name, "total_cost": r.total_cost, "time_ms": r.time_ms} for r in all_results],
        player_name=body.player_name or None,
        user_total_cost=user_total_cost_calc,
        total_cost=hungarian_cost
    )

    return SolveResponse(
        round_id=round_id,
        n=n,
        user_total_cost=user_total_cost_calc,
        results=all_results,
    )


@app.get("/api/rounds", response_model=list[RoundHistoryItem])
def rounds_history():
    return get_all_rounds()


@app.post("/api/rounds/update-player-name")
def update_rounds_player_name(body: UpdatePlayerNameRequest):
    """Update player_name for a list of rounds (used when game ends)."""
    if not body.round_ids:
        raise HTTPException(status_code=400, detail="round_ids cannot be empty")
    if not body.player_name or not body.player_name.strip():
        raise HTTPException(status_code=400, detail="player_name cannot be empty")

    update_player_name(body.round_ids, body.player_name.strip())
    return {"status": "ok", "updated_rounds": len(body.round_ids)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
