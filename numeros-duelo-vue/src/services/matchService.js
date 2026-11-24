// Comunicação com a MockAPI (recurso "partidas"). É o ÚNICO arquivo que faz
// fetch para ela: os componentes só chamam estas funções.
//
//   GET    /partidas        -> listMatches()
//   POST   /partidas        -> createMatch(dados)
//   PUT    /partidas/:id    -> updateMatch(id, dados)
//   DELETE /partidas/:id    -> deleteMatch(id)
//
// Campos de uma partida: id (gerado pela MockAPI), playerName, owner (usuário
// dono do registro), gameMode, score, result, date (string ISO) e origin
// ("auto" = gerada pelo jogo; "manual" = cadastrada/editada pelo admin).

import { MATCHES_URL, isMockApiConfigured } from "../config.js";

export const GAME_MODES = ["Solo", "Local", "Online"];
export const RESULTS = ["Victory", "Defeat", "Record"];

async function request(path = "", options = {}) {
  if (!isMockApiConfigured()) {
    throw new Error("A URL da MockAPI ainda não foi configurada. Defina VITE_MOCKAPI_URL no arquivo .env (veja o README).");
  }

  let response;
  try {
    response = await fetch(`${MATCHES_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
  } catch {
    throw new Error("Não foi possível conectar à MockAPI. Verifique sua internet e a URL configurada.");
  }

  if (!response.ok) {
    const error = new Error(
      response.status === 404
        ? "Registro ou recurso 'partidas' não encontrado na MockAPI."
        : `A MockAPI respondeu com erro ${response.status}.`
    );
    error.status = response.status;
    throw error;
  }

  return response.status === 204 ? null : response.json();
}

// Só envia à API os campos que fazem parte do cadastro (e com o tipo certo).
function toPayload(match) {
  const playerName = String(match.playerName).trim();
  return {
    playerName,
    // Dono do registro: a conta que enxerga esta partida no histórico.
    owner: String(match.owner || playerName).trim(),
    gameMode: match.gameMode,
    score: Number(match.score),
    result: match.result,
    date: match.date,
    // "manual" = cadastrada/editada pelo admin; não conta para os títulos.
    origin: match.origin === "manual" ? "manual" : "auto",
  };
}

function normalize(match) {
  return { ...match, score: Number(match.score) || 0 };
}

// GET — lista as partidas. Com `owner`, devolve só as dessa conta (é o que o
// usuário comum usa); sem `owner`, devolve todas (só o admin chama assim).
export async function listMatches(owner = "") {
  try {
    const data = await request(owner ? `?owner=${encodeURIComponent(owner)}` : "");
    const list = Array.isArray(data) ? data.map(normalize) : [];
    // A busca da MockAPI compara por trecho; garantimos o nome exato aqui.
    return owner ? list.filter((m) => String(m.owner || "").toLowerCase() === owner.toLowerCase()) : list;
  } catch (error) {
    // A MockAPI pode responder 404 quando o recurso ainda não tem registros;
    // para a interface isso é apenas "lista vazia".
    if (error.status === 404) return [];
    throw error;
  }
}

// POST — cadastra e devolve o registro criado (já com o id gerado).
export async function createMatch(match) {
  return normalize(await request("", { method: "POST", body: JSON.stringify(toPayload(match)) }));
}

// PUT — altera e devolve o registro atualizado.
export async function updateMatch(id, match) {
  return normalize(await request(`/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(toPayload(match)) }));
}

// DELETE — remove o registro.
export async function deleteMatch(id) {
  return request(`/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// Rótulos exibidos na interface (o que vai para a API continua em inglês).
export const MODE_LABELS = { Solo: "Solo", Local: "Local", Online: "Online" };
export const RESULT_LABELS = { Victory: "Vitória", Defeat: "Derrota", Record: "Recorde" };
