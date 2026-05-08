/**
 * Vite Configuration
 * ─────────────────────────────────────────────────────────────────────
 * Clean config — all server-side logic lives in `server/`.
 * https://vite.dev/config/
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import devApiProxy from './server/devApiProxy.js';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    devApiProxy(),
  ],
});
