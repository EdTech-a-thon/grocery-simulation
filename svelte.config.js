import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

// ClassGrocery has no server of its own: the browser talks straight to
// PocketBase. So the build is a plain folder of files that any static host can
// serve, with `fallback` sending every URL to the same page — that is what lets
// /teacher work on a host that has never heard of the route.
export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ pages: 'dist', assets: 'dist', fallback: 'index.html' }),
  },
}
