import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [sveltekit()],
  resolve: {
    alias: {
      // The pinned PocketBase binary lives at the project root (the deploy
      // pipeline expects it there), and it shadows the npm package of the same
      // name when Vite pre-bundles dependencies. Point the bare import at the
      // package explicitly so the binary can never be mistaken for it.
      pocketbase: fileURLToPath(new URL('./node_modules/pocketbase/dist/pocketbase.es.mjs', import.meta.url)),
    },
  },
  optimizeDeps: {
    // The package is already ESM, so it needs no pre-bundling — and skipping it
    // keeps esbuild from resolving the bare id against the root binary.
    exclude: ['pocketbase'],
  },
  server: {
    allowedHosts: ['.exe.xyz', '.edtechathon.com'],
  },
})
