<script setup>
import { ref, onMounted } from "vue";
import { fetchLeaderboard } from "../services/rankingService.js";
import { NBSP } from "../game/helpers.js";

defineEmits(["back"]);

const status = ref("Carregando ranking...");
const entries = ref([]);

async function refresh() {
  entries.value = [];
  status.value = "Carregando ranking...";
  try {
    const data = await fetchLeaderboard(20);
    if (data && data.unconfigured) {
      status.value = "Ranking ainda não configurado neste servidor (veja o README).";
      return;
    }
    if (!Array.isArray(data) || data.length === 0) {
      status.value = "Ninguém pontuou ainda. Jogue o modo solo e seja o primeiro!";
      return;
    }
    status.value = NBSP;
    entries.value = data;
  } catch {
    status.value = "Não foi possível carregar o ranking.";
  }
}

onMounted(refresh);
</script>

<template>
  <section id="screen-ranking" class="screen active">
    <header class="topbar">
      <button class="back-btn" @click="$emit('back')">← Menu</button>
      <button class="topbar-btn" @click="refresh">Atualizar</button>
    </header>

    <div class="card ranking-card">
      <h1 class="title small">Ranking</h1>
      <p class="status">{{ status }}</p>
      <ol class="ranking-list">
        <li v-for="(entry, i) in entries" :key="i" :class="{ first: i === 0 }">
          <span>{{ i + 1 }}. {{ entry.name }}</span>
          <span>{{ entry.score }}</span>
        </li>
      </ol>
    </div>
  </section>
</template>
