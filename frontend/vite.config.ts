import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/formula-one-telemetry-and-data-analysis-tool/',
  plugins: [react()],
})
