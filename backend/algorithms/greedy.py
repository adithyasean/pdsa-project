"""
Greedy Algorithm for the Assignment Problem
--------------------------------------------
For each employee (row 0..n-1), assign the cheapest available task.

Time complexity : O(n²)
Space complexity: O(n)

This is a heuristic — it does NOT guarantee the global optimum.
It is simple and fast, making it a useful baseline for comparison.
"""


def greedy_assignment(cost_matrix: list[list[int]]) -> tuple[list[int], int]:
    """
    Assign n employees to n tasks greedily.

    Parameters
    ----------
    cost_matrix : n x n list-of-lists
        cost_matrix[employee][task] = cost in dollars

    Returns
    -------
    assignment : list[int]
        assignment[employee] = task index assigned to that employee
    total_cost : int
        sum of costs for the final assignment
    """
    n = len(cost_matrix)
    assigned_tasks: set[int] = set()
    assignment: list[int] = [-1] * n

    for employee in range(n):
        best_task = -1
        best_cost = float("inf")

        for task in range(n):
            if task not in assigned_tasks and cost_matrix[employee][task] < best_cost:
                best_cost = cost_matrix[employee][task]
                best_task = task

        assignment[employee] = best_task
        assigned_tasks.add(best_task)

    total_cost = sum(cost_matrix[emp][assignment[emp]] for emp in range(n))
    return assignment, total_cost
