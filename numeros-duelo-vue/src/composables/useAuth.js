import { ref, computed } from "vue";
import { login, register, loadSession, saveSession, clearSession } from "../services/authService.js";

// Estado compartilhado: todos os componentes enxergam o mesmo usuário logado.
const user = ref(loadSession());

export function useAuth() {
  const isLoggedIn = computed(() => Boolean(user.value));
  const isAdmin = computed(() => user.value?.role === "admin");

  async function signIn(username, password) {
    user.value = await login(username, password);
    saveSession(user.value);
  }

  async function signUp(username, password) {
    user.value = await register(username, password);
    saveSession(user.value);
  }

  function signOut() {
    user.value = null;
    clearSession();
  }

  return { user, isLoggedIn, isAdmin, signIn, signUp, signOut };
}
