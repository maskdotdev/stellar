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
  },
  
  // Optimize dependencies for PDF.js
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },

  // Build optimization
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor libraries
          if (id.includes('node_modules')) {
            // Core React only - be very specific
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'react-vendor';
            }
            // React ecosystem libraries
            if (id.includes('react-hook-form') || id.includes('react-day-picker') || id.includes('react-pdf') || id.includes('react-resizable-panels')) {
              return 'react-ecosystem';
            }
            if (id.includes('lucide-react') || id.includes('react-icons')) {
              return 'icons-vendor';
            }
            if (id.includes('sonner') || id.includes('cmdk')) {
              return 'ui-vendor';
            }
            if (id.includes('@tiptap/')) {
              return 'editor-vendor';
            }
            if (id.includes('pdfjs-dist')) {
              return 'pdf-vendor';
            }
            if (id.includes('recharts') || id.includes('chart')) {
              return 'chart-vendor';
            }
            if (id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority')) {
              return 'utility-vendor';
            }
            if (id.includes('@radix-ui/')) {
              return 'radix-vendor';
            }
            if (id.includes('date-fns')) {
              return 'date-vendor';
            }
            if (id.includes('prosemirror-')) {
              return 'prosemirror-vendor';
            }
            if (id.includes('zustand') || id.includes('zod')) {
              return 'state-vendor';
            }
            if (id.includes('embla-carousel') || id.includes('next-themes')) {
              return 'interaction-vendor';
            }
            if (id.includes('vaul') || id.includes('input-otp') || id.includes('tailwindcss') || id.includes('@tailwindcss/')) {
              return 'ui-framework';
            }
            // All other node_modules go to vendor
            return 'vendor';
          }
          
          // Application chunks by path patterns
          if (id.includes('src/components/tiptap-')) {
            return 'tiptap-components';
          }
          if (id.includes('src/components/focus/')) {
            return 'focus-features';
          }
          if (id.includes('src/components/library/')) {
            return 'library-features';
          }
          if (id.includes('src/components/flashcards/')) {
            return 'flashcard-features';
          }
          if (id.includes('src/components/settings/')) {
            return 'settings-features';
          }
          if (id.includes('src/components/hotkey/')) {
            return 'hotkey-system';
          }
          if (id.includes('src/components/ui/chart')) {
            return 'chart-components';
          }
          if (id.includes('src/components/session/')) {
            return 'session-features';
          }
          if (id.includes('src/components/home/')) {
            return 'home-features';
          }
          if (id.includes('src/lib/services/')) {
            return 'services';
          }
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
