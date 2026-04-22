const BASE = "http://localhost:8000/api";

export async function fetchNewRound(n = null) {
  const query = new URLSearchParams();
  if (n) query.append("n", n);
  query.append("t", Date.now()); // cache buster
  const res = await fetch(`${BASE}/round/new?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch new round");
  return res.json();
}

export async function solveRound(payload) {
  const res = await fetch(`${BASE}/round/solve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to solve round");
  return res.json();
}

export async function fetchHistory() {
  const res = await fetch(`${BASE}/rounds`);
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

export async function updatePlayerName(roundIds, playerName) {
  const res = await fetch(`${BASE}/rounds/update-player-name`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ round_ids: roundIds, player_name: playerName }),
  });
  if (!res.ok) throw new Error("Failed to update player name");
  return res.json();
}
