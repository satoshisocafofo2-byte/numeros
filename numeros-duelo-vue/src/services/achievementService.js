// Conquistas do jogador logado. Os desbloqueios em si NÃO são gravados em
// lugar nenhum: são calculados do histórico de partidas (MockAPI), então
// sempre refletem o que está salvo lá. O localStorage guarda apenas quais
// conquistas o jogador JÁ VIU, só para avisar "desbloqueou!" uma única vez.

import { listMatches } from "./matchService.js";
import { evaluate } from "../game/achievements.js";

const seenKey = (username) => `nd_seen_ach_${String(username).toLowerCase()}`;

function readSeen(username) {
  try {
    const raw = localStorage.getItem(seenKey(username));
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeSeen(username, ids) {
  try {
    localStorage.setItem(seenKey(username), JSON.stringify(ids));
  } catch {
    // armazenamento indisponível: só deixamos de avisar o desbloqueio
  }
}

const unlockedIds = (list) => list.filter((a) => a.unlocked).map((a) => a.id);

export async function loadAchievements(username) {
  return evaluate(await listMatches(username), username);
}

// Chamado ao abrir o menu: neste aparelho, o que já estava desbloqueado
// conta como "visto" (não vira aviso de novidade).
export async function primeSeen(username) {
  if (readSeen(username) !== null) return;
  writeSeen(username, unlockedIds(await loadAchievements(username)));
}

// Chamado depois de salvar uma partida: devolve só as conquistas NOVAS.
export async function checkNewAchievements(username) {
  const list = await loadAchievements(username);
  const seen = readSeen(username);
  writeSeen(username, unlockedIds(list));
  if (seen === null) return [];
  return list.filter((a) => a.unlocked && !seen.includes(a.id));
}

export function markAllSeen(username, list) {
  writeSeen(username, unlockedIds(list));
}
