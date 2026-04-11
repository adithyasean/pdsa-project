import { useState, useEffect, useRef } from "react";
import styles from "./AlgoAnimation.module.css";

/**
 * Real-time step-by-step animation of an algorithm solving the assignment problem.
 *
 * Props:
 *   result      – AlgorithmResult with steps[]
 *   costMatrix  – original n×n cost matrix
 *   speed       – ms per step (default 120)
 *   onDone      – called when animation finishes
 */
export default function AlgoAnimation({ result, costMatrix, speed = 120, onDone }) {
  const [stepIdx, setStepIdx] = useState(-1);   // -1 = not started
  const [playing, setPlaying] = useState(true);
  const timerRef = useRef(null);

  const steps = result?.steps ?? [];
  const n = costMatrix?.length ?? 0;
  const current = steps[stepIdx] ?? null;

  // Build assignment map up to current step
  const assignedSoFar = {};
  for (let i = 0; i <= stepIdx && i < steps.length; i++) {
    assignedSoFar[steps[i].employee] = steps[i].task;
  }

  useEffect(() => {
    if (!playing) return;
    if (stepIdx >= steps.length - 1) {
      setPlaying(false);
      onDone?.();
      return;
    }
    timerRef.current = setTimeout(() => {
      setStepIdx((s) => s + 1);
    }, speed);
    return () => clearTimeout(timerRef.current);
  }, [stepIdx, playing, steps.length, speed, onDone]);

  const togglePlay = () => setPlaying((p) => !p);
  const skipToEnd = () => {
    clearTimeout(timerRef.current);
    setStepIdx(steps.length - 1);
    setPlaying(false);
    onDone?.();
  };
  const restart = () => {
    clearTimeout(timerRef.current);
    setStepIdx(-1);
    setPlaying(true);
  };

  const progress = steps.length ? ((stepIdx + 1) / steps.length) * 100 : 0;
  const isGreedy = result?.algorithm_name === "Greedy";

  // Show a compact slice of the matrix around the current employee
  const WINDOW = 5;
  const empCenter = current ? current.employee : 0;
  const empStart = Math.max(0, Math.min(empCenter - 2, n - WINDOW));
  const visEmps  = Array.from({ length: Math.min(WINDOW, n) }, (_, i) => empStart + i);

  // Task window — show the current task and a few neighbours
  const taskCenter = current ? current.task : 0;
  const taskStart  = Math.max(0, Math.min(taskCenter - 2, n - WINDOW));
  const visTasks   = Array.from({ length: Math.min(WINDOW, n) }, (_, i) => taskStart + i);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={`${styles.badge} ${isGreedy ? styles.greedy : styles.hungarian}`}>
          {isGreedy ? "⚡ Greedy" : "🏆 Hungarian"}
        </span>
        <span className={styles.complexity}>
          {isGreedy ? "O(n²) — heuristic" : "O(n³) — optimal"}
        </span>
      </div>

      {/* Progress bar */}
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>
      <div className={styles.progressLabel}>
        {stepIdx + 1} / {steps.length} assignments
      </div>

      {/* Running cost counter */}
      <div className={styles.costDisplay}>
        <span className={styles.costLabel}>Running Total</span>
        <span className={styles.costValue}>
          ${current?.running_total ?? 0}
        </span>
      </div>

      {/* Current step description */}
      {current && (
        <div className={styles.stepDesc}>
          <span className={styles.stepArrow}>→</span>
          <span>
            Employee <strong>E{current.employee + 1}</strong> assigned to{" "}
            Task <strong>T{current.task + 1}</strong>{" "}
            for <strong className={styles.stepCost}>${current.cost}</strong>
          </span>
        </div>
      )}

      {/* Greedy candidates panel */}
      {isGreedy && current?.candidates?.length > 0 && (
        <div className={styles.candidates}>
          <span className={styles.candidatesLabel}>Considered (cheapest available):</span>
          <div className={styles.candidateList}>
            {current.candidates.map(([task, cost], idx) => (
              <span
                key={task}
                className={`${styles.candidateChip} ${task === current.task ? styles.chosen : ""}`}
              >
                {idx === 0 && "✓ "}T{task + 1}: ${cost}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Mini matrix view */}
      {costMatrix && n > 0 && (
        <div className={styles.miniMatrixWrap}>
          <table className={styles.miniMatrix}>
            <thead>
              <tr>
                <th className={styles.corner}>E\T</th>
                {visTasks.map((t) => (
                  <th
                    key={t}
                    className={current?.task === t ? styles.colHighlight : ""}
                  >
                    T{t + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visEmps.map((emp) => (
                <tr key={emp}>
                  <td
                    className={`${styles.rowHeader} ${
                      current?.employee === emp ? styles.rowHighlight : ""
                    }`}
                  >
                    E{emp + 1}
                  </td>
                  {visTasks.map((task) => {
                    const isActive  = current?.employee === emp && current?.task === task;
                    const isDone    = assignedSoFar[emp] === task;
                    const isCurrent = current?.employee === emp && !isActive;
                    return (
                      <td
                        key={task}
                        className={[
                          styles.cell,
                          isActive  ? styles.cellActive  : "",
                          isDone && !isActive ? styles.cellDone : "",
                          isCurrent ? styles.cellRow   : "",
                          current?.candidates?.some(([t]) => t === task) && !isActive
                            ? styles.cellCandidate
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        ${costMatrix[emp]?.[task] ?? "?"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.matrixNote}>
            Showing rows {empStart + 1}–{empStart + visEmps.length} &middot; cols {taskStart + 1}–{taskStart + visTasks.length}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className={styles.controls}>
        <button className={`btn btn-ghost ${styles.ctrlBtn}`} onClick={restart} title="Restart">
          ↺
        </button>
        <button className={`btn ${playing ? "btn-warning" : "btn-success"} ${styles.ctrlBtn}`} onClick={togglePlay}>
          {playing ? "⏸ Pause" : "▶ Play"}
        </button>
        <button className={`btn btn-ghost ${styles.ctrlBtn}`} onClick={skipToEnd} title="Skip to end">
          ⏭ Skip
        </button>
      </div>

      {/* Final result (shown when done) */}
      {stepIdx === steps.length - 1 && (
        <div className={styles.finalResult}>
          <span className={styles.finalLabel}>Final Cost</span>
          <span className={styles.finalCost}>${result.total_cost}</span>
          <span className={styles.finalTime}>{result.time_ms.toFixed(4)} ms</span>
        </div>
      )}
    </div>
  );
}
