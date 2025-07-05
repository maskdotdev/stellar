import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": "/src",
    },
    dedupe: ['react', 'react-dom'],
  },
  
  // Optimize dependencies for PDF.js
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },

  // Build optimization
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Put React and React-DOM together in a single chunk
          'react-vendor': ['react', 'react-dom'],
          // Group other major libraries
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-popover', '@radix-ui/react-select', '@radix-ui/react-tabs'],
          'editor-vendor': ['@tiptap/react', '@tiptap/starter-kit'],
          'pdf-vendor': ['pdfjs-dist', 'react-pdf'],
        },
      },
    },
    // Increase chunk size warning limit to avoid noise for appropriately sized chunks
    chunkSizeWarningLimit: 1000,
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
