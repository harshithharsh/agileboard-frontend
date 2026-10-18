import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

// App version from package.json, shown in the footer
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  plugins: [react()],
  // Version and build time, shown in the footer ('Last Updated On' = when this build was made)
  define: { __APP_VERSION__: JSON.stringify(version), __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
  },
});
