<script setup>
// Tela "Conquistas": todas as conquistas, com raridade, status, data de
// desbloqueio e progresso. Os dados vêm do histórico de partidas (MockAPI).
import { ref, computed, onMounted } from "vue";
import AchievementIcon from "./AchievementIcon.vue";
import { useAuth } from "../composables/useAuth.js";
import { loadAchievements, markAllSeen } from "../services/achievementService.js";
import { CATEGORY_LABELS, RARITY_LABELS } from "../game/achievements.js";

defineEmits(["back"]);

const { user } = useAuth();
const list = ref([]);
const loading = ref(true);
const error = ref("");

const unlockedCount = computed(() => list.value.filter((a) => a.unlocked).length);
const percent = computed(() => (list.value.length ? Math.round((unlockedCount.value / list.value.length) * 100) : 0));
const groups = computed(() =>
  Object.keys(CATEGORY_LABELS)
    .map((key) => ({ key, label: CATEGORY_LABELS[key], items: list.value.filter((a) => a.category === key) }))
    .filter((g) => g.items.length)
);

const barWidth = (a) => Math.round((a.current / a.target) * 100) + "%";

function formatDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    list.value = await loadAchievements(user.value.username);
    markAllSeen(user.value.username, list.value);
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section id="screen-achievements" class="screen active">
    <header class="topbar">
      <button class="back-btn" @click="$emit('back')">← Menu</button>
      <button class="topbar-btn" :disabled="loading" @click="load">Atualizar</button>
    </header>

    <div class="card history-card ach-card">
      <h1 class="title small">Conquistas</h1>
      <p class="subtitle">Desbloqueadas automaticamente pelas suas partidas</p>

      <div v-if="error" class="notice notice-error" role="alert">
        <span>{{ error }}</span>
        <button class="mini-btn" @click="load">Tentar de novo</button>
      </div>

      <p v-if="loading" class="status loading-state" role="status">Carregando conquistas...</p>

      <template v-else-if="!error">
        <div class="ach-summary">
          <span><strong>{{ unlockedCount }}</strong> de {{ list.length }} desbloqueadas</span>
          <span>{{ percent }}%</span>
        </div>
        <div class="ach-bar big"><div class="ach-bar-fill" :style="{ width: percent + '%' }"></div></div>

        <section v-for="g in groups" :key="g.key" class="ach-group">
          <h2 class="ach-group-title">{{ g.label }}</h2>
          <ul class="ach-list">
            <li v-for="a in g.items" :key="a.id" class="ach-item" :class="{ locked: !a.unlocked }">
              <AchievementIcon :icon="a.icon" :rarity="a.rarity" :unlocked="a.unlocked" :size="52" />
              <div class="ach-info">
                <div class="ach-head">
                  <strong>{{ a.name }}</strong>
                  <span class="badge" :class="'rarity-' + a.rarity">{{ RARITY_LABELS[a.rarity] }}</span>
                  <span class="badge" :class="a.unlocked ? 'result-victory' : ''">{{ a.unlocked ? "Desbloqueada" : "Bloqueada" }}</span>
                </div>
                <p class="ach-desc">{{ a.description }}</p>
                <p v-if="a.unlocked" class="ach-meta">Desbloqueada em {{ formatDate(a.unlockedAt) }}</p>
                <template v-else>
                  <div class="ach-bar"><div class="ach-bar-fill" :style="{ width: barWidth(a) }"></div></div>
                  <p class="ach-meta">{{ a.current }} / {{ a.target }}</p>
                </template>
              </div>
            </li>
          </ul>
        </section>
      </template>
    </div>
  </section>
</template>
