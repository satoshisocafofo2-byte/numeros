// Ranking Global: continua usando o backend original (funções serverless em
// /api, com Supabase). O Histórico de Partidas, por outro lado, usa a MockAPI
// (veja matchService.js).

export async function fetchLeaderboard(limit = 20) {
  const res = await fetch(`/api/leaderboard?limit=${limit}`);
  return res.json();
}

export async function submitScore(name, score) {
  const res = await fetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, score }),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}
