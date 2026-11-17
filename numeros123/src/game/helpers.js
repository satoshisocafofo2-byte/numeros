// Constantes e funções pequenas compartilhadas pelas telas de jogo.

export const GAME_KEYS = ["KeyA", "KeyD", "KeyS", "KeyW", "ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp"];
export const MAX_NAME_LENGTH = 24;
export const NBSP = "\u00A0";

// Mesma fórmula do original: a barra de pressão vai de 0 a 100%.
export function pressurePercent(score) {
  return Math.min(100, Math.sqrt(Math.max(0, score)) * 4);
}

export function comboText(combo) {
  return combo > 1 ? `Combo x${combo}` : NBSP;
}

export function getSavedName() {
  try {
    return localStorage.getItem("nd_player_name") || "";
  } catch {
    return "";
  }
}

export function saveName(name) {
  try {
    localStorage.setItem("nd_player_name", name);
  } catch {
    // armazenamento indisponível (modo privado, etc.) — segue sem salvar
  }
}

export function cleanName(raw) {
  return (String(raw || "Jogador").trim().slice(0, MAX_NAME_LENGTH)) || "Jogador";
}
