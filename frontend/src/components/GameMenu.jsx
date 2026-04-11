import styles from "./GameMenu.module.css";

export default function GameMenu({ onSelect }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>⚡</span>
        <h1>PDSA Game Suite</h1>
        <p>Algorithm Challenges</p>
      </div>

      <div className={styles.menuGrid}>
        <button className={styles.menuCard} onClick={() => onSelect("minimum-cost")}>
          <span className={styles.menuIcon}>💰</span>
          <h2>Minimum Cost</h2>
          <p>Assign N employees to N tasks at the lowest total cost using Greedy &amp; Hungarian algorithms.</p>
          <span className={styles.badge}>Active</span>
        </button>

        <button className={styles.menuCard} disabled>
          <span className={styles.menuIcon}>🎲</span>
          <h2>Dice Game</h2>
          <p>Coming soon.</p>
          <span className={`${styles.badge} ${styles.badgeLocked}`}>Locked</span>
        </button>
      </div>
    </div>
  );
}
