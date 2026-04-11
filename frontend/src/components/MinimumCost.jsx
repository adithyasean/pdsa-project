import { useState, useEffect, useCallback } from "react";
import { fetchNewRound, solveRound, fetchHistory } from "../api";
import ResultsDisplay from "./ResultsDisplay";
import TimingChart from "./TimingChart";
import styles from "./MinimumCost.module.css";

const MODE_SELECT = "select";   // pick play mode
const MODE_PLAY   = "play";     // manual / mixed in progress
const MODE_RESULT = "result";   // results shown

export default function MinimumCost({ onBack }) {
  const [round, setRound]       = useState(null);   // { n, cost_matrix }
  const [phase, setPhase]       = useState(MODE_SELECT);
  const [playMode, setPlayMode] = useState(null);   // "auto" | "manual" | "mixed"
  const [assignment, setAssignment] = useState([]); // length n, value = task index or null
  const [solveData, setSolveData]   = useState(null);
  const [history, setHistory]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  // Visible window for the matrix (paginated — show 10 employees at a time)
  const PAGE_SIZE = 10;
  const [empPage, setEmpPage]   = useState(0);
  const [taskPage, setTaskPage] = useState(0);

  const loadHistory = useCallback(async () => {
    try { setHistory(await fetchHistory()); } catch { /* silent */ }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const startRound = useCallback(async (mode) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNewRound();
      setRound(data);
      setAssignment(Array(data.n).fill(null));
      setPlayMode(mode);
      setEmpPage(0);
      setTaskPage(0);
      setSolveData(null);
      if (mode === "auto") {
        // Solve immediately
        const result = await solveRound({ n: data.n, cost_matrix: data.cost_matrix });
        setSolveData(result);
        setPhase(MODE_RESULT);
        await loadHistory();
      } else {
        setPhase(MODE_PLAY);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [loadHistory]);

  const handleCellClick = (emp, task) => {
    setAssignment((prev) => {
      const next = [...prev];
      // Toggle: clicking the already-assigned task deselects it
      if (next[emp] === task) {
        next[emp] = null;
      } else {
        // Unassign the task from any other employee first
        const prev_owner = next.indexOf(task);
        if (prev_owner !== -1) next[prev_owner] = null;
        next[emp] = task;
      }
      return next;
    });
  };

  const handleSolve = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await solveRound({
        n: round.n,
        cost_matrix: round.cost_matrix,
        partial_assignment: assignment,
      });
      setSolveData(result);
      setPhase(MODE_RESULT);
      await loadHistory();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [round, assignment, loadHistory]);

  const handleNextRound = () => {
    setRound(null);
    setSolveData(null);
    setPhase(MODE_SELECT);
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const assignedCount  = assignment.filter((t) => t !== null).length;
  const assignedTasks  = new Set(assignment.filter((t) => t !== null));
  const empStart  = empPage  * PAGE_SIZE;
  const taskStart = taskPage * PAGE_SIZE;
  const visibleEmps  = round ? Array.from({ length: Math.min(PAGE_SIZE, round.n - empStart)  }, (_, i) => empStart  + i) : [];
  const visibleTasks = round ? Array.from({ length: Math.min(PAGE_SIZE, round.n - taskStart) }, (_, i) => taskStart + i) : [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className="btn btn-ghost" onClick={onBack}>← Menu</button>
        <h1>Minimum Cost Assignment</h1>
        <span />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* ── MODE SELECT ── */}
      {phase === MODE_SELECT && (
        <div className={styles.modeSelect}>
          <p className={styles.modeDesc}>
            Each round generates N employees and N tasks (N = 50–100) with random costs ($20–$200).
            Choose how to play:
          </p>
          <div className={styles.modeCards}>
            <button className={styles.modeCard} onClick={() => startRound("auto")} disabled={loading}>
              <span>🤖</span>
              <h3>Auto</h3>
              <p>Let both algorithms solve immediately and compare results.</p>
            </button>
            <button className={styles.modeCard} onClick={() => startRound("manual")} disabled={loading}>
              <span>🧠</span>
              <h3>Manual</h3>
              <p>Assign all employees yourself, then compare against the algorithms.</p>
            </button>
            <button className={styles.modeCard} onClick={() => startRound("mixed")} disabled={loading}>
              <span>🔀</span>
              <h3>Mixed</h3>
              <p>Make some assignments then hand the rest over to an algorithm.</p>
            </button>
          </div>
          {loading && <p className={styles.loading}>Generating round…</p>}
        </div>
      )}

      {/* ── PLAY (manual / mixed) ── */}
      {phase === MODE_PLAY && round && (
        <div className={styles.playArea}>
          <div className={styles.playHeader}>
            <span>N = <strong>{round.n}</strong></span>
            <span>Assigned: <strong>{assignedCount} / {round.n}</strong></span>
            {playMode === "mixed" && (
              <button className="btn btn-warning" onClick={handleSolve} disabled={loading}>
                Hand Over to Algorithm
              </button>
            )}
            {playMode === "manual" && assignedCount === round.n && (
              <button className="btn btn-success" onClick={handleSolve} disabled={loading}>
                Submit My Assignment
              </button>
            )}
          </div>

          {/* Matrix pagination controls */}
          <div className={styles.paginationRow}>
            <div className={styles.paginationGroup}>
              <span>Employees</span>
              <button className="btn btn-ghost" onClick={() => setEmpPage((p) => Math.max(0, p - 1))} disabled={empPage === 0}>‹</button>
              <span>{empPage * PAGE_SIZE + 1}–{Math.min((empPage + 1) * PAGE_SIZE, round.n)} of {round.n}</span>
              <button className="btn btn-ghost" onClick={() => setEmpPage((p) => p + 1)} disabled={(empPage + 1) * PAGE_SIZE >= round.n}>›</button>
            </div>
            <div className={styles.paginationGroup}>
              <span>Tasks</span>
              <button className="btn btn-ghost" onClick={() => setTaskPage((p) => Math.max(0, p - 1))} disabled={taskPage === 0}>‹</button>
              <span>{taskPage * PAGE_SIZE + 1}–{Math.min((taskPage + 1) * PAGE_SIZE, round.n)} of {round.n}</span>
              <button className="btn btn-ghost" onClick={() => setTaskPage((p) => p + 1)} disabled={(taskPage + 1) * PAGE_SIZE >= round.n}>›</button>
            </div>
          </div>

          {/* Cost matrix grid */}
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
                  <tr key={emp}>
                    <td className={styles.rowHeader}>E{emp + 1}</td>
                    {visibleTasks.map((task) => {
                      const selected = assignment[emp] === task;
                      const taskTaken = assignedTasks.has(task) && !selected;
                      return (
                        <td
                          key={task}
                          className={[
                            styles.cell,
                            selected   ? styles.cellSelected  : "",
                            taskTaken  ? styles.cellTaken     : "",
                          ].join(" ")}
                          onClick={() => handleCellClick(emp, task)}
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
          {loading && <p className={styles.loading}>Solving…</p>}
        </div>
      )}

      {/* ── RESULTS ── */}
      {phase === MODE_RESULT && solveData && (
        <>
          <ResultsDisplay solveData={solveData} onNextRound={handleNextRound} />
          {history.length > 0 && (
            <div className={`card ${styles.chartCard}`}>
              <h3>Algorithm Timing — Last {Math.min(history.length / 2, 20) | 0} Rounds</h3>
              <TimingChart history={history} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
