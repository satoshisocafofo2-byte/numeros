// Títulos do jogador logado: lê/grava na MockAPI (recurso "usuarios", campos
// `titles` e `equippedTitle`) e calcula o que está desbloqueado.
//
// Persistência: os títulos desbloqueados e o equipado ficam salvos na conta,
// então continuam valendo depois de recarregar a página ou trocar de aparelho.
// Um título nunca é removido nem concedido duas vezes.

import { USERS_URL, isMockApiConfigured } from "../config.js";
import { listMatches } from "./matchService.js";
import { fetchLeaderboard } from "./rankingService.js";
import { evaluate } from "../game/achievements.js";
import { TITLES, TOP_RANK, countableMatches, evaluateTitles, mergeUnlocked, parseUnlocked, validEquipped } from "../game/titles.js";

const MISSING_FIELDS =
  "Faltam os campos 'titles' e 'equippedTitle' (String) no recurso 'usuarios' da MockAPI (veja o README).";

async function request(path, options = {}) {
  if (!isMockApiConfigured()) throw new Error("A URL da MockAPI ainda não foi configurada (veja o README).");
  let response;
  try {
    response = await fetch(`${USERS_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique sua internet.");
  }
  if (!response.ok) throw new Error(`O servidor respondeu com erro ${response.status}.`);
  return response.json();
}

function requireId(user) {
  if (!user || !user.id) throw new Error("Sessão antiga: saia e entre de novo para usar os títulos.");
  return encodeURIComponent(user.id);
}

// Lê a conta e devolve o que está guardado de títulos.
export async function loadStored(user) {
  const record = await request(`/${requireId(user)}`);
  const unlocked = parseUnlocked(record.titles);
  return { record, unlocked, equipped: validEquipped(record.equippedTitle, unlocked) };
}

// Grava títulos/equipado sem perder os outros campos da conta (hash, salt...):
// lê a conta de novo, mescla só o que mudou e confere se a API guardou.
async function persist(user, { added = {}, equipped } = {}) {
  const id = requireId(user);
  const fresh = await request(`/${id}`);
  const unlocked = mergeUnlocked(parseUnlocked(fresh.titles), added);
  const nextEquipped = equipped === undefined ? validEquipped(fresh.equippedTitle, unlocked) : validEquipped(equipped, unlocked);

  const saved = await request(`/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...fresh, titles: JSON.stringify(unlocked), equippedTitle: nextEquipped }),
  });
  // Se o campo não existe no recurso, a MockAPI o descarta: avisamos em vez de fingir que salvou.
  if (!("titles" in saved) || !("equippedTitle" in saved)) throw new Error(MISSING_FIELDS);
  return { unlocked, equipped: nextEquipped };
}

// Calcula tudo, grava os títulos NOVOS e devolve o estado completo.
export async function syncTitles(user) {
  const stored = await loadStored(user);

  const matches = countableMatches(await listMatches(user.username), user.username);
  const achievements = evaluate(matches, user.username);

  // O ranking global é opcional: sem ele, só os títulos de ranking ficam de fora.
  let ranking = null;
  try {
    const data = await fetchLeaderboard(TOP_RANK);
    if (Array.isArray(data)) ranking = data;
  } catch {
    ranking = null;
  }

  const progress = evaluateTitles({ matches, username: user.username, achievements, ranking });
  const added = {};
  for (const t of TITLES) {
    if (progress[t.id].unlocked && !stored.unlocked[t.id]) added[t.id] = progress[t.id].unlockedAt;
  }

  let { unlocked, equipped } = stored;
  if (Object.keys(added).length) ({ unlocked, equipped } = await persist(user, { added }));

  return { unlocked, equipped, progress, newly: Object.keys(added) };
}

// Equipa um título (ou "" para tirar). Só vale para título já desbloqueado.
export async function equipTitle(user, id) {
  const stored = await loadStored(user);
  if (id && !stored.unlocked[id]) throw new Error("Esse título ainda não foi desbloqueado.");
  const saved = await persist(user, { equipped: id || "" });
  return saved.equipped;
}
