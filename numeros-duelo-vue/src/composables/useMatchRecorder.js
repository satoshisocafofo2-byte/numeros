import { ref } from "vue";
import { createMatch } from "../services/matchService.js";
import { checkNewAchievements } from "../services/achievementService.js";

// Registra partidas finalizadas na MockAPI, sem nunca atrapalhar o jogo.
//
// - `record()` só funciona UMA vez por partida: se o evento de fim de jogo
//   disparar de novo, a segunda chamada é ignorada (sem registros duplicados).
// - Erros de rede viram uma mensagem em `status`; o jogo segue normalmente.
// - `reset()` libera um novo registro (ao reiniciar/jogar de novo).
export function useMatchRecorder() {
  const status = ref("");
  const state = ref("idle"); // idle | saving | ok | error
  const unlocked = ref([]); // conquistas novas desta partida
  let recorded = false;

  function reset() {
    recorded = false;
    status.value = "";
    state.value = "idle";
    unlocked.value = [];
  }

  // `build` pode devolver (ou resolver para) uma lista de partidas sem data.
  async function record(build) {
    if (recorded) return [];
    recorded = true;
    state.value = "saving";
    status.value = "Registrando no histórico...";
    try {
      const matches = await build();
      const date = new Date().toISOString();
      const created = await Promise.all(matches.map((m) => createMatch({ ...m, date })));
      state.value = "ok";
      status.value = "Partida registrada no histórico.";
      // Conquistas nunca atrapalham o registro: se falhar, só não avisa.
      try {
        const owner = created[0] && created[0].owner;
        if (owner) unlocked.value = await checkNewAchievements(owner);
      } catch {
        unlocked.value = [];
      }
      return created;
    } catch (error) {
      state.value = "error";
      status.value = `Não foi possível registrar no histórico: ${error.message}`;
      return [];
    }
  }

  return { status, state, unlocked, record, reset };
}
