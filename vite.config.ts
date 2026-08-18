import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// Class data used to live in a dev-server middleware that wrote data/classes.json.
// It is now in PocketBase, which the browser talks to directly, so this config
// only sets the hostnames the EdTech-a-thon proxy sends traffic from, plus one
// alias explained below.
export default defineConfig({
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
