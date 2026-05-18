import { defineConfig } from 'vite';

export default defineConfig({
  // Phase 2 combat runtime — single-page Pixi+TS game
  base: './',
  server: {
    // Allow the host to override via PORT env (used by Claude Preview MCP);
    // fall back to 5173 for normal `npm run dev`.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: false,    // auto-fallback to next free port (e.g. 5174)
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    outDir: 'dist',
    assetsInlineLimit: 0,  // never inline; pixel assets must stay external
  },
  // Keep the Phase 1 HTML blueprints out of Vite's scanning
  resolve: {
    alias: {},
  },
});
