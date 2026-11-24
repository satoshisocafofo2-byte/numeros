<script setup>
// Aviso de conquistas novas, mostrado ao fim da partida.
import AchievementIcon from "./AchievementIcon.vue";

defineProps({ items: { type: Array, default: () => [] } });
</script>

<template>
  <div v-if="items.length" class="unlocked-list" role="status">
    <p class="unlocked-title">{{ items.length > 1 ? "Conquistas desbloqueadas" : "Conquista desbloqueada" }}</p>
    <div v-for="a in items" :key="a.id" class="unlocked-item">
      <AchievementIcon :icon="a.icon" :rarity="a.rarity" :size="36" />
      <div class="unlocked-text">
        <strong>{{ a.name }}</strong>
        <span>{{ a.description }}</span>
      </div>
    </div>
  </div>
</template>
