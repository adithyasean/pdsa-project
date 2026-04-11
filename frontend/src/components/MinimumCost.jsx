import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchNewRound, solveRound, fetchHistory } from "../api";
import ResultsDisplay from "./ResultsDisplay";
import TimingChart from "./TimingChart";
import AlgoAnimation from "./AlgoAnimation";
import styles from "./MinimumCost.module.css";

const PAGE_SIZE  = 10;
const ANIM_SPEED = 120;

export default function MinimumCost({ onBack }) {
  const [round, setRound]           = useState(null);
  const [assignment, setAssignment] = useState([]);
  const [solveData, setSolveData]   = useState(null);
  const [animAlgo, setAnimAlgo]     = useState(null);   // "Greedy" | "Hungarian" | null
  const [animDone, setAnimDone]     = useState(false);
  const [history, setHistory]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [animSpeed, setAnimSpeed]   = useState(ANIM_SPEED);
  const [empPage, setEmpPage]       = useState(0);
  const [taskPage, setTaskPage]     = useState(0);

  const loadHistory = useCallback(async () => {
    try { setHistory(await fetchHistory()); } catch { /* silent */ }
  }, []);

  // Load first puzzle on mount
  const loadNewPuzzle = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSolveData(null);
    setAnimAlgo(null);
    setAnimDone(false);
    try {
      const data = await fetchNewRound();
      setRound(data);
      setAssignment(Array(data.n).fill(null));
      setEmpPage(0);
      setTaskPage(0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNewPuzzle();
    loadHistory();
  }, [loadNewPuzzle, loadHistory]);

  // Clear only user assignments, keep same puzzle
  const resetAssignments = () => {
    if (!round) return;
    setAssignment(Array(round.n).fill(null));
    setSolveData(null);
    setAnimAlgo(null);
    setAnimDone(false);
  };

  // Cell click
  const handleCellClick = (emp, task) => {
    if (animAlgo && !animDone) return; // block edits while AI is animating
    setAssignment((prev) => {
      const next = [...prev];
      if (next[emp] === task) {
        next[emp] = null;
      } else {
        const prev_owner = next.indexOf(task);
        if (prev_owner !== -1) next[prev_owner] = null;
        next[emp] = task;
      }
      return next;
    });
  };

  // Solve with a specific algorithm (sends partial user assignment if any)
  const handleSolve = useCallback(async (algoLabel) => {
    if (!round) return;
    setLoading(true);
    setError(null);
    setSolveData(null);
    setAnimDone(false);
    try {
      const result = await solveRound({
        n: round.n,
        cost_matrix: round.cost_matrix,
        partial_assignment: assignment,
      });
      setSolveData(result);
      setAnimAlgo(algoLabel);
      await loadHistory();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [round, assignment, loadHistory]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const assignedCount = assignment.filter((t) => t !== null).length;
  const assignedTasks = new Set(assignment.filter((t) => t !== null));

  const userTotal = useMemo(() => {
    if (!round || assignedCount === 0) return null;
    return assignment.reduce((sum, task, emp) =>
      task !== null ? sum + round.cost_matrix[emp][task] : sum, 0
    );
  }, [assignment, round, assignedCount]);

  const empStart  = empPage  * PAGE_SIZE;
  const taskStart = taskPage * PAGE_SIZE;
  const visibleEmps  = round ? Array.from({ length: Math.min(PAGE_SIZE, round.n - empStart)  }, (_, i) => empStart  + i) : [];
  const visibleTasks = round ? Array.from({ length: Math.min(PAGE_SIZE, round.n - taskStart) }, (_, i) => taskStart + i) : [];

  const animResult = solveData?.results?.find((r) => r.algorithm_name === animAlgo);
  const showingResults = animDone || (solveData && !animAlgo);

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <button className="btn btn-ghost" onClick={onBack}>← Menu</button>
        <h1>Minimum Cost Assignment</h1>
        <div className={styles.headerActions}>
          {round && (
            <span className={styles.matrixBadge}>{round.n} × {round.n}</span>
          )}
          <button className="btn btn-ghost" onClick={resetAssignments} disabled={loading || !round}>
            ↺ Reset
          </button>
          <button className="btn btn-primary" onClick={loadNewPuzzle} disabled={loading}>
            {loading ? <><span className={styles.spinner} /> Loading…</> : "New Puzzle"}
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {!round && loading && (
        <div className={styles.centerLoad}>
          <span className={styles.spinnerLg} />
          <p>Generating puzzle…</p>
        </div>
      )}

      {round && (
        <>
          {/* ── Toolbar: stats + solve buttons ── */}
          <div className={styles.toolbar}>
            <div className={styles.toolbarStats}>
              <div className={styles.statPill}>
                <span>Assigned</span>
                <strong>{assignedCount} / {round.n}</strong>
              </div>
              {userTotal !== null && (
                <div className={`${styles.statPill} ${styles.statCost}`}>
                  <span>Your Total</span>
                  <strong>${userTotal}</strong>
                </div>
              )}
            </div>

            <div className={styles.toolbarSolve}>
              <span className={styles.solveLabel}>Solve with:</span>
              <button
                className={`btn ${styles.btnGreedy}`}
                onClick={() => handleSolve("Greedy")}
                disabled={loading}
                title="Greedy O(n²) — assigns each employee to the cheapest available task"
              >
                ⚡ Greedy
              </button>
              <button
                className={`btn ${styles.btnHungarian}`}
                onClick={() => handleSolve("Hungarian")}
                disabled={loading}
                title="Hungarian O(n³) — finds the globally optimal assignment"
              >
                🏆 Hungarian
              </button>
            </div>
          </div>

          {/* ── Assignment progress bar ── */}
          <div className={styles.assignProgress}>
            <div
              className={styles.assignProgressFill}
              style={{ width: `${(assignedCount / round.n) * 100}%` }}
            />
          </div>

          {/* ── Main content: matrix + animation side-by-side ── */}
          <div className={styles.mainContent}>
            {/* Cost matrix */}
            <div className={styles.matrixSection}>
              {/* Pagination controls */}
              <div className={styles.paginationRow}>
                <div className={styles.paginationGroup}>
                  <span>Employees</span>
                  <button className="btn btn-ghost" onClick={() => setEmpPage((p) => Math.max(0, p - 1))} disabled={empPage === 0}>‹</button>
                  <span className={styles.pageLabel}>
                    {empStart + 1}–{Math.min(empStart + PAGE_SIZE, round.n)} of {round.n}
                  </span>
                  <button className="btn btn-ghost" onClick={() => setEmpPage((p) => p + 1)} disabled={(empPage + 1) * PAGE_SIZE >= round.n}>›</button>
                </div>
                <div className={styles.paginationGroup}>
                  <span>Tasks</span>
                  <button className="btn btn-ghost" onClick={() => setTaskPage((p) => Math.max(0, p - 1))} disabled={taskPage === 0}>‹</button>
                  <span className={styles.pageLabel}>
                    {taskStart + 1}–{Math.min(taskStart + PAGE_SIZE, round.n)} of {round.n}
                  </span>
                  <button className="btn btn-ghost" onClick={() => setTaskPage((p) => p + 1)} disabled={(taskPage + 1) * PAGE_SIZE >= round.n}>›</button>
                </div>
              </div>

              <div className={styles.matrixWrapper}>
                <table className={styles.matrix}>
                  <thead>
                    <tr>
                      <th className={styles.cornerCell}>Emp \ Task</th>
                      {visibleTasks.map((t) => (
                        <th key={t} className={assignedTasks.has(t) ? styles.headerAssigned : ""}>
                          T{t + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEmps.map((emp) => (
                      <tr key={emp} className={assignment[emp] !== null ? styles.rowAssigned : ""}>
                        <td className={`${styles.rowHeader} ${assignment[emp] !== null ? styles.rowHeaderAssigned : ""}`}>
                          E{emp + 1}
                          {assignment[emp] !== null && (
                            <span className={styles.rowCost}> ${ round.cost_matrix[emp][assignment[emp]] }</span>
                          )}
                        </td>
                        {visibleTasks.map((task) => {
                          const selected  = assignment[emp] === task;
                          const taskTaken = assignedTasks.has(task) && !selected;
                          // Highlight cell if AI just assigned this pair
                          const aiActive  = animResult && !animDone
                            && animResult.steps?.some((s) => s.employee === emp && s.task === task);
                          return (
                            <td
                              key={task}
                              className={[
                                styles.cell,
                                selected   ? styles.cellSelected  : "",
                                taskTaken  ? styles.cellTaken     : "",
                                aiActive   ? styles.cellAiActive  : "",
                              ].join(" ")}
                              onClick={() => handleCellClick(emp, task)}
                              title={`E${emp + 1} → T${task + 1}: $${round.cost_matrix[emp][task]}`}
                            >
                              ${round.cost_matrix[emp][task]}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className={styles.hint}>
                Click a cell to assign manually. Use "Solve with" buttons to let the AI take over.
              </p>
            </div>

            {/* AI animation panel */}
            {animAlgo && animResult && !showingResults && (
              <div className={styles.animColumn}>
                <div className={styles.animTopBar}>
                  <span className={styles.animWatching}>Watching AI decide…</span>
                  <div className={styles.speedControl}>
                    <label>Speed</label>
                    <input
                      type="range" min={20} max={500} step={10}
                      value={animSpeed}
                      onChange={(e) => setAnimSpeed(Number(e.target.value))}
                      className={styles.speedSlider}
                    />
                    <span>{animSpeed < 80 ? "Fast" : animSpeed < 200 ? "Normal" : "Slow"}</span>
                  </div>
                </div>
                <AlgoAnimation
                  result={animResult}
                  costMatrix={round.cost_matrix}
                  speed={animSpeed}
                  onDone={() => setAnimDone(true)}
                />
              </div>
            )}
          </div>

          {/* ── Results (after animation done) ── */}
          {showingResults && solveData && (
            <>
              <ResultsDisplay
                solveData={solveData}
                highlightAlgo={animAlgo}
                onNextRound={loadNewPuzzle}
              />
              {history.length > 0 && (
                <div className={`card ${styles.chartCard}`}>
                  <h3>Algorithm Timing — Last {Math.min(Math.floor(history.length / 2), 20)} Rounds</h3>
                  <TimingChart history={history} />
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
