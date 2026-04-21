"""
Unit tests for the Greedy and Hungarian assignment algorithms,
and the database save_round / player_name feature.
Run with: uv run pytest -v
"""

import pytest
from algorithms.greedy import greedy_assignment
from algorithms.hungarian import hungarian_assignment


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def is_valid_assignment(assignment: list[int], n: int) -> bool:
    """Every employee has a unique task in range [0, n)."""
    return sorted(assignment) == list(range(n))


def is_valid_steps(steps: list[dict], n: int) -> bool:
    """Steps list covers all n employees with required keys."""
    if len(steps) != n:
        return False
    required = {"employee", "task", "cost", "running_total"}
    return all(required.issubset(s.keys()) for s in steps)


# ---------------------------------------------------------------------------
# Greedy tests
# ---------------------------------------------------------------------------

class TestGreedyAssignment:

    def test_returns_valid_assignment_2x2(self):
        matrix = [[9, 2], [3, 8]]
        assignment, cost, steps = greedy_assignment(matrix)
        assert is_valid_assignment(assignment, 2)
        assert cost == sum(matrix[i][assignment[i]] for i in range(2))

    def test_returns_valid_assignment_3x3(self):
        matrix = [[4, 1, 3], [2, 0, 5], [3, 2, 2]]
        assignment, cost, steps = greedy_assignment(matrix)
        assert is_valid_assignment(assignment, 3)
        assert cost == sum(matrix[i][assignment[i]] for i in range(3))

    def test_single_employee(self):
        matrix = [[42]]
        assignment, cost, steps = greedy_assignment(matrix)
        assert assignment == [0]
        assert cost == 42

    def test_all_same_cost(self):
        matrix = [[5, 5], [5, 5]]
        assignment, cost, steps = greedy_assignment(matrix)
        assert is_valid_assignment(assignment, 2)
        assert cost == 10

    def test_cost_matches_assignment(self):
        matrix = [[10, 20, 30], [30, 10, 20], [20, 30, 10]]
        assignment, cost, steps = greedy_assignment(matrix)
        expected = sum(matrix[i][assignment[i]] for i in range(3))
        assert cost == expected

    def test_steps_structure(self):
        matrix = [[4, 1, 3], [2, 5, 6], [7, 8, 2]]
        assignment, cost, steps = greedy_assignment(matrix)
        assert is_valid_steps(steps, 3)

    def test_steps_running_total_is_final_cost(self):
        matrix = [[9, 2], [3, 8]]
        assignment, cost, steps = greedy_assignment(matrix)
        assert steps[-1]["running_total"] == cost

    def test_large_n_valid(self):
        import random
        random.seed(0)
        n = 80
        matrix = [[random.randint(20, 200) for _ in range(n)] for _ in range(n)]
        assignment, cost, steps = greedy_assignment(matrix)
        assert is_valid_assignment(assignment, n)
        assert cost == sum(matrix[i][assignment[i]] for i in range(n))


# ---------------------------------------------------------------------------
# Hungarian tests
# ---------------------------------------------------------------------------

class TestHungarianAssignment:

    def test_optimal_2x2(self):
        # Optimal: employee 0→task 1 (cost 2), employee 1→task 0 (cost 3) = 5
        matrix = [[9, 2], [3, 8]]
        assignment, cost, steps = hungarian_assignment(matrix)
        assert is_valid_assignment(assignment, 2)
        assert cost == 5

    def test_optimal_3x3_known_solution(self):
        # Optimal: 0→1 (1), 1→2 (1), 2→0 (1) = 3
        matrix = [[3, 1, 2], [2, 3, 1], [1, 2, 3]]
        assignment, cost, steps = hungarian_assignment(matrix)
        assert is_valid_assignment(assignment, 3)
        assert cost == 3

    def test_optimal_4x4_known(self):
        matrix = [
            [9,  2,  7,  8],
            [6,  4,  3,  7],
            [5,  8,  1,  8],
            [7,  6,  9,  4],
        ]
        # Brute-force verified optimal: 0→1 (2), 1→0 (6), 2→2 (1), 3→3 (4) = 13
        assignment, cost, steps = hungarian_assignment(matrix)
        assert is_valid_assignment(assignment, 4)
        assert cost == 13

    def test_returns_valid_assignment_single(self):
        matrix = [[99]]
        assignment, cost, steps = hungarian_assignment(matrix)
        assert assignment == [0]
        assert cost == 99

    def test_all_same_cost(self):
        matrix = [[7, 7, 7], [7, 7, 7], [7, 7, 7]]
        assignment, cost, steps = hungarian_assignment(matrix)
        assert is_valid_assignment(assignment, 3)
        assert cost == 21

    def test_steps_structure(self):
        matrix = [[3, 1, 2], [2, 3, 1], [1, 2, 3]]
        assignment, cost, steps = hungarian_assignment(matrix)
        assert is_valid_steps(steps, 3)

    def test_steps_running_total_is_final_cost(self):
        matrix = [[9, 2], [3, 8]]
        assignment, cost, steps = hungarian_assignment(matrix)
        assert steps[-1]["running_total"] == cost

    def test_hungarian_at_least_as_good_as_greedy(self):
        """Hungarian must never produce a higher cost than greedy on the same matrix."""
        import random
        random.seed(42)
        for _ in range(20):
            n = random.randint(3, 15)
            matrix = [[random.randint(20, 200) for _ in range(n)] for _ in range(n)]
            _, greedy_cost, _ = greedy_assignment(matrix)
            _, hungarian_cost, _ = hungarian_assignment(matrix)
            assert hungarian_cost <= greedy_cost, (
                f"Hungarian ({hungarian_cost}) > Greedy ({greedy_cost}) for n={n}"
            )

    def test_large_n_valid(self):
        import random
        random.seed(1)
        n = 80
        matrix = [[random.randint(20, 200) for _ in range(n)] for _ in range(n)]
        assignment, cost, steps = hungarian_assignment(matrix)
        assert is_valid_assignment(assignment, n)
        assert cost == sum(matrix[i][assignment[i]] for i in range(n))

    def test_cost_matches_assignment(self):
        import random
        random.seed(7)
        n = 10
        matrix = [[random.randint(20, 200) for _ in range(n)] for _ in range(n)]
        assignment, cost, steps = hungarian_assignment(matrix)
        expected = sum(matrix[i][assignment[i]] for i in range(n))
        assert cost == expected


# ---------------------------------------------------------------------------
# Database: player_name and user_total_cost
# ---------------------------------------------------------------------------

class TestSaveRound:

    def _make_results(self):
        return [
            {"algorithm_name": "Greedy",    "total_cost": 500, "time_ms": 1.23},
            {"algorithm_name": "Hungarian", "total_cost": 480, "time_ms": 4.56},
        ]

    def test_save_round_without_player_name(self):
        from database import save_round, get_all_rounds
        round_id = save_round(10, self._make_results())
        assert isinstance(round_id, int)
        rows = [r for r in get_all_rounds() if r["id"] == round_id]
        assert len(rows) == 2
        assert rows[0]["player_name"] is None
        assert rows[0]["user_total_cost"] is None

    def test_save_round_with_player_name(self):
        from database import save_round, get_all_rounds
        round_id = save_round(10, self._make_results(), player_name="Alice", user_total_cost=520)
        rows = [r for r in get_all_rounds() if r["id"] == round_id]
        assert len(rows) == 2
        assert rows[0]["player_name"] == "Alice"
        assert rows[0]["user_total_cost"] == 520

    def test_save_round_persists_algorithm_timing(self):
        from database import save_round, get_all_rounds
        round_id = save_round(5, self._make_results(), player_name="Bob")
        rows = {r["algorithm_name"]: r for r in get_all_rounds() if r["id"] == round_id}
        assert abs(rows["Greedy"]["time_ms"] - 1.23) < 0.001
        assert abs(rows["Hungarian"]["time_ms"] - 4.56) < 0.001
