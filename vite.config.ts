import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Relative base so the build works from any static host path (GitHub Pages, artifact, file share).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
