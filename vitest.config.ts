import path from 'node:path'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    // Isolated agent worktrees live under .claude/worktrees/ inside this
    // repo; without this they get scanned as if they were part of the
    // project, silently doubling (or worse, destabilizing) test runs.
    exclude: [...configDefaults.exclude, '.claude/**'],
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
