<script setup>
// Mostra o próximo bloco que vai cair, em cima do tabuleiro. Usa as mesmas
// cores das peças do jogo (COLORS do Board.js).
import { COLORS } from "../game/Board.js";

defineProps({ value: { type: Number, default: 0 } });
</script>

<template>
  <div class="next-block" role="status" aria-label="Próximo bloco">
    <span class="next-label">Próximo</span>
    <span v-if="value" class="next-chip" :style="{ '--cell-color': COLORS[value] || '#1a1e27' }">{{ value }}</span>
  </div>
</template>
