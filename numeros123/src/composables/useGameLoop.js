import { onBeforeUnmount } from "vue";

// Loop de animação do jogo (mesmo cálculo de dt do original: máx. 50 ms).
// `tick(dt)` roda a cada frame. O loop é cancelado ao desmontar o componente.
export function useGameLoop(tick) {
  let raf = null;
  let last = 0;

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  function start() {
    stop();
    last = performance.now();
    const loop = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      tick(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  onBeforeUnmount(stop);
  return { start, stop };
}
