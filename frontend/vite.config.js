import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Ang /api at /uploads ay ipinapasa sa backend (port 3000), kaya walang CORS problem habang nagde-develop.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
      // WebSocket ng real-time chat
      '/ws': { target: 'ws://localhost:3000', ws: true },
    },
  },
});
