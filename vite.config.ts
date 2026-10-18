import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// gallery.html and icon.html are dev-only art boards (open them under `npm run dev`); only the game is built.
export default defineConfig({
  plugins: [react()],
})
