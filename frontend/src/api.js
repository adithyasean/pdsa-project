const BASE = "http://localhost:8000/api";

export async function fetchNewRound() {
  const res = await fetch(`${BASE}/round/new`);
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
