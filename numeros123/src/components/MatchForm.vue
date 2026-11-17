<script setup>
// Formulário de cadastro e edição de partidas.
// - Recebe por PROPS: `match` (null = nova partida; objeto = edição), `saving`
//   e `serverError`.
// - Cada campo usa v-model em um objeto reativo local (`form`).
// - Valida antes de enviar; só emite `submit` quando tudo está válido. Quem
//   fala com a API é o MatchHistory (via matchService), não este componente.
import { reactive, watch } from "vue";
import { GAME_MODES, MODE_LABELS, RESULTS, RESULT_LABELS } from "../services/matchService.js";
import { MAX_NAME_LENGTH } from "../game/helpers.js";

const props = defineProps({
  match: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  serverError: { type: String, default: "" },
});
const emit = defineEmits(["submit", "cancel"]);

const pad = (n) => String(n).padStart(2, "0");

// ISO -> "AAAA-MM-DD" no fuso local (valor do <input type="date">).
function toDateInput(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// "AAAA-MM-DD" -> ISO (meio-dia local, para o dia não "escorregar" por fuso).
function fromDateInput(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12).toISOString();
}

const form = reactive({ playerName: "", owner: "", gameMode: "Solo", score: "", result: "Defeat", date: "" });
const errors = reactive({ playerName: "", score: "", gameMode: "", result: "", date: "" });

function fill() {
  const m = props.match;
  form.playerName = m ? m.playerName : "";
  form.owner = m ? m.owner || m.playerName : "";
  form.gameMode = m ? m.gameMode : "Solo";
  form.score = m ? String(m.score) : "";
  form.result = m ? m.result : "Defeat";
  form.date = toDateInput(m ? m.date : null);
  Object.keys(errors).forEach((k) => (errors[k] = ""));
}
watch(() => props.match, fill, { immediate: true });

// Regras de validação. Devolve true quando está tudo certo.
function validate() {
  errors.playerName = "";
  errors.score = "";
  errors.gameMode = "";
  errors.result = "";
  errors.date = "";

  const name = form.playerName.trim();
  if (!name) errors.playerName = "Informe o nome do jogador.";
  else if (name.length > MAX_NAME_LENGTH) errors.playerName = `O nome pode ter no máximo ${MAX_NAME_LENGTH} caracteres.`;

  const raw = String(form.score).trim();
  const score = Number(raw);
  if (raw === "") errors.score = "Informe a pontuação.";
  else if (!Number.isFinite(score) || score < 0 || !Number.isInteger(score)) {
    errors.score = "A pontuação deve ser um número inteiro maior ou igual a zero.";
  }

  if (!GAME_MODES.includes(form.gameMode)) errors.gameMode = "Escolha o modo de jogo.";
  if (!RESULTS.includes(form.result)) errors.result = "Escolha o resultado.";
  if (!form.date) errors.date = "Informe a data da partida.";

  return Object.values(errors).every((e) => !e);
}

function onSubmit() {
  if (!validate()) return; // dados inválidos nunca chegam à API
  // Se a data não mudou na edição, mantém o horário original gravado.
  const keepDate = props.match && toDateInput(props.match.date) === form.date;
  emit("submit", {
    playerName: form.playerName.trim(),
    // Conta dona da partida (quem a vê no histórico). Em branco = o próprio jogador.
    owner: form.owner.trim() || form.playerName.trim(),
    gameMode: form.gameMode,
    score: Number(String(form.score).trim()),
    result: form.result,
    date: keepDate ? props.match.date : fromDateInput(form.date),
  });
}
</script>

<template>
  <div class="overlay show form-overlay" @click.self="emit('cancel')">
    <form class="overlay-card match-form" novalidate aria-labelledby="match-form-title" @submit.prevent="onSubmit">
      <h2 id="match-form-title">{{ match ? "Editar partida" : "Registrar partida" }}</h2>

      <div class="form-field">
        <label for="mf-name">Nome do jogador</label>
        <input id="mf-name" v-model="form.playerName" class="field-input" :class="{ invalid: errors.playerName }" type="text" :maxlength="MAX_NAME_LENGTH" autocomplete="off" />
        <p v-if="errors.playerName" class="field-error" role="alert">{{ errors.playerName }}</p>
      </div>

      <div class="form-field">
        <label for="mf-owner">Conta dona da partida (usuário)</label>
        <input id="mf-owner" v-model="form.owner" class="field-input" type="text" :maxlength="MAX_NAME_LENGTH" autocomplete="off" placeholder="Em branco = mesmo nome do jogador" />
      </div>

      <div class="form-field">
        <label for="mf-mode">Modo de jogo</label>
        <select id="mf-mode" v-model="form.gameMode" class="field-input" :class="{ invalid: errors.gameMode }">
          <option v-for="mode in GAME_MODES" :key="mode" :value="mode">{{ MODE_LABELS[mode] }}</option>
        </select>
        <p v-if="errors.gameMode" class="field-error" role="alert">{{ errors.gameMode }}</p>
      </div>

      <div class="form-field">
        <label for="mf-score">Pontuação</label>
        <input id="mf-score" v-model="form.score" class="field-input" :class="{ invalid: errors.score }" type="number" inputmode="numeric" min="0" step="1" />
        <p v-if="errors.score" class="field-error" role="alert">{{ errors.score }}</p>
      </div>

      <div class="form-field">
        <label for="mf-result">Resultado</label>
        <select id="mf-result" v-model="form.result" class="field-input" :class="{ invalid: errors.result }">
          <option v-for="result in RESULTS" :key="result" :value="result">{{ RESULT_LABELS[result] }}</option>
        </select>
        <p v-if="errors.result" class="field-error" role="alert">{{ errors.result }}</p>
      </div>

      <div class="form-field">
        <label for="mf-date">Data</label>
        <input id="mf-date" v-model="form.date" class="field-input" :class="{ invalid: errors.date }" type="date" />
        <p v-if="errors.date" class="field-error" role="alert">{{ errors.date }}</p>
      </div>

      <p v-if="serverError" class="notice notice-error" role="alert">{{ serverError }}</p>

      <div class="overlay-actions">
        <button type="submit" class="menu-btn btn-green small" :disabled="saving">
          {{ saving ? "Salvando..." : match ? "Salvar alterações" : "Cadastrar partida" }}
        </button>
        <button type="button" class="menu-btn btn-blue small" :disabled="saving" @click="emit('cancel')">Cancelar</button>
      </div>
    </form>
  </div>
</template>
