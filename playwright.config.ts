import { defineConfig, devices } from '@playwright/test'

// Both servers must be running:
//   ./pocketbase serve --hooksDir=pb_hooks --migrationsDir=pb_migrations
//   bun run dev
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:8000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
