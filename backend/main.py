import random
import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from database import init_db, save_round, get_all_rounds
from models import NewRoundResponse, SolveRequest, SolveResponse, AlgorithmResult, RoundHistoryItem
from algorithms.greedy import greedy_assignment
from algorithms.hungarian import hungarian_assignment

app = FastAPI(title="Minimum Cost Assignment Game")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/round/new", response_model=NewRoundResponse)
def new_round():
    """Generate a new game round: random N and a random cost matrix."""
    n = random.randint(50, 100)
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

    # Build a sub-problem for unassigned employees / tasks
    user_assigned_employees = [i for i, t in enumerate(partial) if t is not None]
    user_assigned_tasks = {t for t in partial if t is not None}
    free_employees = [i for i, t in enumerate(partial) if t is None]
    free_tasks = [j for j in range(n) if j not in user_assigned_tasks]

    user_total_cost: int | None = None
    if user_assigned_employees:
        user_total_cost = sum(matrix[i][partial[i]] for i in user_assigned_employees)

    results = []
    for algo_name, algo_fn in [("Greedy", greedy_assignment), ("Hungarian", hungarian_assignment)]:
        if free_employees:
            sub_matrix = [[matrix[i][j] for j in free_tasks] for i in free_employees]
            t0 = time.perf_counter()
            sub_assignment, _, sub_steps = algo_fn(sub_matrix)
            elapsed_ms = (time.perf_counter() - t0) * 1000

            # Map sub-problem indices back to original
            full_assignment = list(partial)
            for idx, emp in enumerate(free_employees):
                full_assignment[emp] = free_tasks[sub_assignment[idx]]

            # Map steps back to original employee/task indices
            user_cost = user_total_cost or 0
            steps = []
            for step in sub_steps:
                real_emp  = free_employees[step["employee"]]
                real_task = free_tasks[step["task"]]
                steps.append({
                    "employee": real_emp,
                    "task": real_task,
                    "cost": step["cost"],
                    "running_total": user_cost + step["running_total"],
                    "candidates": [
                        [free_tasks[c[0]], c[1]] for c in step["candidates"]
                    ],
                })
        else:
            # Entire matrix already assigned by user — just time a trivial call
            t0 = time.perf_counter()
            algo_fn([[matrix[i][i] for i in range(1)]])   # minimal call to get a non-zero time
            elapsed_ms = (time.perf_counter() - t0) * 1000
            full_assignment = list(partial)
            steps = []

        total_cost = sum(matrix[i][full_assignment[i]] for i in range(n))
        results.append(
            AlgorithmResult(
                algorithm_name=algo_name,
                assignment=full_assignment,
                total_cost=total_cost,
                time_ms=round(elapsed_ms, 4),
                steps=steps,
            )
        )

    round_id = save_round(
        n,
        [{"algorithm_name": r.algorithm_name, "total_cost": r.total_cost, "time_ms": r.time_ms} for r in results],
    )

    return SolveResponse(
        round_id=round_id,
        n=n,
        user_total_cost=user_total_cost,
        results=results,
    )


@app.get("/api/rounds", response_model=list[RoundHistoryItem])
def rounds_history():
    return get_all_rounds()
