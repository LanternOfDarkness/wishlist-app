import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/actions/**/*.ts', 'src/lib/**/*.ts'],
      exclude: [
        'src/actions/**/__tests__/**',
        'src/actions/**/*.test.ts',
        'src/lib/**/__tests__/**',
        'src/lib/**/*.test.ts',
      ],
    },
  },
})
