import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchNewRound, solveRound, fetchHistory, updatePlayerName } from "../api";
import TimingChart from "./TimingChart";
import AlgoAnimation from "./AlgoAnimation";
import UserNameModal from "./UserNameModal";
import styles from "./MinimumCost.module.css";

const ANIM_SPEED = 120;

// Which assignment set to show on the main matrix
const VIEW_USER      = "user";
const VIEW_GREEDY    = "greedy";
const VIEW_HUNGARIAN = "hungarian";

export default function MinimumCost({ onBack }) {
  const [round, setRound]             = useState(null);
  const [userAssignment, setUserAssignment] = useState([]); // user's manual picks
  const [greedyResult, setGreedyResult]     = useState(null); // cached greedy solve
  const [hungarianResult, setHungarianResult] = useState(null); // cached hungarian solve
  const [animAlgo, setAnimAlgo]       = useState(null);  // "Greedy"|"Hungarian"|null — currently animating
  const [animDone, setAnimDone]       = useState(false);
  const [viewMode, setViewMode]       = useState(VIEW_USER); // what to show on main matrix
  const [animSpeed, setAnimSpeed]     = useState(ANIM_SPEED);
  const [history, setHistory]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [showSteps, setShowSteps]     = useState(null); // "Greedy"|"Hungarian"|null — steps log
  const [roundIds, setRoundIds]       = useState([]); // Track round IDs for game session
  const [roundCount, setRoundCount]   = useState(0); // Track number of rounds played
  const [showEndGameModal, setShowEndGameModal] = useState(false); // Show end-game modal
  const [showStartModal, setShowStartModal] = useState(true); // Show start modal to ask for username
  const [playerName, setPlayerName]   = useState(null); // Store player name for the session

  const loadHistory = useCallback(async () => {
    try { setHistory(await fetchHistory()); } catch { /* silent */ }
  }, []);

  const handleStartGameSubmit = useCallback(async (name, customN) => {
    setPlayerName(name);
    setShowStartModal(false);
    // Now load the first puzzle (with custom N if provided)
    try {
      let data = await fetchNewRound();
      if (customN) {
        data.n = customN;
        data.cost_matrix = Array(customN)
          .fill(null)
          .map(() => Array(customN).fill(null).map(() => Math.floor(Math.random() * 180) + 20));
      }
      setRound(data);
      setUserAssignment(Array(data.n).fill(null));
    } catch (e) {
      setError(e.message);
    }
    await loadHistory();
  }, [loadHistory]);

  const handleEndGameSubmit = useCallback(async (name) => {
    // Update player name
    setPlayerName(name);
    // Update all rounds with the player name
    if (roundIds.length > 0) {
      try {
        await updatePlayerName(roundIds, name);
        await loadHistory();
      } catch (e) {
        setError(e.message);
        return;
      }
    }
    // Reset and go back to menu
    setShowEndGameModal(false);
    setRoundIds([]);
    setRoundCount(0);
    setShowStartModal(true); // Show start modal again for new game
    onBack();
  }, [roundIds, loadHistory, onBack]);

  const handlePlayAgain = useCallback(async (name, customN) => {
    // Update player name
    setPlayerName(name);
    // Update all rounds with the player name
    if (roundIds.length > 0) {
      try {
        await updatePlayerName(roundIds, name);
        await loadHistory();
      } catch (e) {
        setError(e.message);
        return;
      }
    }
    // Reset for new game
    setShowEndGameModal(false);
    setRoundIds([]);
    setRoundCount(0);
    // Reset and load a new puzzle
    setRound(null);
    setUserAssignment([]);
    setGreedyResult(null);
    setHungarianResult(null);
    setAnimAlgo(null);
    setAnimDone(false);
    setViewMode(VIEW_USER);
    setShowSteps(null);

    // Load new puzzle (with custom N if provided)
    try {
      let data = await fetchNewRound();
      if (customN) {
        data.n = customN;
        data.cost_matrix = Array(customN)
          .fill(null)
          .map(() => Array(customN).fill(null).map(() => Math.floor(Math.random() * 180) + 20));
      }
      setRound(data);
      setUserAssignment(Array(data.n).fill(null));
    } catch (e) {
      setError(e.message);
    }
  }, [roundIds, loadHistory]);

  const loadNewPuzzle = useCallback(async () => {
    setLoading(true);
    setError(null);
    setGreedyResult(null);
    setHungarianResult(null);
    setAnimAlgo(null);
    setAnimDone(false);
    setViewMode(VIEW_USER);
    setShowSteps(null);
    try {
      const data = await fetchNewRound();
      setRound(data);
      setUserAssignment(Array(data.n).fill(null));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMenuClick = useCallback(() => {
    // If user hasn't played any rounds, just go back
    if (roundCount === 0) {
      onBack();
      return;
    }
    // If they have rounds, ask if they want to submit
    const confirmed = window.confirm(
      `You've played ${roundCount} round(s). Do you want to submit your score before leaving?`
    );
    if (confirmed) {
      setShowEndGameModal(true);
    } else {
      // Reset and go back
      setRoundIds([]);
      setRoundCount(0);
      onBack();
    }
  }, [roundCount, onBack]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Clear user's manual picks but keep same puzzle & algo results
  const resetUserPicks = () => {
    if (!round) return;
    setUserAssignment(Array(round.n).fill(null));
    if (viewMode === VIEW_USER) setViewMode(VIEW_USER);
  };

  // Clear everything for this puzzle except the puzzle itself
  const resetAll = () => {
    if (!round) return;
    setUserAssignment(Array(round.n).fill(null));
    setGreedyResult(null);
    setHungarianResult(null);
    setAnimAlgo(null);
    setAnimDone(false);
    setViewMode(VIEW_USER);
    setShowSteps(null);
  };

  // ── Cell click (user's manual assignment) ────────────────────────────────
  const handleCellClick = (emp, task) => {
    if (animAlgo && !animDone) return; // lock during animation
    setViewMode(VIEW_USER);
    setUserAssignment((prev) => {
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

  // ── Solve with an algorithm — always from scratch ─────────────────────────
  const handleSolve = useCallback(async (algoName) => {
    if (!round) return;

    // If we already have both results cached, just replay the animation
    if (greedyResult && hungarianResult) {
      setAnimAlgo(algoName);
      setAnimDone(false);
      setViewMode(algoName === "Greedy" ? VIEW_GREEDY : VIEW_HUNGARIAN);
      setShowSteps(null);
      return;
    }

    setLoading(true);
    setError(null);
    setAnimDone(false);
    setShowSteps(null);

    try {
      // Always solve from scratch — no partial_assignment
      const result = await solveRound({ n: round.n, cost_matrix: round.cost_matrix, player_name: null });
      const g = result.results.find((r) => r.algorithm_name === "Greedy");
      const h = result.results.find((r) => r.algorithm_name === "Hungarian");
      setGreedyResult(g);
      setHungarianResult(h);
      setAnimAlgo(algoName);
      setViewMode(algoName === "Greedy" ? VIEW_GREEDY : VIEW_HUNGARIAN);

      // Track this round
      setRoundIds((prev) => [...prev, result.round_id]);
      setRoundCount((prev) => prev + 1);

      await loadHistory();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [round, greedyResult, hungarianResult, loadHistory]);

  const handleAnimDone = () => {
    setAnimDone(true);
  };

  // ── Derived: which assignment to show on the matrix ───────────────────────
  const displayAssignment = useMemo(() => {
    if (viewMode === VIEW_GREEDY    && greedyResult)    return greedyResult.assignment;
    if (viewMode === VIEW_HUNGARIAN && hungarianResult) return hungarianResult.assignment;
    return userAssignment;
  }, [viewMode, userAssignment, greedyResult, hungarianResult]);

  const displayTasks   = new Set(displayAssignment.filter((t) => t !== null));
  const userAssignedCount = userAssignment.filter((t) => t !== null).length;

  const userTotal = useMemo(() => {
    if (!round || userAssignedCount === 0) return null;
    return userAssignment.reduce((sum, task, emp) =>
      task !== null ? sum + round.cost_matrix[emp][task] : sum, 0
    );
  }, [userAssignment, round, userAssignedCount]);

  const allEmps  = round ? Array.from({ length: round.n }, (_, i) => i) : [];
  const allTasks = round ? Array.from({ length: round.n }, (_, i) => i) : [];

  // The result being animated
  const animResult = animAlgo === "Greedy" ? greedyResult : hungarianResult;

  // Steps log data
  const stepsLogResult = showSteps === "Greedy" ? greedyResult : hungarianResult;

  // Cell class helper
  const cellClass = (emp, task) => {
    const assigned = displayAssignment[emp] === task;
    const taken    = displayTasks.has(task) && !assigned;
    if (!assigned && !taken) return styles.cell;
    if (taken) return `${styles.cell} ${styles.cellTaken}`;
    if (viewMode === VIEW_GREEDY)    return `${styles.cell} ${styles.cellGreedy}`;
    if (viewMode === VIEW_HUNGARIAN) return `${styles.cell} ${styles.cellHungarian}`;
    return `${styles.cell} ${styles.cellSelected}`;
  };

  return (
    <div className={styles.page}>
      {showStartModal && (
        <UserNameModal
          onSubmit={handleStartGameSubmit}
          roundCount={null}
          isGameEnd={false}
          showTaskCount={true}
        />
      )}

      {showEndGameModal && (
        <UserNameModal
          onSubmit={handleEndGameSubmit}
          onPlayAgain={handlePlayAgain}
          roundCount={roundCount}
          isGameEnd={true}
        />
      )}

      {/* ── Header ── */}
      <div className={styles.header}>
        <button className="btn btn-ghost" onClick={handleMenuClick}>← Menu</button>
        <h1>Minimum Cost Assignment</h1>
        <div className={styles.headerActions}>
          {round && <span className={styles.matrixBadge}>{round.n} × {round.n}</span>}
          {roundCount > 0 && <span className={styles.roundBadge}>Rounds: {roundCount}</span>}
          <button className="btn btn-ghost" onClick={resetAll} disabled={loading || !round} title="Clear all assignments and results">
            ↺ Reset
          </button>
          <button className="btn btn-primary" onClick={loadNewPuzzle} disabled={loading}>
            {loading ? <><span className={styles.spinner} />Loading…</> : "New Puzzle"}
          </button>
          {roundCount > 0 && (
            <button
              className="btn btn-success"
              onClick={() => setShowEndGameModal(true)}
              disabled={loading}
              title="Submit your game session"
            >
              ✓ Submit Game ({roundCount})
            </button>
          )}
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
          {/* ── Toolbar ── */}
          <div className={styles.toolbar}>
            {/* Left: user stats */}
            <div className={styles.toolbarStats}>
              <div className={styles.statPill}>
                <span>My picks</span>
                <strong>{userAssignedCount} / {round.n}</strong>
              </div>
              {userTotal !== null && (
                <div className={`${styles.statPill} ${styles.statCost}`}>
                  <span>My total</span>
                  <strong>${userTotal.toLocaleString()}</strong>
                </div>
              )}
              {userAssignedCount > 0 && (
                <button
                  className={`btn btn-ghost ${styles.smallBtn}`}
                  onClick={resetUserPicks}
                  disabled={loading}
                >
                  Clear picks
                </button>
              )}
            </div>

            {/* Right: solve buttons */}
            <div className={styles.toolbarSolve}>
              <span className={styles.solveLabel}>Solve from scratch:</span>
              <button
                className={`btn ${styles.btnGreedy} ${animAlgo === "Greedy" && !animDone ? styles.btnActive : ""}`}
                onClick={() => handleSolve("Greedy")}
                disabled={loading}
                title="O(n²) — assigns each employee to the cheapest available task"
              >
                {loading && animAlgo !== "Hungarian" ? <span className={styles.spinner} /> : "⚡"} Greedy
              </button>
              <button
                className={`btn ${styles.btnHungarian} ${animAlgo === "Hungarian" && !animDone ? styles.btnActive : ""}`}
                onClick={() => handleSolve("Hungarian")}
                disabled={loading}
                title="O(n³) — globally optimal assignment"
              >
                {loading && animAlgo !== "Greedy" ? <span className={styles.spinner} /> : "🏆"} Hungarian
              </button>
            </div>
          </div>

          {/* ── View toggle tabs ── */}
          {(greedyResult || hungarianResult || userAssignedCount > 0) && (
            <div className={styles.viewTabs}>
              <span className={styles.viewTabsLabel}>View on matrix:</span>
              {userAssignedCount > 0 && (
                <button
                  className={`${styles.viewTab} ${viewMode === VIEW_USER ? styles.viewTabActive : ""} ${styles.viewTabUser}`}
                  onClick={() => setViewMode(VIEW_USER)}
                >
                  🧠 My Assignment {userTotal != null ? `($${userTotal.toLocaleString()})` : ""}
                </button>
              )}
              {greedyResult && (
                <button
                  className={`${styles.viewTab} ${viewMode === VIEW_GREEDY ? styles.viewTabActive : ""} ${styles.viewTabGreedy}`}
                  onClick={() => setViewMode(VIEW_GREEDY)}
                >
                  ⚡ Greedy (${greedyResult.total_cost.toLocaleString()})
                </button>
              )}
              {hungarianResult && (
                <button
                  className={`${styles.viewTab} ${viewMode === VIEW_HUNGARIAN ? styles.viewTabActive : ""} ${styles.viewTabHungarian}`}
                  onClick={() => setViewMode(VIEW_HUNGARIAN)}
                >
                  🏆 Hungarian (${hungarianResult.total_cost.toLocaleString()})
                </button>
              )}
            </div>
          )}

          {/* ── Main content: matrix + animation panel ── */}
          <div className={styles.mainContent}>
            {/* Cost matrix — full, scrolls in both directions */}
            <div className={styles.matrixSection}>
              <div className={styles.matrixWrapper}>
                <table className={styles.matrix}>
                  <thead>
                    <tr>
                      <th className={styles.cornerCell}>E \ T</th>
                      {allTasks.map((t) => (
                        <th key={t} className={displayTasks.has(t) ? styles.headerAssigned : ""}>
                          T{t + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allEmps.map((emp) => {
                      const assignedTask = displayAssignment[emp];
                      const rowCost = assignedTask !== null
                        ? round.cost_matrix[emp][assignedTask]
                        : null;
                      return (
                        <tr key={emp} className={assignedTask !== null ? styles.rowAssigned : ""}>
                          <td className={`${styles.rowHeader} ${assignedTask !== null ? styles.rowHeaderAssigned : ""}`}>
                            E{emp + 1}
                            {rowCost !== null && (
                              <span className={styles.rowCost}> ${rowCost}</span>
                            )}
                          </td>
                          {allTasks.map((task) => (
                            <td
                              key={task}
                              className={cellClass(emp, task)}
                              onClick={() => handleCellClick(emp, task)}
                              title={`E${emp + 1} → T${task + 1}: $${round.cost_matrix[emp][task]}`}
                            >
                              ${round.cost_matrix[emp][task]}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className={styles.hint}>
                {viewMode === VIEW_USER
                  ? "Click a cell to assign manually. Algorithm buttons solve the full puzzle independently."
                  : viewMode === VIEW_GREEDY
                  ? "Showing Greedy's assignment. Click a cell to switch back to your own picks."
                  : "Showing Hungarian's assignment. Click a cell to switch back to your own picks."}
              </p>
            </div>

            {/* Animation panel — only shown while animating */}
            {animAlgo && animResult && !animDone && (
              <div className={styles.animColumn}>
                <div className={styles.animTopBar}>
                  <span className={styles.animWatching}>
                    Watching {animAlgo} decide…
                  </span>
                  <div className={styles.speedControl}>
                    <label>Speed</label>
                    <input
                      type="range" min={20} max={600} step={10}
                      value={animSpeed}
                      onChange={(e) => setAnimSpeed(Number(e.target.value))}
                      className={styles.speedSlider}
                    />
                    <span className={styles.speedLabel}>
                      {animSpeed < 80 ? "Fast" : animSpeed < 250 ? "Normal" : "Slow"}
                    </span>
                  </div>
                </div>
                <AlgoAnimation
                  result={animResult}
                  costMatrix={round.cost_matrix}
                  speed={animSpeed}
                  onDone={handleAnimDone}
                />
              </div>
            )}
          </div>

          {/* ── Comparison panel (appears once any algo has been solved) ── */}
          {(greedyResult || hungarianResult) && (
            <div className={styles.comparison}>
              <h3 className={styles.compTitle}>Comparison</h3>
              <div className={styles.compCards}>
                {userTotal !== null && (
                  <div className={`${styles.compCard} ${styles.compUser}`}>
                    <span className={styles.compIcon}>🧠</span>
                    <span className={styles.compLabel}>Your picks</span>
                    <span className={styles.compCost}>${userTotal.toLocaleString()}</span>
                    <span className={styles.compSub}>{userAssignedCount}/{round.n} assigned</span>
                  </div>
                )}
                {greedyResult && (
                  <div className={`${styles.compCard} ${styles.compGreedy} ${viewMode === VIEW_GREEDY ? styles.compCardActive : ""}`}>
                    <span className={styles.compIcon}>⚡</span>
                    <span className={styles.compLabel}>Greedy</span>
                    <span className={styles.compCost}>${greedyResult.total_cost.toLocaleString()}</span>
                    <span className={styles.compSub}>{greedyResult.time_ms.toFixed(3)} ms · O(n²)</span>
                    <button
                      className={styles.compViewBtn}
                      onClick={() => { setViewMode(VIEW_GREEDY); setShowSteps("Greedy"); }}
                    >
                      View moves
                    </button>
                  </div>
                )}
                {hungarianResult && (
                  <div className={`${styles.compCard} ${styles.compHungarian} ${viewMode === VIEW_HUNGARIAN ? styles.compCardActive : ""}`}>
                    <span className={styles.compIcon}>🏆</span>
                    <span className={styles.compLabel}>Hungarian</span>
                    <span className={styles.compCost}>${hungarianResult.total_cost.toLocaleString()}</span>
                    <span className={styles.compSub}>{hungarianResult.time_ms.toFixed(3)} ms · O(n³) optimal</span>
                    <button
                      className={styles.compViewBtn}
                      onClick={() => { setViewMode(VIEW_HUNGARIAN); setShowSteps("Hungarian"); }}
                    >
                      View moves
                    </button>
                  </div>
                )}

                {/* Gap stats */}
                {greedyResult && hungarianResult && (
                  <div className={styles.compStats}>
                    <div className={styles.compStatRow}>
                      <span>Greedy over optimal</span>
                      <strong>+${(greedyResult.total_cost - hungarianResult.total_cost).toLocaleString()}
                        {" "}({(((greedyResult.total_cost - hungarianResult.total_cost) / hungarianResult.total_cost) * 100).toFixed(1)}%)
                      </strong>
                    </div>
                    <div className={styles.compStatRow}>
                      <span>Speed (Greedy faster by)</span>
                      <strong>{(hungarianResult.time_ms / greedyResult.time_ms).toFixed(1)}×</strong>
                    </div>
                    {userTotal !== null && hungarianResult && (
                      <div className={styles.compStatRow}>
                        <span>Your picks vs optimal</span>
                        <strong className={userTotal === hungarianResult.total_cost ? styles.optimal : styles.subOptimal}>
                          {userTotal === hungarianResult.total_cost
                            ? "✅ You matched optimal!"
                            : `+$${(userTotal - hungarianResult.total_cost).toLocaleString()} over optimal`}
                        </strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Steps log (shown after "View moves" clicked) ── */}
          {showSteps && stepsLogResult && (
            <div className={styles.stepsLog}>
              <div className={styles.stepsLogHeader}>
                <h3>
                  {showSteps === "Greedy" ? "⚡ Greedy" : "🏆 Hungarian"} — All {stepsLogResult.steps.length} Decisions
                </h3>
                <button className="btn btn-ghost" onClick={() => setShowSteps(null)}>✕ Close</button>
              </div>
              <div className={styles.stepsTable}>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Employee</th>
                      <th>→ Task</th>
                      <th>Cost</th>
                      <th>Running Total</th>
                      {showSteps === "Greedy" && <th>Top candidates considered</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {stepsLogResult.steps.map((step, i) => (
                      <tr key={i}>
                        <td className={styles.stepNum}>{i + 1}</td>
                        <td>E{step.employee + 1}</td>
                        <td className={styles.stepTask}>T{step.task + 1}</td>
                        <td className={styles.stepCost}>${step.cost}</td>
                        <td className={styles.stepTotal}>${step.running_total.toLocaleString()}</td>
                        {showSteps === "Greedy" && (
                          <td className={styles.stepCandidates}>
                            {step.candidates?.map(([t, c], ci) => (
                              <span key={t} className={`${styles.cand} ${t === step.task ? styles.candChosen : ""}`}>
                                {ci === 0 && t === step.task ? "✓ " : ""}T{t + 1}:${c}
                              </span>
                            ))}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── History chart ── */}
          {history.length > 1 && (
            <div className={`card ${styles.chartCard}`}>
              <h3>Algorithm Timing — Last {Math.min(Math.floor(history.length / 2), 20)} Rounds</h3>
              <TimingChart history={history} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
