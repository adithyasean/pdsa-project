import { useState } from "react";
import styles from "./UserNameModal.module.css";

export default function UserNameModal({
  onSubmit,
  roundCount = null,
  isGameEnd = false,
  onPlayAgain = null,
  showTaskCount = false
}) {
  const [userName, setUserName] = useState("");
  const [taskCount, setTaskCount] = useState("random");
  const [customTaskCount, setCustomTaskCount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!userName.trim()) return;

    setIsSubmitting(true);
    try {
      const tasks = showTaskCount && taskCount === "custom" ? parseInt(customTaskCount, 10) : null;
      if (showTaskCount && taskCount === "custom" && (!customTaskCount || tasks < 1 || tasks > 500)) {
        alert("Please enter a valid number between 1 and 500");
        setIsSubmitting(false);
        return;
      }
      await onSubmit(userName.trim(), tasks);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlayAgain = async () => {
    if (!userName.trim()) return;

    const tasks = taskCount === "random" ? null : parseInt(customTaskCount, 10);
    if (taskCount === "custom" && (!customTaskCount || tasks < 1 || tasks > 500)) {
      alert("Please enter a valid number between 1 and 500");
      return;
    }

    setIsSubmitting(true);
    try {
      await onPlayAgain(userName.trim(), tasks);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && userName.trim() && !isSubmitting) {
      const isTaskCountValid = !showTaskCount || taskCount === "random" ||
        (taskCount === "custom" && customTaskCount && parseInt(customTaskCount, 10) >= 1 && parseInt(customTaskCount, 10) <= 500);

      if (isTaskCountValid) {
        if (isGameEnd && onPlayAgain) {
          handlePlayAgain();
        } else {
          handleSubmit();
        }
      }
    }
  };

  const isTaskCountValid =
    !showTaskCount || taskCount === "random" ||
    (taskCount === "custom" && customTaskCount && parseInt(customTaskCount, 10) >= 1 && parseInt(customTaskCount, 10) <= 500);

  const showTaskSelection = isGameEnd || showTaskCount;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          {isGameEnd ? (
            <>
              <h2>🎉 Game Over!</h2>
              <p>You completed {roundCount} rounds</p>
              <p className={styles.subtitle}>Enter your name to save your score</p>
            </>
          ) : (
            <>
              <h2>Welcome to Minimum Cost Assignment</h2>
              <p>Enter your name to begin</p>
            </>
          )}

          {/* Player Name Input */}
          <div className={styles.field}>
            <label htmlFor="userName" className={styles.label}>Player Name</label>
            <input
              id="userName"
              type="text"
              className={styles.input}
              placeholder="Your name…"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyPress={handleKeyPress}
              maxLength={50}
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          {/* Task Count Selection (only for game end or start) */}
          {showTaskSelection && (
            <div className={styles.field}>
              <label className={styles.label}>Number of Tasks {isGameEnd ? "for Next Game" : ""}</label>
              <div className={styles.taskOptions}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="taskCount"
                    value="random"
                    checked={taskCount === "random"}
                    onChange={(e) => setTaskCount(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <span>Random (50-100)</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="taskCount"
                    value="custom"
                    checked={taskCount === "custom"}
                    onChange={(e) => setTaskCount(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <span>Custom</span>
                </label>
              </div>
              {taskCount === "custom" && (
                <input
                  type="number"
                  className={styles.input}
                  placeholder="Enter number (1-500)"
                  value={customTaskCount}
                  onChange={(e) => setCustomTaskCount(e.target.value)}
                  min="1"
                  max="500"
                  disabled={isSubmitting}
                />
              )}
            </div>
          )}

          {/* Buttons */}
          <div className={styles.buttonGroup}>
            <button
              className={`btn btn-primary ${styles.submitBtn}`}
              onClick={handleSubmit}
              disabled={!userName.trim() || isSubmitting || !isTaskCountValid}
            >
              {isSubmitting ? "Saving…" : isGameEnd ? "Submit & End" : "Start Game"}
            </button>
            {isGameEnd && onPlayAgain && (
              <button
                className={`btn btn-secondary ${styles.submitBtn}`}
                onClick={handlePlayAgain}
                disabled={!userName.trim() || isSubmitting || !isTaskCountValid}
              >
                {isSubmitting ? "Starting…" : "Submit & Play Again"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
