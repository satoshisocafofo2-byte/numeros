import { getTopScores } from "./_store.js";

export default async function handler(req, res) {
  const limitRaw = parseInt(req.query.limit, 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 20;

  try {
    const scores = await getTopScores(limit);
    if (scores === null) {
      res.status(200).json({ unconfigured: true });
      return;
    }
    res.status(200).json(scores);
  } catch (err) {
    console.error("leaderboard error:", err);
    const detail = err && err.message ? ` (${err.message})` : "";
    res.status(500).json({ ok: false, error: `Erro ao carregar o ranking${detail}` });
  }
}
