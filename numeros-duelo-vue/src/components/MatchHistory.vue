<script setup>
// Tela "Histórico": lista, busca por jogador, filtro por modo,
// cadastro/edição (MatchForm) e exclusão com confirmação (ConfirmDialog).
//
// Permissões:
//  - admin: vê as partidas de todos e pode registrar, editar e excluir.
//  - usuário comum: vê SÓ as próprias partidas e não pode criar, editar nem
//    excluir (as partidas dele entram sozinhas, quando ele termina de jogar).
//
// Fluxo dos dados: o formulário emite `submit` -> save() chama o
// matchService (POST/PUT) -> a resposta da MockAPI entra no array reativo
// `matches` -> o Vue redesenha a lista sozinho (sem recarregar a página).
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import MatchForm from "./MatchForm.vue";
import { useAuth } from "../composables/useAuth.js";
import ConfirmDialog from "./ConfirmDialog.vue";
import {
  listMatches, createMatch, updateMatch, deleteMatch,
  GAME_MODES, MODE_LABELS, RESULT_LABELS,
} from "../services/matchService.js";

defineEmits(["back"]);

const { user, isAdmin } = useAuth();

const matches = ref([]);
const loading = ref(false);
const error = ref("");
const success = ref("");

const search = ref("");
const modeFilter = ref("");

const formOpen = ref(false);
const editing = ref(null);
const saving = ref(false);
const formError = ref("");

const toDelete = ref(null);
const deleting = ref(false);

let successTimer = null;
function showSuccess(text) {
  success.value = text;
  clearTimeout(successTimer);
  successTimer = setTimeout(() => (success.value = ""), 4000);
}
onBeforeUnmount(() => clearTimeout(successTimer));

// Mais recentes primeiro, depois filtra por nome e modo (tudo em JavaScript,
// sobre a lista já carregada).
const filteredMatches = computed(() => {
  const term = search.value.trim().toLowerCase();
  return [...matches.value]
    // Trava extra: usuário comum nunca enxerga partida de outra conta.
    .filter((m) => isAdmin.value || String(m.owner || "").toLowerCase() === user.value.username.toLowerCase())
    .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0))
    .filter((m) => (!modeFilter.value || m.gameMode === modeFilter.value))
    .filter((m) => !term || String(m.playerName).toLowerCase().includes(term));
});

const hasFilter = computed(() => Boolean(search.value.trim() || modeFilter.value));

function formatDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

function clearFilters() {
  search.value = "";
  modeFilter.value = "";
}

/* GET */
async function load() {
  loading.value = true;
  error.value = "";
  try {
    matches.value = await listMatches(isAdmin.value ? "" : user.value.username);
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  if (!isAdmin.value) return;
  editing.value = null;
  formError.value = "";
  formOpen.value = true;
}

function openEdit(match) {
  if (!isAdmin.value) return;
  editing.value = match;
  formError.value = "";
  formOpen.value = true;
}

function closeForm() {
  if (saving.value) return;
  formOpen.value = false;
  editing.value = null;
}

/* POST / PUT */
async function save(data) {
  if (!isAdmin.value) return;
  saving.value = true;
  formError.value = "";
  try {
    if (editing.value) {
      const updated = await updateMatch(editing.value.id, data);
      matches.value = matches.value.map((m) => (m.id === updated.id ? updated : m));
      showSuccess("Partida atualizada com sucesso!");
    } else {
      const created = await createMatch(data);
      matches.value = [created, ...matches.value];
      showSuccess("Partida cadastrada com sucesso!");
    }
    formOpen.value = false;
    editing.value = null;
  } catch (e) {
    formError.value = e.message;
  } finally {
    saving.value = false;
  }
}

/* DELETE (depois da confirmação) */
async function confirmDelete() {
  if (!isAdmin.value) return;
  const target = toDelete.value;
  if (!target) return;
  deleting.value = true;
  try {
    await deleteMatch(target.id);
    matches.value = matches.value.filter((m) => m.id !== target.id);
    showSuccess("Partida excluída com sucesso!");
    toDelete.value = null;
  } catch (e) {
    error.value = e.message;
    toDelete.value = null;
  } finally {
    deleting.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section id="screen-history" class="screen active">
    <header class="topbar">
      <button class="back-btn" @click="$emit('back')">← Menu</button>
      <button class="topbar-btn" :disabled="loading" @click="load">Atualizar</button>
    </header>

    <div class="card history-card">
      <h1 class="title small">Histórico</h1>
      <p class="subtitle">{{ isAdmin ? "Partidas de todos os jogadores" : "Suas partidas" }}</p>

      <div class="history-toolbar">
        <label v-if="isAdmin" class="sr-only" for="hist-search">Buscar por nome do jogador</label>
        <input v-if="isAdmin" id="hist-search" v-model="search" class="field-input grow" type="search" placeholder="Buscar por jogador..." autocomplete="off" />

        <label class="sr-only" for="hist-mode">Filtrar por modo de jogo</label>
        <select id="hist-mode" v-model="modeFilter" class="field-input">
          <option value="">Todos os modos</option>
          <option v-for="mode in GAME_MODES" :key="mode" :value="mode">{{ MODE_LABELS[mode] }}</option>
        </select>

        <button v-if="isAdmin" class="menu-btn btn-green small add-btn" @click="openCreate">Registrar partida</button>
      </div>

      <p v-if="success" class="notice notice-success" role="status">{{ success }}</p>
      <div v-if="error" class="notice notice-error" role="alert">
        <span>{{ error }}</span>
        <button class="mini-btn" @click="load">Tentar de novo</button>
      </div>

      <p v-if="loading" class="status loading-state" role="status">Carregando partidas...</p>

      <template v-else-if="!error">
        <p v-if="matches.length === 0" class="empty-state">
          {{ isAdmin ? "Nenhuma partida registrada ainda." : "Você ainda não tem partidas. Jogue uma e ela aparece aqui." }}
        </p>
        <div v-else-if="filteredMatches.length === 0" class="empty-state">
          <p>Nenhuma partida encontrada para esse filtro.</p>
          <button v-if="hasFilter" class="mini-btn" @click="clearFilters">Limpar filtros</button>
        </div>

        <template v-else>
          <p class="status count-line">{{ filteredMatches.length }} de {{ matches.length }} partidas</p>
          <ul class="match-list">
            <li v-for="m in filteredMatches" :key="m.id" class="match-item">
              <div class="match-info">
                <div class="match-main">
                  <strong class="match-player">{{ m.playerName }}</strong>
                  <span v-if="isAdmin && m.owner && m.owner !== m.playerName" class="badge owner-tag">conta: {{ m.owner }}</span>
                  <span class="badge" :class="'mode-' + String(m.gameMode).toLowerCase()">{{ MODE_LABELS[m.gameMode] || m.gameMode }}</span>
                  <span class="badge" :class="'result-' + String(m.result).toLowerCase()">{{ RESULT_LABELS[m.result] || m.result }}</span>
                </div>
                <div class="match-meta">
                  <span class="match-score">{{ m.score }} pts</span>
                  <time :datetime="m.date">{{ formatDate(m.date) }}</time>
                </div>
              </div>
              <div v-if="isAdmin" class="match-actions">
                <button class="mini-btn" :aria-label="`Editar partida de ${m.playerName}`" @click="openEdit(m)">Editar</button>
                <button class="mini-btn danger" :aria-label="`Excluir partida de ${m.playerName}`" @click="toDelete = m">Excluir</button>
              </div>
            </li>
          </ul>
        </template>
      </template>
    </div>

    <MatchForm
      v-if="isAdmin && formOpen"
      :match="editing"
      :saving="saving"
      :server-error="formError"
      @submit="save"
      @cancel="closeForm"
    />

    <ConfirmDialog
      v-if="isAdmin && toDelete"
      title="Excluir partida?"
      :message="`A partida de ${toDelete.playerName} (${toDelete.score} pts) será removida do histórico. Essa ação não pode ser desfeita.`"
      confirm-label="Excluir"
      :busy="deleting"
      @confirm="confirmDelete"
      @cancel="toDelete = null"
    />
  </section>
</template>
