<script setup>
// Modo Local (2 jogadores no mesmo teclado). A lógica das peças vive no Board
// (game/Board.js); aqui só ligamos os dois tabuleiros ao Vue: canvas por
// template ref, placar/combo/pressão em estado reativo.
import { ref, onMounted, onBeforeUnmount } from "vue";
import { Board } from "../game/Board.js";
import { GAME_KEYS, NBSP, comboText, pressurePercent } from "../game/helpers.js";
import { useGameLoop } from "../composables/useGameLoop.js";
import { useMatchRecorder } from "../composables/useMatchRecorder.js";
import { useAuth } from "../composables/useAuth.js";

defineEmits(["back"]);

const canvas1 = ref(null);
const canvas2 = ref(null);
const score1 = ref(0);
const score2 = ref(0);
const combo1 = ref(0);
const combo2 = ref(0);
const pressure1 = ref(0);
const pressure2 = ref(0);
const message = ref("");

const { user } = useAuth();
const { status: saveStatus, record, reset: resetRecorder } = useMatchRecorder();

// Os tabuleiros ficam fora do estado reativo de propósito (são só o motor).
let board1 = null;
let board2 = null;

const loop = useGameLoop((dt) => {
  board1.update(dt);
  board2.update(dt);
  board1.draw();
  board2.draw();
});

function syncUI() {
  score1.value = board1.score;
  score2.value = board2.score;
  combo1.value = board1.combo;
  combo2.value = board2.combo;
  // A barra de pressão de cada um mostra a pontuação do ADVERSÁRIO.
  pressure1.value = pressurePercent(board2.score);
  pressure2.value = pressurePercent(board1.score);
}

function onScoreChanged(player) {
  syncUI();
  if (player === 1) board2.setOpponentScore(board1.score);
  else board1.setOpponentScore(board2.score);
}

function onGameOver(player) {
  const winner = player === 1 ? 2 : 1;
  message.value = `Jogador ${player} empilhou até o topo! Jogador ${winner} venceu (${board1.score} x ${board2.score}).`;

  // Registro no histórico: só o PRIMEIRO fim de jogo conta (o recorder ignora
  // chamadas repetidas), então nada é duplicado.
  record(() => [
    { playerName: user.value.username, owner: user.value.username, gameMode: "Local", score: board1.score, result: player === 1 ? "Defeat" : "Victory" },
    { playerName: "Convidado", owner: user.value.username, gameMode: "Local", score: board2.score, result: player === 2 ? "Defeat" : "Victory" },
  ]);
}

function onKeyDown(e) {
  if (!board1 || !board2) return;
  if (GAME_KEYS.includes(e.code)) e.preventDefault();
  switch (e.code) {
    case "KeyA": board1.moveSide(-1); break;
    case "KeyD": board1.moveSide(1); break;
    case "KeyS": board1.softDrop(); break;
    case "KeyW": board1.hardDrop(); break;
    case "ArrowLeft": board2.moveSide(-1); break;
    case "ArrowRight": board2.moveSide(1); break;
    case "ArrowDown": board2.softDrop(); break;
    case "ArrowUp": board2.hardDrop(); break;
  }
}

function restart() {
  if (!board1 || !board2) return;
  board1.reset();
  board2.reset();
  message.value = "";
  resetRecorder();
  syncUI();
}

onMounted(() => {
  board1 = new Board(canvas1.value);
  board2 = new Board(canvas2.value);
  board1.onScoreChanged = () => onScoreChanged(1);
  board2.onScoreChanged = () => onScoreChanged(2);
  board1.onGameOver = () => onGameOver(1);
  board2.onGameOver = () => onGameOver(2);
  syncUI();
  window.addEventListener("keydown", onKeyDown);
  loop.start();
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeyDown);
  board1 = null;
  board2 = null;
});
</script>

<template>
  <section id="screen-local" class="screen active">
    <header class="topbar">
      <button class="back-btn" @click="$emit('back')">← Menu</button>
      <button class="topbar-btn" @click="restart">Reiniciar duelo</button>
    </header>

    <div class="boards-row">
      <div class="board-panel" data-player="1">
        <div class="panel-head">
          <span class="player-label">Jogador 1</span>
          <span class="score-label">{{ score1 }}</span>
        </div>
        <div class="combo-label">{{ comboText(combo1) }}</div>
        <div class="pressure-bar"><div class="pressure-fill" :style="{ width: pressure1 + '%' }"></div></div>
        <canvas ref="canvas1"></canvas>
        <p class="keys-hint">A / D mover · S descer · W derrubar</p>
      </div>

      <div class="board-panel" data-player="2">
        <div class="panel-head">
          <span class="player-label">Jogador 2</span>
          <span class="score-label">{{ score2 }}</span>
        </div>
        <div class="combo-label">{{ comboText(combo2) }}</div>
        <div class="pressure-bar"><div class="pressure-fill" :style="{ width: pressure2 + '%' }"></div></div>
        <canvas ref="canvas2"></canvas>
        <p class="keys-hint">← → mover · ↓ descer · ↑ derrubar</p>
      </div>
    </div>

    <p class="message">{{ message || NBSP }}</p>
    <p v-if="saveStatus" class="status save-status">{{ saveStatus }}</p>
    <p class="hint">No celular: toque no lado do seu tabuleiro, na coluna onde a peça deve cair.</p>
  </section>
</template>
