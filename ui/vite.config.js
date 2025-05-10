import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
// Standalone UI Safeguard is used instead of a plugin
import { createHealthMiddleware } from './scripts/health-middleware.js'

// Using direct value replacement instead of process.env

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  server: {
    port: 3000,
    open: false,
    host: true
  }
})