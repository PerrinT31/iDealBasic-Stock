import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Port par défaut (modifiable si besoin)
    open: true  // Ouvre automatiquement l'app dans le navigateur
  },
  build: {
    outDir: "dist",
    sourcemap: false
  }
});

