import { defineConfig, devices } from '@playwright/test'

const PORT = 3210
const baseURL = `http://localhost:${PORT}`
const channel = process.env.PLAYWRIGHT_CHANNEL

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL, trace: 'on-first-retry', channel },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, channel } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel } },
  ],
  webServer: {
    command: 'node .output/server/index.mjs',
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: String(PORT),
      NUXT_CATALOG_PROVIDER: 'fixture',
      NUXT_PUBLIC_SITE_URL: baseURL,
      NUXT_LOG_LEVEL: 'warn',
      NUXT_API_REQUESTS_PER_MINUTE: '100000',
      NUXT_PUBLIC_TELEMETRY_SAMPLE_RATE: '0',
    },
  },
})
