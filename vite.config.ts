import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ isSsrBuild }) => ({
  server: {
    allowedHosts: true,
  },
  ssr: {
    external: ["firebase-admin"],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (isSsrBuild) return undefined;
          if (id.includes("/node_modules/firebase/")) return "firebase";
          if (id.includes("/node_modules/@firebase/")) return "firebase";
          if (id.includes("/node_modules/react-leaflet/")) return "leaflet";
          if (id.includes("/node_modules/leaflet/")) return "leaflet";
          if (id.includes("/node_modules/lucide-react/")) return "lucide";
          return undefined;
        },
      },
    },
  },
  plugins: [
    tanstackStart(),
    nitro({
      preset: "vercel",
      externals: {
        external: [
          "firebase-admin",
          "firebase-admin/app",
          "firebase-admin/firestore",
          "firebase-admin/auth",
          "@grpc/grpc-js",
          "google-gax",
        ],
      },
    }),
    tailwindcss(),
    tsconfigPaths(),
    react(),
    VitePWA({
      injectRegister: null,
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "LocalVoice - Civic Issue Reporting",
        short_name: "LocalVoice",
        description: "Report and track civic issues in your community",
        theme_color: "#1b4fd8", // Tailwind blue-700
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
}));
