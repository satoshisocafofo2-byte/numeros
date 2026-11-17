<script setup>
// Modo Solo. Ao terminar, a partida é registrada automaticamente no
// Histórico (MockAPI); o envio ao Ranking Global continua opcional e usa o
// backend original.
import { ref, onMounted, onBeforeUnmount } from "vue";
import { Board } from "../game/Board.js";
import { GAME_KEYS, NBSP, comboText } from "../game/helpers.js";
import { useAuth } from "../composables/useAuth.js";
import { useGameLoop } from "../composables/useGameLoop.js";
import { useMatchRecorder } from "../composables/useMatchRecorder.js";
import { listMatches } from "../services/matchService.js";
import { fetchLeaderboard, submitScore } from "../services/rankingService.js";

defineEmits(["back"]);

const canvas = ref(null);
const score = ref(0);
const combo = ref(0);
const recordText = ref("Recorde: carregando...");
const gameOverShown = ref(false);
const finalScore = ref(0);
const { user } = useAuth();
const submitStatus = ref("");
const submitting = ref(false);

const { status: saveStatus, record, reset: resetRecorder } = useMatchRecorder();

let board = null;

const loop = useGameLoop((dt) => {
  if (!board.gameOver) {
    // Reaproveita a fórmula de "pressão do adversário", usando o próprio
    // tempo de jogo como pressão: assim o solo também acelera.
    board.setOpponentScore(board.elapsed * 14);
  }
  board.update(dt);
  board.draw();
});

function syncUI() {
  score.value = board.score;
  combo.value = board.combo;
}

function onGameOver() {
  const final = board.score;
  finalScore.value = final;
  submitStatus.value = "";
  gameOverShown.value = true;

  // Registro automático no histórico. É "Record" quando supera a maior
  // pontuação Solo já registrada; senão, "Defeat" (todo solo termina com o
  // tabuleiro cheio). O recorder garante que só acontece uma vez por partida.
  record(async () => {
    const previous = await listMatches(user.value.username);
    const best = previous
      .filter((m) => m.gameMode === "Solo")
      .reduce((max, m) => Math.max(max, Number(m.score) || 0), 0);
    return [{
      playerName: user.value.username,
      owner: user.value.username,
      gameMode: "Solo",
      score: final,
      result: final > 0 && final > best ? "Record" : "Defeat",
    }];
  });
}

function onKeyDown(e) {
  if (!board) return;
  if (GAME_KEYS.includes(e.code)) e.preventDefault();
  switch (e.code) {
    case "KeyA": case "ArrowLeft": board.moveSide(-1); break;
    case "KeyD": case "ArrowRight": board.moveSide(1); break;
    case "KeyS": case "ArrowDown": board.softDrop(); break;
    case "KeyW": case "ArrowUp": board.hardDrop(); break;
  }
}

function playAgain() {
  gameOverShown.value = false;
  resetRecorder();
  board.reset();
  syncUI();
}

async function sendToRanking() {
  const name = user.value.username;
  submitting.value = true;
  submitStatus.value = "Enviando...";
  try {
    const { ok, data } = await submitScore(name, board.score);
    if (data && data.unconfigured) {
      submitStatus.value = "Ranking ainda não configurado neste servidor (veja o README).";
    } else if (!ok || !data.ok) {
      submitStatus.value = (data && data.error) || "Não foi possível enviar. Tente de novo.";
    } else {
      submitStatus.value = `Enviado! Você ficou em #${data.rank} no ranking.`;
    }
  } catch {
    submitStatus.value = "Sem conexão com o servidor de ranking.";
  }
  submitting.value = false;
}

async function loadRecord() {
  try {
    const data = await fetchLeaderboard(1);
    if (data && data.unconfigured) recordText.value = "Recorde: ranking não configurado";
    else if (Array.isArray(data) && data.length) recordText.value = `Recorde: ${data[0].name} - ${data[0].score}`;
    else recordText.value = "Recorde: seja o primeiro!";
  } catch {
    recordText.value = "Recorde: indisponível";
  }
}

onMounted(() => {
  board = new Board(canvas.value);
  board.onScoreChanged = syncUI;
  board.onGameOver = onGameOver;
  syncUI();
  window.addEventListener("keydown", onKeyDown);
  loop.start();
  loadRecord();
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeyDown);
});
</script>

<template>
  <section id="screen-solo" class="screen active">
    <header class="topbar">
      <button class="back-btn" @click="$emit('back')">← Menu</button>
      <span class="record-label">{{ recordText }}</span>
    </header>

    <div class="boards-row single">
      <div class="board-panel wide" data-player="solo">
        <div class="panel-head">
          <span class="player-label">Pontuação</span>
          <span class="score-label">{{ score }}</span>
        </div>
        <div class="combo-label">{{ comboText(combo) }}</div>
        <canvas ref="canvas"></canvas>
        <p class="keys-hint">Setas ou A/D/S/W — ou toque na coluna onde a peça deve cair</p>
      </div>
    </div>

    <div class="overlay" :class="{ show: gameOverShown }">
      <div class="overlay-card">
        <h2>Fim de jogo!</h2>
        <p class="overlay-score">Pontuação final: {{ finalScore }}</p>
        <p class="overlay-score">Jogador: {{ user.username }}</p>
        <button class="menu-btn btn-amber small" :disabled="submitting" @click="sendToRanking">
          Enviar pontuação ao ranking
        </button>
        <p class="status">{{ submitStatus || NBSP }}</p>
        <p v-if="saveStatus" class="status">{{ saveStatus }}</p>
        <div class="overlay-actions">
          <button class="menu-btn btn-purple small" @click="playAgain">Jogar novamente</button>
          <button class="menu-btn btn-blue small" @click="$emit('back')">Voltar ao menu</button>
        </div>
      </div>
    </div>
  </section>
</template>
