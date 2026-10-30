import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' => funciona tanto en Vercel como en GitHub Pages (subcarpeta del repo)
export default defineConfig({
  plugins: [react()],
  base: './',
})
