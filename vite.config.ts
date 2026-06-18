import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  // أضف هذا الجزء لتجاوز إعدادات النشر التلقائية وتوجيهها لـ Vercel
  vite: {
    define: {
      "process.env.NITRO_PRESET": JSON.stringify("vercel"),
    },
  },
});
