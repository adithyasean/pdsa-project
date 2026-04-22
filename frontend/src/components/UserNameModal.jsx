import { useState } from "react";
import styles from "./UserNameModal.module.css";

export default function UserNameModal({
  onSubmit,
  roundCount = null,
  isGameEnd = false,
  isStart = false,
  onPlayAgain = null,
}) {
  const [userName, setUserName] = useState("");
  const [taskCount, setTaskCount] = useState("random");
  const [customTaskCount, setCustomTaskCount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!isStart && !userName.trim()) return;

    const tasks = (isStart || isGameEnd) && taskCount === "custom" ? parseInt(customTaskCount, 10) : null;
    if (isStart && taskCount === "custom" && (!customTaskCount || tasks < 1 || tasks > 500)) {
      alert("Please enter a valid number between 1 and 500");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isStart) {
        await onSubmit(tasks);
      } else {
        await onSubmit(userName.trim());
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlayAgainAction = async () => {
    if (!userName.trim()) return;

    setIsSubmitting(true);
    try {
      await onPlayAgain(userName.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !isSubmitting) {
      const isTaskValid = !isStart || taskCount === "random" || 
        (taskCount === "custom" && customTaskCount && parseInt(customTaskCount, 10) >= 1);
      const isNameValid = isStart || userName.trim();

      if (isTaskValid && isNameValid) {
        handleSubmit();
      }
    }
  };

  const isFormValid = isStart 
    ? (taskCount === "random" || (taskCount === "custom" && customTaskCount && parseInt(customTaskCount, 10) >= 1))
    : userName.trim().length > 0;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          {isGameEnd ? (
            <>
              <h2>🎉 Game Over!</h2>
              <p>You completed {roundCount} rounds</p>
              <p className={styles.subtitle}>Enter your name to save your session</p>
            </>
          ) : isStart ? (
            <>
              <h2>🚀 New Session</h2>
              <p>How many tasks would you like to assign?</p>
            </>
          ) : (
            <>
              <h2>Welcome</h2>
              <p>Enter your details</p>
            </>
          )}

          {/* Player Name Input (Only at END) */}
          {!isStart && (
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
          )}

          {/* Task Count Selection (Only at START) */}
          {isStart && (
            <div className={styles.field}>
              <label className={styles.label}>Number of Tasks</label>
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
                  autoFocus
                />
              )}
            </div>
          )}

          {/* Buttons */}
          <div className={styles.buttonGroup}>
            <button
              className={`btn btn-primary ${styles.submitBtn}`}
              onClick={handleSubmit}
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? "Processing…" : isGameEnd ? "Submit & End" : "Start Game"}
            </button>
            {isGameEnd && onPlayAgain && (
              <button
                className={`btn btn-secondary ${styles.submitBtn}`}
                onClick={handlePlayAgainAction}
                disabled={isSubmitting || !isFormValid}
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
