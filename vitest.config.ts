import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '*.config.ts',
        '*.config.js',
        'src/cli/index.ts', // CLI is harder to unit test
        'src/monitoring/dashboard/**' // Future dashboard components
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@core': resolve(__dirname, './src/core'),
      '@llm': resolve(__dirname, './src/llm'),
      '@models': resolve(__dirname, './src/models'),
      '@persistence': resolve(__dirname, './src/persistence'),
      '@handlers': resolve(__dirname, './src/handlers'),
      '@monitoring': resolve(__dirname, './src/monitoring'),
      '@config': resolve(__dirname, './config')
    }
  }
});