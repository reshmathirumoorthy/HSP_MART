import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// /api is proxied to FastAPI so the session cookie stays first-party.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": process.env.API_URL ?? "http://localhost:8000",
      // Product photos live in the storefront's public/ folder.
      "/images": process.env.STOREFRONT_URL ?? "http://localhost:3000",
    },
  },
});
