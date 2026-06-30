import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The "app" is the WebGPU canvas; React is just the UI overlay (DESIGN §4).
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
})
