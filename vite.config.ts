import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// CJS-only packages that use __dirname/__filename and must NOT be bundled
// into Nitro's ESM (.mjs) output. Keeping them external lets Node resolve
// them from node_modules in their original CJS format where __dirname works.
const CJS_EXTERNALS = [
  "firebase-admin",
  "firebase-admin/app",
  "firebase-admin/firestore",
  "firebase-admin/auth",
  "@grpc/grpc-js",
  "@grpc/proto-loader",
  "google-gax",
  "google-auth-library",
  "@google-cloud/firestore",
  "@google-cloud/storage",
  "protobufjs",
  "proto3-json-serializer",
];

export default defineConfig(({ isSsrBuild }) => ({
  server: {
    allowedHosts: true,
  },
  ssr: {
    external: CJS_EXTERNALS,
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
      rollupConfig: {
        output: {
          // Inject CJS compat shims so any remaining bundled code that
          // references __dirname / __filename won't crash at runtime.
          banner: [
            `import { fileURLToPath as _fURLtP } from 'node:url';`,
            `import { dirname as _dn } from 'node:path';`,
            `if(typeof globalThis.__filename==='undefined'){try{globalThis.__filename=_fURLtP(import.meta.url)}catch(_){}}`,
            `if(typeof globalThis.__dirname==='undefined'){try{globalThis.__dirname=_dn(globalThis.__filename||'')}catch(_){}}`,
          ].join("\n"),
        },
      },
      // @ts-expect-error Nitro config typing does not include externals but it works
      externals: {
        external: CJS_EXTERNALS,
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
