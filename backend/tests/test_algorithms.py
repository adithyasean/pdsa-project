"""
Unit tests for the Greedy and Hungarian assignment algorithms.
Run with: pytest backend/tests/test_algorithms.py -v
"""

import pytest
from algorithms.greedy import greedy_assignment
from algorithms.hungarian import hungarian_assignment


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def is_valid_assignment(assignment: list[int], n: int) -> bool:
    """Every employee has a unique task in range [0, n)."""
    return sorted(assignment) == list(range(n))


# ---------------------------------------------------------------------------
# Greedy tests
# ---------------------------------------------------------------------------

class TestGreedyAssignment:

    def test_returns_valid_assignment_2x2(self):
        matrix = [[9, 2], [3, 8]]
        assignment, cost = greedy_assignment(matrix)
        assert is_valid_assignment(assignment, 2)
        assert cost == sum(matrix[i][assignment[i]] for i in range(2))

    def test_returns_valid_assignment_3x3(self):
        matrix = [[4, 1, 3], [2, 0, 5], [3, 2, 2]]
        assignment, cost = greedy_assignment(matrix)
        assert is_valid_assignment(assignment, 3)
        assert cost == sum(matrix[i][assignment[i]] for i in range(3))

    def test_single_employee(self):
        matrix = [[42]]
        assignment, cost = greedy_assignment(matrix)
        assert assignment == [0]
        assert cost == 42

    def test_all_same_cost(self):
        matrix = [[5, 5], [5, 5]]
        assignment, cost = greedy_assignment(matrix)
        assert is_valid_assignment(assignment, 2)
        assert cost == 10

    def test_cost_matches_assignment(self):
        matrix = [[10, 20, 30], [30, 10, 20], [20, 30, 10]]
        assignment, cost = greedy_assignment(matrix)
        expected = sum(matrix[i][assignment[i]] for i in range(3))
        assert cost == expected

    def test_large_n_valid(self):
        import random
        random.seed(0)
        n = 80
        matrix = [[random.randint(20, 200) for _ in range(n)] for _ in range(n)]
        assignment, cost = greedy_assignment(matrix)
        assert is_valid_assignment(assignment, n)
        assert cost == sum(matrix[i][assignment[i]] for i in range(n))


# ---------------------------------------------------------------------------
# Hungarian tests
# ---------------------------------------------------------------------------

class TestHungarianAssignment:

    def test_optimal_2x2(self):
        # Optimal: employee 0→task 1 (cost 2), employee 1→task 0 (cost 3) = 5
        matrix = [[9, 2], [3, 8]]
        assignment, cost = hungarian_assignment(matrix)
        assert is_valid_assignment(assignment, 2)
        assert cost == 5

    def test_optimal_3x3_known_solution(self):
        # Known optimal: cost = 0+0+0 = 0 after reduction, real costs: 2+3+1 = 6?
        # Let's use a clear example
        matrix = [[3, 1, 2], [2, 3, 1], [1, 2, 3]]
        # Optimal: 0→1 (1), 1→2 (1), 2→0 (1) = 3
        assignment, cost = hungarian_assignment(matrix)
        assert is_valid_assignment(assignment, 3)
        assert cost == 3

    def test_optimal_4x4_known(self):
        matrix = [
            [9,  2,  7,  8],
            [6,  4,  3,  7],
            [5,  8,  1,  8],
            [7,  6,  9,  4],
        ]
        # Brute-force verified optimal: employee 0→task 1 (2), 1→task 0 (6),
        # 2→task 2 (1), 3→task 3 (4) = 13
        # (employees 1 and 2 both want task 2, so row-minima sum of 10 is infeasible)
        assignment, cost = hungarian_assignment(matrix)
        assert is_valid_assignment(assignment, 4)
        assert cost == 13

    def test_returns_valid_assignment_single(self):
        matrix = [[99]]
        assignment, cost = hungarian_assignment(matrix)
        assert assignment == [0]
        assert cost == 99

    def test_all_same_cost(self):
        matrix = [[7, 7, 7], [7, 7, 7], [7, 7, 7]]
        assignment, cost = hungarian_assignment(matrix)
        assert is_valid_assignment(assignment, 3)
        assert cost == 21

    def test_hungarian_at_least_as_good_as_greedy(self):
        """Hungarian must never produce a higher cost than greedy on the same matrix."""
        import random
        random.seed(42)
        for _ in range(20):
            n = random.randint(3, 15)
            matrix = [[random.randint(20, 200) for _ in range(n)] for _ in range(n)]
            _, greedy_cost = greedy_assignment(matrix)
            _, hungarian_cost = hungarian_assignment(matrix)
            assert hungarian_cost <= greedy_cost, (
                f"Hungarian ({hungarian_cost}) > Greedy ({greedy_cost}) for n={n}"
            )

    def test_large_n_valid(self):
        import random
        random.seed(1)
        n = 80
        matrix = [[random.randint(20, 200) for _ in range(n)] for _ in range(n)]
        assignment, cost = hungarian_assignment(matrix)
        assert is_valid_assignment(assignment, n)
        assert cost == sum(matrix[i][assignment[i]] for i in range(n))

    def test_cost_matches_assignment(self):
        import random
        random.seed(7)
        n = 10
        matrix = [[random.randint(20, 200) for _ in range(n)] for _ in range(n)]
        assignment, cost = hungarian_assignment(matrix)
        expected = sum(matrix[i][assignment[i]] for i in range(n))
        assert cost == expected
