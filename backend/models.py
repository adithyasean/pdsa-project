from pydantic import BaseModel, Field
from typing import Optional


class NewRoundResponse(BaseModel):
    n: int
    cost_matrix: list[list[int]]  # n x n, cost_matrix[employee][task]


class AssignmentStep(BaseModel):
    employee: int
    task: int
    cost: int
    running_total: int
    candidates: list[list[int]] = []   # [[task, cost], ...] top cheapest options considered


class AlgorithmResult(BaseModel):
    algorithm_name: str
    assignment: list[int]          # assignment[employee] = task index
    total_cost: int
    time_ms: float
    steps: list[AssignmentStep] = []   # step-by-step trace for animation


class SolveRequest(BaseModel):
    n: int
    cost_matrix: list[list[int]]
    partial_assignment: Optional[list[Optional[int]]] = Field(
        default=None,
        description="User's partial assignments. Index = employee, value = task or null if unassigned.",
    )


class SolveResponse(BaseModel):
    round_id: int
    n: int
    user_total_cost: Optional[int]
    results: list[AlgorithmResult]


class RoundHistoryItem(BaseModel):
    id: int
    n: int
    created_at: str
    algorithm_name: str
    total_cost: int
    time_ms: float
