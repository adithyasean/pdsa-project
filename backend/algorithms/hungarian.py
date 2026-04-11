"""
Hungarian Algorithm (Kuhn-Munkres) for the Assignment Problem
--------------------------------------------------------------
Finds the OPTIMAL minimum-cost assignment of n employees to n tasks.

Time complexity : O(n³)
Space complexity: O(n²)

Steps:
  1. Row reduction  — subtract row minimum from each row.
  2. Column reduction — subtract column minimum from each column.
  3. Find minimum line cover using König's theorem on the zero graph.
  4. If line count == n, an optimal assignment exists — extract it.
  5. Otherwise, subtract the minimum uncovered value, add it to
     doubly-covered cells, and repeat from step 3.
"""


def hungarian_assignment(cost_matrix: list[list[int]]) -> tuple[list[int], int]:
    """
    Find optimal minimum-cost assignment using the Hungarian algorithm.

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
    matrix = [row[:] for row in cost_matrix]

    # Step 1 – Row reduction
    for i in range(n):
        row_min = min(matrix[i])
        for j in range(n):
            matrix[i][j] -= row_min

    # Step 2 – Column reduction
    for j in range(n):
        col_min = min(matrix[i][j] for i in range(n))
        for i in range(n):
            matrix[i][j] -= col_min

    # Iterate until minimum line cover equals n
    while True:
        row_cover, col_cover = _min_line_cover(matrix, n)
        if len(row_cover) + len(col_cover) >= n:
            break
        _adjust_matrix(matrix, n, row_cover, col_cover)

    assignment = _extract_assignment(matrix, n)
    total_cost = sum(cost_matrix[emp][assignment[emp]] for emp in range(n))
    return assignment, total_cost


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _max_matching(matrix: list[list[int]], n: int) -> tuple[list[int], list[int]]:
    """
    Find a maximum matching on zero entries using augmenting paths (iterative DFS).

    Returns
    -------
    row_match : list[int]  — row_match[i] = j (task) matched to employee i, or -1
    col_match : list[int]  — col_match[j] = i (employee) matched to task j, or -1
    """
    row_match = [-1] * n
    col_match = [-1] * n

    def try_augment(start: int) -> bool:
        # Iterative DFS for an augmenting path from unmatched row `start`
        # stack holds (row, iterator_over_columns)
        parent_col = {}          # col -> row that reached it
        stack = [start]
        visited_cols: set[int] = set()

        while stack:
            i = stack[-1]
            found = False
            for j in range(n):
                if matrix[i][j] == 0 and j not in visited_cols:
                    visited_cols.add(j)
                    parent_col[j] = i
                    if col_match[j] == -1:
                        # Augmenting path found — trace back and flip
                        while j != -1:
                            pi = parent_col[j]
                            prev_j = row_match[pi]
                            row_match[pi] = j
                            col_match[j] = pi
                            j = prev_j
                        return True
                    else:
                        stack.append(col_match[j])
                        found = True
                        break
            if not found:
                stack.pop()

        return False

    for i in range(n):
        if row_match[i] == -1:
            try_augment(i)

    return row_match, col_match


def _min_line_cover(
    matrix: list[list[int]], n: int
) -> tuple[set[int], set[int]]:
    """
    Find minimum line cover (rows + columns that cover all zeros) via König's theorem.

    Algorithm:
      1. Find a maximum matching on zeros.
      2. Mark all unmatched rows.
      3. Propagate via alternating paths:
           marked row  → mark every column that has a zero in that row
           marked col  → mark the row matched to that column (if any)
      4. Line cover = {unmarked rows} ∪ {marked columns}
    """
    row_match, col_match = _max_matching(matrix, n)

    # Start with unmatched rows
    marked_rows: set[int] = {i for i in range(n) if row_match[i] == -1}
    marked_cols: set[int] = set()

    queue = list(marked_rows)
    while queue:
        i = queue.pop()
        for j in range(n):
            if matrix[i][j] == 0 and j not in marked_cols:
                marked_cols.add(j)
                r = col_match[j]
                if r != -1 and r not in marked_rows:
                    marked_rows.add(r)
                    queue.append(r)

    row_cover = {i for i in range(n) if i not in marked_rows}
    col_cover = marked_cols
    return row_cover, col_cover


def _adjust_matrix(
    matrix: list[list[int]],
    n: int,
    row_cover: set[int],
    col_cover: set[int],
) -> None:
    """Subtract minimum uncovered value; add it back to doubly-covered cells."""
    min_val = min(
        matrix[i][j]
        for i in range(n) for j in range(n)
        if i not in row_cover and j not in col_cover
    )
    for i in range(n):
        for j in range(n):
            if i not in row_cover and j not in col_cover:
                matrix[i][j] -= min_val
            elif i in row_cover and j in col_cover:
                matrix[i][j] += min_val


def _extract_assignment(matrix: list[list[int]], n: int) -> list[int]:
    """Extract a complete one-to-one assignment from the reduced matrix."""
    row_match, _ = _max_matching(matrix, n)

    # Fallback: assign any remaining unmatched employee to any leftover task
    assigned_tasks = set(row_match)
    unassigned_tasks = [j for j in range(n) if j not in assigned_tasks]
    idx = 0
    for i in range(n):
        if row_match[i] == -1:
            row_match[i] = unassigned_tasks[idx]
            idx += 1

    return row_match
