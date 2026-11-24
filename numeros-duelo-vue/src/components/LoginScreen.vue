<script setup>
// Tela de entrada: alterna entre "Entrar" e "Criar conta". Quem fala com a
// MockAPI é o authService (via useAuth); aqui só há formulário e mensagens.
import { ref } from "vue";
import { useAuth } from "../composables/useAuth.js";
import { USERNAME_RE, MIN_PASSWORD_LENGTH } from "../services/authService.js";

const { signIn, signUp } = useAuth();

const mode = ref("login"); // login | register
const username = ref("");
const password = ref("");
const confirm = ref("");
const error = ref("");
const busy = ref(false);

function switchMode(next) {
  mode.value = next;
  error.value = "";
  password.value = "";
  confirm.value = "";
}

async function submit() {
  error.value = "";
  const name = username.value.trim();

  if (!name || !password.value) {
    error.value = "Preencha usuário e senha.";
    return;
  }
  if (mode.value === "register") {
    if (!USERNAME_RE.test(name)) {
      error.value = "Usuário: 3 a 24 caracteres (letras, números, ponto, hífen ou sublinhado).";
      return;
    }
    if (password.value.length < MIN_PASSWORD_LENGTH) {
      error.value = `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
      return;
    }
    if (password.value !== confirm.value) {
      error.value = "As senhas não conferem.";
      return;
    }
  }

  busy.value = true;
  try {
    if (mode.value === "login") await signIn(name, password.value);
    else await signUp(name, password.value);
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="screen active">
    <div class="bg-glow"></div>
    <form class="card login-card" novalidate @submit.prevent="submit">
      <h1 class="title">Números em Duelo</h1>
      <p class="subtitle">{{ mode === "login" ? "Entre na sua conta" : "Crie sua conta" }}</p>

      <div class="form-field">
        <label for="lg-user">Usuário</label>
        <input id="lg-user" v-model="username" class="field-input" type="text" autocomplete="username" autocapitalize="off" maxlength="24" />
      </div>

      <div class="form-field">
        <label for="lg-pass">Senha</label>
        <input id="lg-pass" v-model="password" class="field-input" type="password" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" />
      </div>

      <div v-if="mode === 'register'" class="form-field">
        <label for="lg-confirm">Repita a senha</label>
        <input id="lg-confirm" v-model="confirm" class="field-input" type="password" autocomplete="new-password" />
      </div>

      <p v-if="error" class="notice notice-error" role="alert">{{ error }}</p>

      <button type="submit" class="menu-btn btn-blue" :disabled="busy">
        {{ busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta" }}
      </button>

      <p class="login-switch">
        <template v-if="mode === 'login'">
          Não tem conta?
          <button type="button" class="link-btn" @click="switchMode('register')">Criar conta</button>
        </template>
        <template v-else>
          Já tem conta?
          <button type="button" class="link-btn" @click="switchMode('login')">Entrar</button>
        </template>
      </p>
    </form>
  </section>
</template>
