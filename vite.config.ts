import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    setupFiles: ['./test/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/lib/**',
      '**/out/**',
      '**/coverage/**',
      '**/artifacts/**',
      '**/forge-cache/**',
      '**/typechain/**',
      '**/typechain-types/**'
    ],
    include: ['test/Counter.spec.ts']
  },
}) 