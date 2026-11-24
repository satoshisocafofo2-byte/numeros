<script setup>
// Tela "Títulos": os 19 títulos oficiais, com raridade, requisito, progresso,
// status e botão para equipar (apenas um por vez).
import { computed, onMounted } from "vue";
import { useTitles } from "../composables/useTitles.js";
import { TITLES, TITLE_RARITY_LABELS, TITLE_RARITY_ORDER } from "../game/titles.js";

defineEmits(["back"]);

const { state, equippedTitle, sync, equip } = useTitles();

const items = computed(() =>
  TITLES.map((t) => {
    const p = state.progress[t.id] || {};
    const at = state.unlocked[t.id] || null;
    return { ...t, unlocked: Boolean(at), unlockedAt: at, current: p.current || 0, total: p.target || t.target || 0, note: p.note || "", equipped: state.equipped === t.id };
  })
);
const groups = computed(() =>
  TITLE_RARITY_ORDER.map((r) => ({ rarity: r, label: TITLE_RARITY_LABELS[r], items: items.value.filter((t) => t.rarity === r) }))
);
const unlockedCount = computed(() => items.value.filter((t) => t.unlocked).length);
const percent = computed(() => Math.round((unlockedCount.value / TITLES.length) * 100));

// Requisitos de títulos secretos ficam escondidos até desbloquear.
const requirementText = (t) => (t.secret && !t.unlocked ? "Requisito secreto" : t.requirement);
const showBar = (t) => !t.unlocked && (t.kind === "stat" || t.kind === "achievements") && t.total > 0;
const barWidth = (t) => Math.min(100, Math.round((t.current / t.total) * 100)) + "%";
const fmt = (n) => Number(n).toLocaleString("pt-BR");

function formatDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
}

onMounted(() => sync(true));
</script>

<template>
  <section id="screen-titles" class="screen active">
    <header class="topbar">
      <button class="back-btn" @click="$emit('back')">← Menu</button>
      <button class="topbar-btn" :disabled="state.loading" @click="sync(true)">Atualizar</button>
    </header>

    <div class="card history-card ach-card">
      <h1 class="title small">Títulos</h1>
      <p class="subtitle">Equipe um título para exibir ao lado do seu nome</p>

      <div v-if="state.error" class="notice notice-error" role="alert">
        <span>{{ state.error }}</span>
        <button class="mini-btn" @click="sync(true)">Tentar de novo</button>
      </div>

      <p v-if="state.loading && !state.loadedAt" class="status loading-state" role="status">Carregando títulos...</p>

      <template v-else>
        <div class="title-equipped-line">
          <span>Equipado: <strong>{{ equippedTitle ? equippedTitle.name : "nenhum" }}</strong></span>
          <button v-if="equippedTitle" class="mini-btn" :disabled="state.saving" @click="equip('')">Remover</button>
        </div>

        <div class="ach-summary">
          <span><strong>{{ unlockedCount }}</strong> de {{ TITLES.length }} desbloqueados</span>
          <span>{{ percent }}%</span>
        </div>
        <div class="ach-bar big"><div class="ach-bar-fill" :style="{ width: percent + '%' }"></div></div>

        <section v-for="g in groups" :key="g.rarity" class="ach-group">
          <h2 class="ach-group-title">{{ g.label }}</h2>
          <ul class="ach-list">
            <li v-for="t in g.items" :key="t.id" class="ach-item" :class="{ locked: !t.unlocked }">
              <div class="ach-info">
                <div class="ach-head">
                  <strong>{{ t.name }}</strong>
                  <span class="badge" :class="'rarity-' + t.rarity">{{ TITLE_RARITY_LABELS[t.rarity] }}</span>
                  <span class="badge" :class="t.unlocked ? 'result-victory' : ''">{{ t.unlocked ? "Desbloqueado" : "Bloqueado" }}</span>
                  <span v-if="t.equipped" class="badge title-badge">Equipado</span>
                </div>
                <p class="ach-desc title-desc">{{ t.description }}</p>
                <p class="ach-meta">Requisito: {{ requirementText(t) }}</p>

                <p v-if="t.unlocked" class="ach-meta">Desbloqueado em {{ formatDate(t.unlockedAt) }}</p>
                <template v-else-if="t.kind === 'unavailable'">
                  <p class="ach-meta">Ainda indisponível<template v-if="!t.secret">: {{ t.reason }}</template></p>
                </template>
                <template v-else>
                  <template v-if="showBar(t)">
                    <div class="ach-bar"><div class="ach-bar-fill" :style="{ width: barWidth(t) }"></div></div>
                    <p class="ach-meta">{{ fmt(t.current) }} / {{ fmt(t.total) }}<template v-if="t.strict"> (é preciso passar de {{ fmt(t.total) }})</template></p>
                  </template>
                  <p v-else-if="t.note" class="ach-meta">{{ t.note }}</p>
                </template>
              </div>

              <div v-if="t.unlocked" class="title-actions">
                <button class="mini-btn" :disabled="state.saving || t.equipped" @click="equip(t.id)">
                  {{ t.equipped ? "Equipado" : "Equipar" }}
                </button>
              </div>
            </li>
          </ul>
        </section>
      </template>
    </div>
  </section>
</template>
