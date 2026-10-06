import { fileURLToPath } from 'node:url'
import { defineVitestProject } from '@nuxt/test-utils/config'
import { defineConfig } from 'vitest/config'

const sharedDir = fileURLToPath(new URL('./shared', import.meta.url))

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias: { '#shared': sharedDir } },
        test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' },
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['tests/nuxt/**/*.test.ts'],
          environment: 'nuxt',
          environmentOptions: { nuxt: { domEnvironment: 'happy-dom', overrides: { runtimeConfig: { catalogProvider: 'fixture' } } } },
        },
      }),
    ],
  },
})
