import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The "app" is the WebGPU canvas; React is just the UI overlay (DESIGN §4).
// On GitHub Pages the app is served from /anyfield/, so assets need that base.
export default defineConfig({
  base: (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.GH_PAGES ? '/AnyField/' : '/',
  plugins: [react()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
})
