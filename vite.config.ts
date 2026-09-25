import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { analyzeDevPlugin } from './vite.analyze-plugin'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: './',
    plugins: [react(), analyzeDevPlugin(env)],
  }
})
