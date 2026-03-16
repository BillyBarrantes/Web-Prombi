import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Vite 8 es lo suficientemente inteligente, no necesitamos optimizeDeps ni rollupOptions manuales aquí.
})