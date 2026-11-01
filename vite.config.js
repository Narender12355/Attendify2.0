import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps asset paths relative so the same build works on Firebase Hosting and inside the Android app.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { watch: { ignored: ['**/android/**'] } },
  build: { chunkSizeWarningLimit: 1200 }
});
