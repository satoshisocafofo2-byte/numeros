import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

// Opcional: se VITE_API_PROXY_TARGET estiver definido no .env (ex.: a URL do
// seu deploy na Vercel), o `npm run dev` encaminha /api/* para lá e o
// Ranking Global funciona também em desenvolvimento.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_API_PROXY_TARGET;
  return {
    plugins: [vue()],
    server: target
      ? { proxy: { "/api": { target, changeOrigin: true, secure: true } } }
      : {},
  };
});
