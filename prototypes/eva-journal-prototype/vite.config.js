import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// In production (GitHub Pages project site) the app is served from
// https://rasmus-weber.github.io/eva-work/ , so assets need the /eva-work/ base.
// Dev keeps the root base so the local server works at http://localhost:5182/.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/eva-work/' : '/',
  plugins: [react()],
  server: {
    port: 5182,
  },
  build: {
    cssMinify: false,
  },
}))
