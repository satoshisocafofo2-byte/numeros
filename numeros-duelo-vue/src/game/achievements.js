// Catálogo e regras das conquistas. Tudo aqui é função pura: recebe o
// histórico de partidas (o mesmo que já é salvo na MockAPI, recurso
// "partidas") e devolve o que está desbloqueado, com a data. Como o estado
// é CALCULADO do histórico, não há contador que possa ficar inconsistente e
// as conquistas persistem após recarregar a página ou trocar de aparelho.
//
// Regras de contagem:
//  - Partidas e pontuação: toda partida da conta (Solo, Local e Online).
//  - Vitórias, derrotas e sequências: só Online (único modo com adversário
//    de verdade; no Local o "adversário" é a mesma pessoa).
//  - O 2º jogador do Local ("Convidado") e registros de outro nome (cadastro
//    manual do admin para outro jogador) não contam para esta conta.

// Valores ajustáveis num lugar só.
export const PERFECTIONIST_SCORE = 2000;
export const LIVING_LEGEND_SCORE = 1000;
export const SURVIVOR_MAX_SCORE = 300; // "vitória com pontuação baixa"
export const COLLECTOR_TARGET = 6;

export const RARITY_LABELS = { common: "Comum", rare: "Rara", epic: "Épica", legendary: "Lendária" };
export const CATEGORY_LABELS = { combat: "Combate", special: "Especiais" };

// `value(stats)` devolve o progresso atual; desbloqueia quando value >= target.
export const ACHIEVEMENTS = [
  { id: "first-blood", category: "combat", name: "Primeiro Sangue", description: "Vença sua primeira partida online.", rarity: "common", icon: "drop", target: 1, value: (s) => s.wins },
  { id: "veteran", category: "combat", name: "Veterano", description: "Complete 50 partidas.", rarity: "rare", icon: "chevrons", target: 50, value: (s) => s.matches },
  { id: "unstoppable", category: "combat", name: "Imparável", description: "Vença 10 partidas online seguidas.", rarity: "epic", icon: "bolt", target: 10, value: (s) => s.bestStreak },
  { id: "dominator", category: "combat", name: "Dominador", description: "Alcance 25 vitórias online.", rarity: "epic", icon: "star", target: 25, value: (s) => s.wins },
  { id: "arena-legend", category: "combat", name: "Lenda da Arena", description: "Alcance 100 vitórias online.", rarity: "legendary", icon: "trophy", target: 100, value: (s) => s.wins },
  { id: "perfectionist", category: "combat", name: "Perfeccionista", description: `Faça ${PERFECTIONIST_SCORE.toLocaleString("pt-BR")} pontos em uma partida.`, rarity: "epic", icon: "target", target: PERFECTIONIST_SCORE, value: (s) => s.bestScore },

  { id: "survivor", category: "special", name: "Sobrevivente", description: `Vença uma partida online com até ${SURVIVOR_MAX_SCORE} pontos.`, rarity: "rare", icon: "shield", target: 1, value: (s) => s.lowScoreWins },
  { id: "strategist", category: "special", name: "Estrategista", description: "Vença 5 partidas online seguidas.", rarity: "rare", icon: "flag", target: 5, value: (s) => s.bestStreak },
  { id: "living-legend", category: "special", name: "Lenda Viva", description: `Faça ${LIVING_LEGEND_SCORE.toLocaleString("pt-BR")} pontos em uma partida.`, rarity: "epic", icon: "crown", target: LIVING_LEGEND_SCORE, value: (s) => s.bestScore },
  { id: "collector", category: "special", name: "Colecionador", description: `Desbloqueie ${COLLECTOR_TARGET} outras conquistas.`, rarity: "rare", icon: "gem", target: COLLECTOR_TARGET, value: (s) => s.othersUnlocked },
  { id: "immortal", category: "special", name: "Imortal", description: "Alcance 500 vitórias online.", rarity: "legendary", icon: "infinity", target: 500, value: (s) => s.wins },
];

const same = (a, b) => String(a || "").toLowerCase() === String(b || "").toLowerCase();

function byTime(a, b) {
  const ta = Date.parse(a.date) || 0;
  const tb = Date.parse(b.date) || 0;
  return ta - tb || (Number(a.id) || 0) - (Number(b.id) || 0);
}

function emptyStats() {
  return { matches: 0, wins: 0, losses: 0, streak: 0, bestStreak: 0, bestScore: 0, lowScoreWins: 0, othersUnlocked: 0 };
}

function applyMatch(stats, match) {
  const score = Number(match.score) || 0;
  stats.matches += 1;
  stats.bestScore = Math.max(stats.bestScore, score);

  if (match.gameMode !== "Online") return;
  if (match.result === "Victory") {
    stats.wins += 1;
    stats.streak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
    if (score <= SURVIVOR_MAX_SCORE) stats.lowScoreWins += 1;
  } else {
    stats.losses += 1;
    stats.streak = 0;
  }
}

// Devolve o catálogo inteiro com: current, target, unlocked, unlockedAt.
export function evaluate(matches, username) {
  const mine = (matches || [])
    .filter((m) => same(m.owner, username) && same(m.playerName, username))
    .sort(byTime);

  const stats = emptyStats();
  const unlockedAt = {};

  const countOthers = () => ACHIEVEMENTS.filter((a) => a.id !== "collector" && unlockedAt[a.id]).length;

  function check(date) {
    // Primeiro as conquistas normais; "Colecionador" depende de quantas já saíram.
    for (const a of ACHIEVEMENTS) {
      if (a.id !== "collector" && !unlockedAt[a.id] && a.value(stats) >= a.target) unlockedAt[a.id] = date;
    }
    stats.othersUnlocked = countOthers();
    const collector = ACHIEVEMENTS.find((a) => a.id === "collector");
    if (!unlockedAt.collector && collector.value(stats) >= collector.target) unlockedAt.collector = date;
  }

  for (const match of mine) {
    applyMatch(stats, match);
    check(match.date);
  }
  stats.othersUnlocked = countOthers();

  return ACHIEVEMENTS.map((a) => ({
    id: a.id,
    category: a.category,
    name: a.name,
    description: a.description,
    rarity: a.rarity,
    icon: a.icon,
    target: a.target,
    current: Math.min(a.value(stats), a.target),
    unlocked: Boolean(unlockedAt[a.id]),
    unlockedAt: unlockedAt[a.id] || null,
  }));
}
