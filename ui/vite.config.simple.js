import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Minimal config
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3333,
    strictPort: false,
  }
});
EOF < /dev/null
