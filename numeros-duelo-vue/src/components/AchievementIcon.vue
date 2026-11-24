<script setup>
// Insígnia de conquista em SVG (sem emoji): hexágono na cor da raridade com
// um símbolo desenhado dentro. Bloqueada = escurecida.
import { computed } from "vue";

const props = defineProps({
  icon: { type: String, default: "star" },
  rarity: { type: String, default: "common" },
  unlocked: { type: Boolean, default: true },
  size: { type: Number, default: 44 },
});

// Símbolos desenhados numa grade 24x24. `solid` = preenchido; senão, só traço.
const GLYPHS = {
  drop: { solid: true, d: "M12 3c3.2 4.6 6 7.6 6 11a6 6 0 01-12 0c0-3.4 2.8-6.4 6-11z" },
  chevrons: { d: "M5 14l7-6 7 6M5 20l7-6 7 6" },
  bolt: { solid: true, d: "M13 2L4.5 13.5H11L10 22l9-12h-6.5z" },
  star: { solid: true, d: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" },
  trophy: { d: "M7 4h10v5a5 5 0 01-10 0zM7 6H4v1.5A3 3 0 007 10.5M17 6h3v1.5a3 3 0 01-3 3M12 14v4M8 20h8" },
  target: { d: "M12 4a8 8 0 100 16 8 8 0 000-16M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7" },
  shield: { d: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-4.5" },
  flag: { d: "M6 21V4M6 5h11l-2.5 4 2.5 4H6" },
  crown: { solid: true, d: "M3 18h18l-1.5-10-4.5 4.5L12 5 9 12.5 4.5 8z" },
  gem: { solid: true, d: "M7 3h10l4 6-9 12L3 9z" },
  infinity: { d: "M12 12c-1.8-2.4-3.4-4-5.5-4C4.5 8 3 9.8 3 12s1.5 4 3.5 4c2.1 0 3.7-1.6 5.5-4zm0 0c1.8 2.4 3.4 4 5.5 4 2 0 3.5-1.8 3.5-4s-1.5-4-3.5-4c-2.1 0-3.7 1.6-5.5 4z" },
};

const glyph = computed(() => GLYPHS[props.icon] || GLYPHS.star);
</script>

<template>
  <svg class="ach-icon" :class="['rarity-' + rarity, { locked: !unlocked }]" :width="size" :height="size" viewBox="0 0 24 24" role="img" aria-hidden="true">
    <path class="shape" d="M12 1.5l9.2 5.25v10.5L12 22.5l-9.2-5.25V6.75z" />
    <g transform="translate(6 6) scale(0.5)">
      <path class="glyph" :class="{ solid: glyph.solid }" :d="glyph.d" />
    </g>
  </svg>
</template>
