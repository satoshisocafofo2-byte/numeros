<script setup>
// Menu principal. Só emite eventos: quem decide a tela é o App.vue.
import { onMounted, ref } from "vue";
import { useAuth } from "../composables/useAuth.js";
import { primeSeen } from "../services/achievementService.js";
import { useTitles } from "../composables/useTitles.js";

defineProps({ muted: { type: Boolean, default: false } });
defineEmits(["navigate", "toggle-mute", "logout"]);

const { user, isAdmin } = useAuth();
const { equippedTitle, sync: syncTitles } = useTitles();
const newTitles = ref([]); // títulos desbloqueados desde a última checagem

// Neste aparelho, conquistas que já existiam não viram aviso de novidade.
onMounted(() => {
  primeSeen(user.value.username).catch(() => {});
  // Checa os títulos ao abrir o menu (também cobre o retorno de uma partida).
  syncTitles().then((novos) => {
    newTitles.value = novos;
  });
});
</script>

<template>
  <section id="screen-menu" class="screen active">
    <div class="bg-glow"></div>
    <div class="card">
      <h1 class="title">Números em Duelo</h1>
      <p class="subtitle">Encaixe, funda e resista à pressão do adversário</p>

      <p class="user-line">
        Conectado como <strong>{{ user.username }}</strong>
        <span v-if="equippedTitle" class="badge title-badge">{{ equippedTitle.name }}</span>
        <span v-if="isAdmin" class="badge role-admin">Admin</span>
      </p>
      <p v-if="newTitles.length" class="notice notice-success" role="status">
        {{ newTitles.length > 1 ? "Títulos desbloqueados" : "Título desbloqueado" }}: {{ newTitles.map((t) => t.name).join(", ") }}
      </p>

      <div class="chips">
        <span class="chip" style="--chip-color:#3b82f6">2</span>
        <span class="chip" style="--chip-color:#22c55e">4</span>
        <span class="chip" style="--chip-color:#ef4444">8</span>
      </div>

      <button class="menu-btn btn-blue" @click="$emit('navigate', 'local')">Local</button>
      <button class="menu-btn btn-purple" @click="$emit('navigate', 'solo')">Solo</button>
      <button class="menu-btn btn-green" @click="$emit('navigate', 'online')">Online</button>
      <button class="menu-btn btn-amber" @click="$emit('navigate', 'ranking')">Ranking</button>
      <button class="menu-btn btn-blue" @click="$emit('navigate', 'achievements')">Conquistas</button>
      <button class="menu-btn btn-purple" @click="$emit('navigate', 'titles')">Títulos</button>
      <button class="menu-btn btn-red" @click="$emit('navigate', 'history')">Histórico</button>
      <button class="menu-btn btn-dark" @click="$emit('logout')">Sair</button>

      <p class="footer">Versão web · toque ou teclado</p>
    </div>

    <button class="mute-btn" :title="muted ? 'Ativar música' : 'Silenciar música'" @click="$emit('toggle-mute')">
      {{ muted ? "Som off" : "Som on" }}
    </button>
  </section>
</template>
