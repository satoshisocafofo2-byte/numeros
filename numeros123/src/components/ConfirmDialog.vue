<script setup>
// Caixa de confirmação genérica (usada antes de excluir uma partida).
defineProps({
  title: { type: String, default: "Confirmar" },
  message: { type: String, required: true },
  confirmLabel: { type: String, default: "Confirmar" },
  busy: { type: Boolean, default: false },
});
defineEmits(["confirm", "cancel"]);
</script>

<template>
  <div class="overlay show" @click.self="$emit('cancel')">
    <div class="overlay-card" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-msg">
      <h2 id="confirm-title">{{ title }}</h2>
      <p id="confirm-msg" class="overlay-score">{{ message }}</p>
      <div class="overlay-actions">
        <button class="menu-btn btn-red small" :disabled="busy" @click="$emit('confirm')">
          {{ busy ? "Excluindo..." : confirmLabel }}
        </button>
        <button class="menu-btn btn-blue small" :disabled="busy" @click="$emit('cancel')">Cancelar</button>
      </div>
    </div>
  </div>
</template>
