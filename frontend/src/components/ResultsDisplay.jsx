import styles from "./ResultsDisplay.module.css";

/**
 * Props
 * -----
 * solveData  : SolveResponse from API
 * costMatrix : n x n array (to show cell values on hover)
 */
export default function ResultsDisplay({ solveData, onNextRound }) {
  if (!solveData) return null;
  const { n, user_total_cost, results } = solveData;

  const greedy    = results.find((r) => r.algorithm_name === "Greedy");
  const hungarian = results.find((r) => r.algorithm_name === "Hungarian");
  const optimalCost = hungarian?.total_cost;

  return (
    <div className={styles.wrapper}>
      <h2>Round Results — N = {n}</h2>

      <div className={styles.cards}>
        {user_total_cost != null && (
          <div className={`${styles.card} ${styles.user}`}>
            <span className={styles.label}>Your Assignment</span>
            <span className={styles.cost}>${user_total_cost}</span>
            <span className={styles.delta}>
              {user_total_cost === optimalCost
                ? "✅ Optimal!"
                : `+$${user_total_cost - optimalCost} vs optimal`}
            </span>
          </div>
        )}

        <div className={`${styles.card} ${styles.greedy}`}>
          <span className={styles.label}>Greedy</span>
          <span className={styles.cost}>${greedy?.total_cost}</span>
          <span className={styles.time}>{greedy?.time_ms.toFixed(4)} ms</span>
          <span className={styles.complexity}>O(n²)</span>
        </div>

        <div className={`${styles.card} ${styles.hungarian}`}>
          <span className={styles.label}>Hungarian</span>
          <span className={styles.cost}>${hungarian?.total_cost}</span>
          <span className={styles.time}>{hungarian?.time_ms.toFixed(4)} ms</span>
          <span className={styles.complexity}>O(n³) — Optimal</span>
        </div>
      </div>

      <button className="btn btn-primary" onClick={onNextRound}>
        Next Round →
      </button>
    </div>
  );
}
