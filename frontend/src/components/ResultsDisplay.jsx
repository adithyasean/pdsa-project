import styles from "./ResultsDisplay.module.css";

/**
 * Props
 * -----
 * solveData     – SolveResponse from API
 * highlightAlgo – "Greedy" | "Hungarian" | null — which algo was chosen this run
 * onNextRound   – callback to load a new puzzle
 */
export default function ResultsDisplay({ solveData, highlightAlgo, onNextRound }) {
  if (!solveData) return null;
  const { n, user_total_cost, results } = solveData;

  const greedy    = results.find((r) => r.algorithm_name === "Greedy");
  const hungarian = results.find((r) => r.algorithm_name === "Hungarian");
  const optimalCost = hungarian?.total_cost;

  const bestCost = Math.min(
    ...[greedy?.total_cost, hungarian?.total_cost, user_total_cost].filter((v) => v != null)
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.titleRow}>
        <h2>Results — N = {n}</h2>
        <button className="btn btn-primary" onClick={onNextRound}>
          New Puzzle →
        </button>
      </div>

      <div className={styles.cards}>
        {/* User's manual assignments (shown only if they made some) */}
        {user_total_cost != null && (
          <div className={`${styles.card} ${styles.user} ${user_total_cost === bestCost ? styles.winner : ""}`}>
            <span className={styles.algoIcon}>🧠</span>
            <span className={styles.label}>Your Assignment</span>
            <span className={styles.cost}>${user_total_cost.toLocaleString()}</span>
            <span className={styles.delta}>
              {user_total_cost === optimalCost
                ? "✅ Optimal!"
                : `+$${(user_total_cost - optimalCost).toLocaleString()} vs optimal`}
            </span>
          </div>
        )}

        {/* Greedy */}
        {greedy && (
          <div className={[
            styles.card,
            styles.greedy,
            highlightAlgo === "Greedy" ? styles.highlighted : "",
            greedy.total_cost === bestCost ? styles.winner : "",
          ].join(" ")}>
            <span className={styles.algoIcon}>⚡</span>
            <span className={styles.label}>Greedy</span>
            <span className={styles.cost}>${greedy.total_cost.toLocaleString()}</span>
            <span className={styles.time}>{greedy.time_ms.toFixed(4)} ms</span>
            <span className={styles.complexity}>O(n²) — heuristic</span>
            {greedy.total_cost === bestCost && <span className={styles.bestBadge}>Best</span>}
            {highlightAlgo === "Greedy" && (
              <span className={styles.chosenBadge}>Used this run</span>
            )}
          </div>
        )}

        {/* Hungarian */}
        {hungarian && (
          <div className={[
            styles.card,
            styles.hungarian,
            highlightAlgo === "Hungarian" ? styles.highlighted : "",
            hungarian.total_cost === bestCost ? styles.winner : "",
          ].join(" ")}>
            <span className={styles.algoIcon}>🏆</span>
            <span className={styles.label}>Hungarian</span>
            <span className={styles.cost}>${hungarian.total_cost.toLocaleString()}</span>
            <span className={styles.time}>{hungarian.time_ms.toFixed(4)} ms</span>
            <span className={styles.complexity}>O(n³) — optimal</span>
            {hungarian.total_cost === bestCost && <span className={styles.bestBadge}>Best</span>}
            {highlightAlgo === "Hungarian" && (
              <span className={styles.chosenBadge}>Used this run</span>
            )}
          </div>
        )}
      </div>

      {/* Comparison bar */}
      {greedy && hungarian && (
        <div className={styles.comparison}>
          <span className={styles.compLabel}>Greedy vs Optimal gap:</span>
          <span className={styles.compValue}>
            +${(greedy.total_cost - hungarian.total_cost).toLocaleString()}
            <span className={styles.compPct}>
              {" "}({(((greedy.total_cost - hungarian.total_cost) / hungarian.total_cost) * 100).toFixed(1)}% over optimal)
            </span>
          </span>
          <span className={styles.compSep}>·</span>
          <span className={styles.compLabel}>Speed advantage:</span>
          <span className={styles.compValue}>
            Greedy was {(hungarian.time_ms / greedy.time_ms).toFixed(1)}× faster
          </span>
        </div>
      )}
    </div>
  );
}
