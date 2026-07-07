/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// base: './' keeps all asset URLs relative, so the production build works when
// served from any path (GitHub Pages sub-paths, a sub-folder, or a plain static
// server). The whole app is client-side, so this is safe.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: Number(process.env.PORT) || 5173 },
  // MapLibre is a large dependency but is lazy-loaded into its own chunk, so the
  // warning would only be noise.
  build: { chunkSizeWarningLimit: 1200 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
