import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    // PORT lets the editor preview assign a free port; 5173 otherwise.
    port: Number(process.env.PORT) || 5173,
    open: false,
  },
  build: {
    assetsInlineLimit: 0,
  },
});
