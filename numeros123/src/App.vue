<script setup>
// App.vue: navegação entre as telas + música de fundo (que continua tocando
// ao trocar de tela). Cada tela é um componente; o motor do jogo (Board) fica
// em game/Board.js, idêntico ao do projeto original.
import { ref, onMounted } from "vue";
import MainMenu from "./components/MainMenu.vue";
import LocalGame from "./components/LocalGame.vue";
import SoloGame from "./components/SoloGame.vue";
import OnlineGame from "./components/OnlineGame.vue";
import RankingScreen from "./components/RankingScreen.vue";
import MatchHistory from "./components/MatchHistory.vue";
import LoginScreen from "./components/LoginScreen.vue";
import { useAuth } from "./composables/useAuth.js";

const { isLoggedIn, signOut } = useAuth();

const screen = ref("menu"); // menu | local | solo | online | ranking | history

/* ----- Música de fundo (mesmo comportamento do original) ----- */
const bgm = ref(null);
const muted = ref(false);
function logout() {
  signOut();
  screen.value = "menu"; // o próximo login sempre começa no menu
}

const musicSrc = `${import.meta.env.BASE_URL}assets/audio/theme.mp3`;
let musicStarted = false;

function ensureMusic() {
  const audio = bgm.value;
  if (!audio || musicStarted || audio.muted) return;
  musicStarted = true;
  audio.volume = 0.35;
  audio.play().catch(() => {
    // o navegador pode bloquear autoplay até haver um gesto do usuário;
    // o listener de pointerdown abaixo cobre esse caso.
    musicStarted = false;
  });
}

function toggleMute() {
  const audio = bgm.value;
  audio.muted = !audio.muted;
  muted.value = audio.muted;
  if (!audio.muted) ensureMusic();
}

onMounted(() => {
  document.body.addEventListener("pointerdown", ensureMusic, { once: true });
});
</script>

<template>
  <audio ref="bgm" loop preload="auto" :src="musicSrc"></audio>

  <LoginScreen v-if="!isLoggedIn" />
  <MainMenu v-else-if="screen === 'menu'" :muted="muted" @navigate="screen = $event" @toggle-mute="toggleMute" @logout="logout" />
  <LocalGame v-else-if="screen === 'local'" @back="screen = 'menu'" />
  <SoloGame v-else-if="screen === 'solo'" @back="screen = 'menu'" />
  <OnlineGame v-else-if="screen === 'online'" @back="screen = 'menu'" />
  <RankingScreen v-else-if="screen === 'ranking'" @back="screen = 'menu'" />
  <MatchHistory v-else-if="screen === 'history'" @back="screen = 'menu'" />
</template>
