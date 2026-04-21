import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "game.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS game_rounds (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            n               INTEGER NOT NULL,
            player_name     TEXT,
            user_total_cost INTEGER,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS algorithm_results (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            round_id       INTEGER NOT NULL REFERENCES game_rounds(id),
            algorithm_name TEXT NOT NULL,
            total_cost     INTEGER NOT NULL,
            time_ms        REAL NOT NULL
        );
    """)
    # Migrate existing databases that lack the new columns
    for col, definition in [("player_name", "TEXT"), ("user_total_cost", "INTEGER")]:
        try:
            cursor.execute(f"ALTER TABLE game_rounds ADD COLUMN {col} {definition}")
        except Exception:
            pass
    conn.commit()
    conn.close()


def save_round(n: int, results: list[dict], player_name: str | None = None, user_total_cost: int | None = None) -> int:
    """Insert a game round and its algorithm results. Returns round id."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO game_rounds (n, player_name, user_total_cost) VALUES (?, ?, ?)",
        (n, player_name, user_total_cost),
    )
    round_id = cursor.lastrowid
    cursor.executemany(
        "INSERT INTO algorithm_results (round_id, algorithm_name, total_cost, time_ms) VALUES (?, ?, ?, ?)",
        [(round_id, r["algorithm_name"], r["total_cost"], r["time_ms"]) for r in results],
    )
    conn.commit()
    conn.close()
    return round_id


def get_all_rounds() -> list[dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            gr.id,
            gr.n,
            gr.player_name,
            gr.user_total_cost,
            gr.created_at,
            ar.algorithm_name,
            ar.total_cost,
            ar.time_ms
        FROM game_rounds gr
        JOIN algorithm_results ar ON ar.round_id = gr.id
        ORDER BY gr.id, ar.algorithm_name
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows
