import { submitScore } from "./_store.js";

const MAX_NAME_LENGTH = 24;
const MAX_SCORE = 10_000_000;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const body = req.body || {};
  const rawName = typeof body.name === "string" ? body.name.trim() : "";
  const name = (rawName || "Jogador").slice(0, MAX_NAME_LENGTH);
  const score = Math.floor(Number(body.score));

  if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) {
    res.status(400).json({ ok: false, error: "Pontuação inválida." });
    return;
  }

  try {
    const result = await submitScore(name, score);
    if (result === null) {
      res.status(200).json({ ok: true, unconfigured: true });
      return;
    }
    res.status(200).json({ ok: true, rank: result.rank });
  } catch (err) {
    console.error("score error:", err);
    const detail = err && err.message ? ` (${err.message})` : "";
    res.status(500).json({ ok: false, error: `Erro ao salvar a pontuação${detail}` });
  }
}
