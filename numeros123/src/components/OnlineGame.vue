<script setup>
// Modo Online. Mesma ideia do original: cada navegador roda o próprio Board e
// o servidor WebSocket (online-server/) só repassa placar/combo/fim de jogo.
// Aqui os passos da tela (escolher → esperar → jogar) viram o estado `step`.
import { ref, nextTick, onBeforeUnmount } from "vue";
import { Board } from "../game/Board.js";
import { GAME_KEYS, NBSP, comboText, pressurePercent } from "../game/helpers.js";
import { useAuth } from "../composables/useAuth.js";
import { ONLINE_WS_URL } from "../config.js";
import { useGameLoop } from "../composables/useGameLoop.js";
import { useMatchRecorder } from "../composables/useMatchRecorder.js";

const emit = defineEmits(["back"]);

const canvas = ref(null);
const step = ref("setup"); // setup | waiting | play
const statusText = ref("Desconectado");
const statusKind = ref("error");

const { user } = useAuth();
const codeInput = ref("");
const setupStatus = ref("");
const waitingText = ref("Procurando adversário...");
const roomCode = ref("");

const myName = ref("Você");
const myScore = ref(0);
const myCombo = ref(0);
const oppName = ref("Adversário");
const oppScore = ref(0);
const oppCombo = ref(0);
const oppStatus = ref("jogando...");
const oppTag = ref("...");
const message = ref("");
const showActions = ref(false);

const { status: saveStatus, record, reset: resetRecorder } = useMatchRecorder();

// Estado "de motor": fora do reativo de propósito.
let ws = null;
let board = null;
let selfDone = false;
let opponentDone = false;
let opponentFinalScore = null;
let recordName = "Jogador";

const loop = useGameLoop((dt) => {
  board.update(dt);
  board.draw();
});

function setStatus(text, kind) {
  statusText.value = text;
  statusKind.value = kind || "";
}

function setStep(next) {
  step.value = next;
  showActions.value = false;
  message.value = "";
}

function backToSetup(statusMsg) {
  setStep("setup");
  setupStatus.value = statusMsg || "";
  roomCode.value = "";
}

function getOnlineName() {
  return user.value.username;
}

/* ----------------------------- Conexão ----------------------------- */

function connectOnline() {
  return new Promise((resolve, reject) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      resolve(ws);
      return;
    }
    if (!ONLINE_WS_URL || ONLINE_WS_URL.includes("SEU-SERVIDOR")) {
      reject(new Error("Servidor online ainda não configurado (veja online-server/README.md)."));
      return;
    }
    setStatus("Conectando...", "");
    let settled = false;
    const socket = new WebSocket(ONLINE_WS_URL);
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.close();
      reject(new Error("Não conectou a tempo — o servidor grátis 'acorda' devagar na primeira vez do dia. Tente de novo em ~1 minuto."));
    }, 45000);

    socket.addEventListener("open", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      ws = socket;
      setStatus("Conectado", "connected");
      bindMessages(socket);
      resolve(socket);
    });
    socket.addEventListener("error", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new Error("Erro ao conectar no servidor online."));
    });
    socket.addEventListener("close", () => {
      clearTimeout(timeout);
      if (ws === socket) {
        ws = null;
        setStatus("Desconectado", "error");
        if (step.value === "play" && !(selfDone && opponentDone)) {
          message.value = "Conexão perdida com o servidor.";
          showActions.value = true;
        }
      }
    });
  });
}

function bindMessages(socket) {
  socket.onmessage = (ev) => {
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    switch (msg.type) {
      case "created":
        roomCode.value = msg.room;
        waitingText.value = "Sala criada! Aguardando adversário entrar...";
        break;
      case "queued":
        waitingText.value = "Procurando adversário...";
        break;
      case "queue-timeout":
        backToSetup("Ninguém encontrado a tempo. Tente de novo.");
        break;
      case "error":
        backToSetup(msg.message || "Erro ao entrar na sala.");
        break;
      case "matched":
        startMatch(msg.you, msg.opponent);
        break;
      case "opponent-score":
        oppScore.value = msg.score;
        oppCombo.value = msg.combo;
        if (board && !board.gameOver) board.setOpponentScore(msg.score);
        break;
      case "opponent-gameover":
        opponentDone = true;
        oppStatus.value = "estourou!";
        oppTag.value = "FIM";
        announceResultIfDone(msg.score);
        break;
      case "opponent-left":
        message.value = "O adversário saiu da partida.";
        showActions.value = true;
        stopLoop();
        break;
      default:
        break;
    }
  };
}

/* ------------------------------ Partida ------------------------------ */

async function startMatch(me, opponent) {
  selfDone = false;
  opponentDone = false;
  opponentFinalScore = null;
  recordName = user.value.username;
  resetRecorder();

  setStep("play");
  myName.value = me || "Você";
  myScore.value = 0;
  myCombo.value = 0;
  oppName.value = opponent || "Adversário";
  oppScore.value = 0;
  oppCombo.value = 0;
  oppStatus.value = "jogando...";
  oppTag.value = "...";

  await nextTick(); // espera o <canvas> existir no DOM
  if (!canvas.value) return;

  board = new Board(canvas.value);
  board.onScoreChanged = () => {
    myScore.value = board.score;
    myCombo.value = board.combo;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "score", score: board.score, combo: board.combo }));
    }
  };
  board.onGameOver = () => {
    selfDone = true;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "gameover", score: board.score }));
    }
    announceResultIfDone(null);
  };

  window.addEventListener("keydown", onKeyDown);
  loop.start();
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

function announceResultIfDone(oppScoreFromMsg) {
  if (!board) return;
  if (oppScoreFromMsg !== null && oppScoreFromMsg !== undefined) opponentFinalScore = oppScoreFromMsg;

  if (selfDone && opponentDone) {
    const my = board.score;
    const opp = opponentFinalScore != null ? opponentFinalScore : 0;
    if (my > opp) message.value = `Você venceu! ${my} x ${opp}`;
    else if (my < opp) message.value = `O adversário venceu. ${my} x ${opp}`;
    else message.value = `Empate! ${my} x ${opp}`;
    showActions.value = true;
    stopLoop();

    // Cada navegador registra a SUA partida (o recorder impede duplicados).
    // O enunciado só prevê Victory/Defeat/Record, então empate fica "Defeat".
    record(() => [{
      playerName: recordName,
      owner: recordName,
      gameMode: "Online",
      score: my,
      result: my > opp ? "Victory" : "Defeat",
    }]);
  } else if (selfDone && !opponentDone) {
    message.value = `Você estourou com ${board.score} pontos. Aguardando o adversário terminar...`;
  } else if (!selfDone && opponentDone) {
    message.value = `O adversário estourou com ${opponentFinalScore} pontos! Continue jogando pra tentar superar.`;
  }
}

function stopLoop() {
  loop.stop();
  window.removeEventListener("keydown", onKeyDown);
}

function stopOnline() {
  stopLoop();
  if (ws) {
    try {
      ws.send(JSON.stringify({ type: "leave" }));
    } catch {
      // conexão já pode estar fechada, tudo bem
    }
    ws.close();
    ws = null;
  }
  board = null;
  selfDone = false;
  opponentDone = false;
  opponentFinalScore = null;
}

/* ------------------------------ Ações ------------------------------ */

async function enter(waitText, buildMessage) {
  setupStatus.value = "Conectando ao servidor (pode levar até 1 min na 1ª vez do dia)...";
  try {
    const socket = await connectOnline();
    setupStatus.value = "";
    roomCode.value = "";
    waitingText.value = waitText;
    setStep("waiting");
    socket.send(JSON.stringify(buildMessage()));
  } catch (err) {
    setupStatus.value = err.message;
  }
}

function quickMatch() {
  const name = getOnlineName();
  enter("Procurando adversário...", () => ({ type: "quick", name }));
}

function createRoom() {
  const name = getOnlineName();
  enter("Criando sala...", () => ({ type: "create", name }));
}

function joinRoom() {
  const name = getOnlineName();
  const code = codeInput.value.trim().toUpperCase();
  if (!code) {
    setupStatus.value = "Digite o código da sala.";
    return;
  }
  enter("Entrando na sala...", () => ({ type: "join", room: code, name }));
}

function cancelWaiting() {
  if (ws) {
    try {
      ws.send(JSON.stringify({ type: "leave" }));
    } catch {
      // ok
    }
  }
  backToSetup();
}

function playAgain() {
  stopOnline();
  resetRecorder();
  backToSetup();
}

onBeforeUnmount(stopOnline);
</script>

<template>
  <section id="screen-online" class="screen active">
    <header class="topbar">
      <button class="back-btn" @click="emit('back')">← Menu</button>
      <span class="online-status" :class="statusKind">{{ statusText }}</span>
    </header>

    <!-- Passo 1: escolher partida rápida ou sala por código -->
    <div v-if="step === 'setup'" class="card online-setup">
      <h1 class="title small">Online</h1>
      <p class="subtitle">Duelo em tempo real com alguém em outro aparelho</p>

      <p class="user-line">Jogando como <strong>{{ user.username }}</strong></p>

      <button class="menu-btn btn-blue" @click="quickMatch">
        Partida rápida
      </button>

      <div class="online-divider">ou</div>

      <button class="menu-btn btn-purple" @click="createRoom">
        Criar sala
      </button>

      <div class="online-join-row">
        <input v-model="codeInput" type="text" placeholder="Código da sala" maxlength="4" autocomplete="off" aria-label="Código da sala" />
        <button class="menu-btn btn-amber small" @click="joinRoom">Entrar</button>
      </div>

      <p class="status">{{ setupStatus || NBSP }}</p>
    </div>

    <!-- Passo 2: esperando o adversário -->
    <div v-else-if="step === 'waiting'" class="card online-waiting">
      <div class="waiting-spinner" aria-hidden="true"></div>
      <p class="status">{{ waitingText }}</p>
      <div v-if="roomCode" class="room-code-box">
        <span>Código da sala:</span>
        <strong>{{ roomCode }}</strong>
        <span class="hint">Passe esse código pra outra pessoa entrar</span>
      </div>
      <button class="menu-btn btn-blue small" @click="cancelWaiting">Cancelar</button>
    </div>

    <!-- Passo 3: partida em andamento -->
    <template v-else>
      <div class="boards-row online-boards">
        <div class="board-panel" data-player="self">
          <div class="panel-head">
            <span class="player-label">{{ myName }}</span>
            <span class="score-label">{{ myScore }}</span>
          </div>
          <div class="combo-label">{{ comboText(myCombo) }}</div>
          <div class="pressure-bar"><div class="pressure-fill"></div></div>
          <canvas ref="canvas"></canvas>
          <p class="keys-hint">Setas ou A/D/S/W — ou toque na coluna onde a peça deve cair</p>
        </div>

        <div class="board-panel opponent-panel" data-player="opponent">
          <div class="panel-head">
            <span class="player-label">{{ oppName }}</span>
            <span class="score-label">{{ oppScore }}</span>
          </div>
          <div class="combo-label">{{ comboText(oppCombo) }}</div>
          <div class="pressure-bar"><div class="pressure-fill" :style="{ width: pressurePercent(oppScore) + '%' }"></div></div>
          <div class="opponent-placeholder">
            <span>{{ oppTag }}</span>
            <p>{{ oppStatus }}</p>
          </div>
        </div>
      </div>

      <p class="message">{{ message || NBSP }}</p>
      <p v-if="saveStatus" class="status save-status">{{ saveStatus }}</p>

      <div v-if="showActions" class="overlay-actions online-play-actions">
        <button class="menu-btn btn-purple small" @click="playAgain">Jogar de novo</button>
        <button class="menu-btn btn-blue small" @click="emit('back')">Voltar ao menu</button>
      </div>
    </template>
  </section>
</template>
