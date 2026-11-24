import { reactive, computed } from "vue";
import { useAuth } from "./useAuth.js";
import { syncTitles, equipTitle } from "../services/titleService.js";
import { TITLES } from "../game/titles.js";

// Estado compartilhado dos títulos: o menu e a tela de Títulos enxergam o mesmo.
// A checagem automática é espaçada (não repete a cada troca de tela).
const THROTTLE_MS = 15000;

const state = reactive({
  username: "",
  unlocked: {}, // { id: data de desbloqueio }
  equipped: "",
  progress: {},
  loading: false,
  saving: false,
  error: "",
  loadedAt: 0,
});

export function useTitles() {
  const { user } = useAuth();

  const equippedTitle = computed(() => {
    if (!user.value || state.username !== user.value.username) return null;
    return TITLES.find((t) => t.id === state.equipped) || null;
  });

  // Confere o que o jogador desbloqueou e devolve os títulos NOVOS.
  async function sync(force = false) {
    const u = user.value;
    if (!u) return [];
    if (state.username !== u.username) {
      Object.assign(state, { username: u.username, unlocked: {}, equipped: "", progress: {}, loadedAt: 0, error: "" });
    }
    if (state.loading || (!force && Date.now() - state.loadedAt < THROTTLE_MS)) return [];

    state.loading = true;
    state.error = "";
    try {
      const result = await syncTitles(u);
      state.unlocked = result.unlocked;
      state.equipped = result.equipped;
      state.progress = result.progress;
      state.loadedAt = Date.now();
      return result.newly.map((id) => TITLES.find((t) => t.id === id)).filter(Boolean);
    } catch (e) {
      state.error = e.message;
      return [];
    } finally {
      state.loading = false;
    }
  }

  // Equipa um título (ou "" para remover). Só um fica equipado por vez.
  async function equip(id) {
    state.saving = true;
    state.error = "";
    try {
      state.equipped = await equipTitle(user.value, id);
    } catch (e) {
      state.error = e.message;
    } finally {
      state.saving = false;
    }
  }

  return { state, equippedTitle, sync, equip };
}
