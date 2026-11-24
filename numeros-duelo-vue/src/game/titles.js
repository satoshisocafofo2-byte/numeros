// Coleção oficial de títulos. Nomes e descrições em inglês, exatamente como
// definidos; o requisito é mostrado em português na interface.
//
// Tudo aqui é função pura: recebe o histórico de partidas (MockAPI), as
// conquistas e a posição no ranking, e diz o que está desbloqueado. Quem
// grava e lê do servidor é o titleService.js.
//
// Regras de contagem (as mesmas das conquistas):
//  - Partidas e pontuação: todos os modos.
//  - Vitórias, derrotas e sequências: só Online (único modo com adversário
//    de verdade). Derrota ou empate zera a sequência.
//  - Partidas cadastradas/editadas à mão pelo admin (origin = "manual") e
//    o "Convidado" do modo Local nunca contam.

export const TITLE_RARITY_LABELS = { common: "Comum", rare: "Rara", epic: "Épica", legendary: "Lendária", secret: "Secreto" };
export const TITLE_RARITY_ORDER = ["common", "rare", "epic", "legendary", "secret"];

export const BEYOND_THE_VOID_SCORE = 300000; // precisa ser ESTRITAMENTE maior
export const TOP_RANK = 10;

// kind: "stat" (vem do histórico), "achievements", "ranking" ou "unavailable".
// Títulos "unavailable" existem na coleção, mas dependem de dados que o
// projeto ainda não tem (veja `reason`); por isso nunca são desbloqueados.
export const TITLES = [
  // COMMON
  { id: "the-newblood", name: "The Newblood", description: "Every legend begins somewhere.", rarity: "common", requirement: "Vença sua primeira partida.", kind: "stat", stat: "wins", target: 1 },
  { id: "challenger", name: "Challenger", description: "You dared to step into the arena.", rarity: "common", requirement: "Complete 10 partidas.", kind: "stat", stat: "matches", target: 10 },
  { id: "lucky-one", name: "Lucky One", description: "Fortune favors those who refuse to surrender.", rarity: "common", requirement: "Passe a partida inteira perdendo e consiga virar o resultado no final.", kind: "unavailable", reason: "O jogo ainda não registra o placar durante a partida online, então não dá para provar que o jogador estava perdendo." },

  // RARE
  { id: "iron-will", name: "Iron Will", description: "An unbreakable spirit never backs down.", rarity: "rare", requirement: "Vença 10 partidas consecutivas.", kind: "stat", stat: "bestStreak", target: 10 },
  { id: "the-conqueror", name: "The Conqueror", description: "Victory is not given. It is taken.", rarity: "rare", requirement: "Alcance 50 vitórias.", kind: "stat", stat: "wins", target: 50 },
  { id: "the-vanguard", name: "The Vanguard", description: "Always the first to lead, never the last to fall.", rarity: "rare", requirement: "Seja o jogador com mais vitórias da sua guilda.", kind: "unavailable", reason: "Requer o sistema de guildas, que ainda não existe neste projeto." },

  // EPIC
  { id: "voidwalker", name: "Voidwalker", description: "You walk where others fear to go.", rarity: "epic", requirement: "Alcance 100 vitórias.", kind: "stat", stat: "wins", target: 100 },
  { id: "the-unforgiven", name: "The Unforgiven", description: "Mercy was never part of your game.", rarity: "epic", requirement: "Vença 20 partidas consecutivas.", kind: "stat", stat: "bestStreak", target: 20 },
  { id: "soul-reaper", name: "Soul Reaper", description: "Every victory leaves another legend behind.", rarity: "epic", requirement: "Alcance 150 vitórias.", kind: "stat", stat: "wins", target: 150 },
  { id: "king-of-ruins", name: "King of Ruins", description: "You rise where every other player falls.", rarity: "epic", requirement: "Complete 500 partidas.", kind: "stat", stat: "matches", target: 500 },
  { id: "apex-predator", name: "Apex Predator", description: "At the top of the food chain, there is only you.", rarity: "epic", requirement: "Alcance o Top 10 do ranking global.", kind: "ranking", maxRank: TOP_RANK },
  { id: "pillar-of-honor", name: "Pillar of Honor", description: "Your loyalty and dedication strengthen your guild.", rarity: "epic", requirement: "Seja o maior contribuidor de honra da sua guilda.", kind: "unavailable", reason: "Requer o sistema de guildas e o de honra, que ainda não existem neste projeto." },

  // LEGENDARY
  { id: "deathless", name: "Deathless", description: "Defeat has forgotten your name.", rarity: "legendary", requirement: "Alcance 50 vitórias sem perder uma partida nesse percurso.", kind: "stat", stat: "bestStreak", target: 50 },
  { id: "the-eternal-king", name: "The Eternal King", description: "Crowns are earned through endless victories.", rarity: "legendary", requirement: "Alcance 500 vitórias.", kind: "stat", stat: "wins", target: 500 },
  { id: "beyond-the-void", name: "Beyond the Void", description: "Numbers cannot measure the limits of your power.", rarity: "legendary", requirement: "Alcance mais de 300.000 pontos em uma partida.", kind: "stat", stat: "bestScore", target: BEYOND_THE_VOID_SCORE, strict: true },
  { id: "the-last-sovereign", name: "The Last Sovereign", description: "There can only be one ruler of the arena.", rarity: "legendary", requirement: "Alcance o primeiro lugar do ranking global.", kind: "ranking", maxRank: 1 },
  { id: "ascended", name: "Ascended", description: "You have transcended the limits of ordinary players.", rarity: "legendary", requirement: "Desbloqueie todas as conquistas de uma categoria.", kind: "achievements" },

  // SECRET / MYTHIC (requisito escondido até desbloquear)
  { id: "the-first", name: "The First", description: "Before the legends, there was you.", rarity: "secret", secret: true, requirement: "Seja o primeiro jogador a alcançar um marco global específico.", kind: "unavailable", reason: "O marco global ainda não foi definido e o jogo não tem como provar quem chegou primeiro." },
  { id: "authority-breaker", name: "Authority Breaker", description: "Even those who rule can be brought down.", rarity: "secret", secret: true, requirement: "Derrote um administrador oficial em uma partida válida.", kind: "unavailable", reason: "A partida não registra quem foi o adversário e o servidor online não confirma a identidade dele." },
];

const same = (a, b) => String(a || "").toLowerCase() === String(b || "").toLowerCase();

// Só entram partidas desta conta, geradas pelo jogo (não à mão pelo admin).
export function countableMatches(matches, username) {
  return (matches || []).filter(
    (m) => m.origin !== "manual" && same(m.owner, username) && same(m.playerName, username)
  );
}

function byTime(a, b) {
  const ta = Date.parse(a.date) || 0;
  const tb = Date.parse(b.date) || 0;
  return ta - tb || (Number(a.id) || 0) - (Number(b.id) || 0);
}

const reached = (title, value) => (title.strict ? value > title.target : value >= title.target);

// Posição (1 = primeiro) do jogador num ranking já ordenado; 0 se não está.
export function rankOf(username, ranking) {
  if (!Array.isArray(ranking)) return 0;
  const i = ranking.findIndex((e) => same(e && e.name, username));
  return i === -1 ? 0 : i + 1;
}

// Calcula o estado atual de todos os títulos.
//   ctx = { matches, username, achievements, ranking, now }
//   `achievements` = resultado de evaluate() das conquistas (já sobre as
//   partidas contáveis); `ranking` = lista ordenada do ranking global ou null.
// Devolve { [id]: { unlocked, unlockedAt, current, target, note } }.
export function evaluateTitles(ctx) {
  const { username, achievements, ranking } = ctx;
  const now = ctx.now || new Date().toISOString();
  const mine = countableMatches(ctx.matches, username).sort(byTime);

  const stats = { matches: 0, wins: 0, streak: 0, bestStreak: 0, bestScore: 0 };
  const result = {};
  for (const t of TITLES) result[t.id] = { unlocked: false, unlockedAt: null, current: 0, target: t.target || 0, note: "" };

  const markStats = (date) => {
    for (const t of TITLES) {
      if (t.kind !== "stat" || result[t.id].unlocked) continue;
      if (reached(t, stats[t.stat])) {
        result[t.id].unlocked = true;
        result[t.id].unlockedAt = date;
      }
    }
  };

  for (const m of mine) {
    stats.matches += 1;
    stats.bestScore = Math.max(stats.bestScore, Number(m.score) || 0);
    if (m.gameMode === "Online") {
      if (m.result === "Victory") {
        stats.wins += 1;
        stats.streak += 1;
        stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
      } else {
        stats.streak = 0; // derrota (ou empate) zera a sequência
      }
    }
    markStats(m.date);
  }

  for (const t of TITLES) {
    if (t.kind === "stat") result[t.id].current = Math.min(stats[t.stat], t.target);
  }

  // Ascended: todas as conquistas de UMA categoria desbloqueadas.
  const ascended = result.ascended;
  if (Array.isArray(achievements) && achievements.length) {
    const cats = {};
    for (const a of achievements) (cats[a.category] = cats[a.category] || []).push(a);
    let best = { done: 0, total: 1 };
    let completedAt = null;
    for (const items of Object.values(cats)) {
      const done = items.filter((a) => a.unlocked).length;
      if (done / items.length > best.done / best.total) best = { done, total: items.length };
      if (done === items.length) {
        const when = items.map((a) => a.unlockedAt).sort().pop();
        if (!completedAt || when < completedAt) completedAt = when;
      }
    }
    ascended.current = best.done;
    ascended.target = best.total;
    if (completedAt) {
      ascended.unlocked = true;
      ascended.unlockedAt = completedAt;
    }
  }

  // Ranking global (Top 10 / 1º lugar): vale a posição no momento da checagem.
  const rank = rankOf(username, ranking);
  for (const t of TITLES) {
    if (t.kind !== "ranking") continue;
    if (rank) result[t.id].note = `Posição atual: ${rank}º`;
    if (rank && rank <= t.maxRank) {
      result[t.id].unlocked = true;
      result[t.id].unlockedAt = now;
    }
  }

  return result;
}

/* ---------- Títulos guardados (campo "titles" do usuário, JSON) ---------- */

// Lê o que está guardado: { [id]: dataISO }. Ignora lixo e ids desconhecidos.
export function parseUnlocked(raw) {
  let data = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const known = new Set(TITLES.map((t) => t.id));
  const out = {};
  for (const [id, date] of Object.entries(data)) {
    if (known.has(id) && typeof date === "string") out[id] = date;
  }
  return out;
}

// Junta o que já estava guardado com o que acabou de ser desbloqueado.
// Um título nunca é concedido duas vezes: se já existe, mantém a data mais antiga.
export function mergeUnlocked(stored, added) {
  const out = { ...stored };
  for (const [id, date] of Object.entries(added || {})) {
    out[id] = out[id] && out[id] <= date ? out[id] : date;
  }
  return out;
}

// Só pode equipar título já desbloqueado.
export function validEquipped(id, unlocked) {
  return id && unlocked[id] ? id : "";
}
