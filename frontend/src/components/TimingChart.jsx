import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

export default function TimingChart({ history }) {
  const rounds = {};
  for (const row of history) {
    if (!rounds[row.id]) rounds[row.id] = { round: row.id, n: row.n, player: row.player_name || null };
    rounds[row.id][row.algorithm_name] = parseFloat(row.time_ms.toFixed(4));
  }
  const data = Object.values(rounds).slice(-20); // last 20 rounds

  return (
    <div style={{ width: "100%", height: 340 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="round"
            stroke="#94a3b8"
            label={{ value: "Round", position: "insideBottom", offset: -2, fill: "#94a3b8" }}
          />
          <YAxis stroke="#94a3b8" unit=" ms" width={72} />
          <Tooltip
            contentStyle={{ background: "#1e293b", border: "1px solid #334155" }}
            labelStyle={{ color: "#f1f5f9" }}
            labelFormatter={(label, payload) => {
              const entry = payload?.[0]?.payload;
              return entry?.player ? `Round ${label} · ${entry.player}` : `Round ${label}`;
            }}
            formatter={(v, name) => [`${v} ms`, name]}
          />
          <Legend wrapperStyle={{ color: "#94a3b8" }} />
          <Bar dataKey="Greedy"    fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Hungarian" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
