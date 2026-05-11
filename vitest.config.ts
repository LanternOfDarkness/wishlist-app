import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/actions/fetch-metadata.ts', 'src/lib/**/*.ts'],
      exclude: ['src/lib/**/__tests__/**', 'src/lib/**/*.test.ts'],
    },
  },
})
