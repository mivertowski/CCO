const { defineConfig } = require('vitest/config');
const path = require('path');

module.exports = defineConfig({
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
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@llm': path.resolve(__dirname, './src/llm'),
      '@models': path.resolve(__dirname, './src/models'),
      '@persistence': path.resolve(__dirname, './src/persistence'),
      '@handlers': path.resolve(__dirname, './src/handlers'),
      '@monitoring': path.resolve(__dirname, './src/monitoring'),
      '@config': path.resolve(__dirname, './config')
    }
  }
});