import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Ang /api at /uploads ay ipinapasa sa backend (port 3000), kaya walang CORS problem habang nagde-develop.
const proxy = {
  '/api': 'http://localhost:3000',
  '/uploads': 'http://localhost:3000',
  // WebSocket ng real-time chat
  '/ws': { target: 'ws://localhost:3000', ws: true },
};

// Mga host ng libreng tunnel (Cloudflare Tunnel at ngrok) para mabuksan ang app sa ibang device gamit ang HTTPS link.
// Kung walang ganito, haharangin ng Vite ang tunnel URL ("Blocked request. This host is not allowed").
const tunnelHosts = ['.trycloudflare.com', '.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app'];

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: tunnelHosts,
    proxy,
  },
  // `npm run preview` ang ginagamit para sa tunnel: tinatakbo nito ang production build (port 4173).
  preview: {
    port: Number(process.env.PORT) || 4173,
    allowedHosts: tunnelHosts,
    proxy,
  },
});
