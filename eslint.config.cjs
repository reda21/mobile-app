const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
module.exports = defineConfig([
  expo,
  {
    ignores: [
      'dist/**',
      'dist-perf/**',
      'dist-android/**',
      'dist-ios/**',
      'build/**',
      'web-build/**',
      '.expo/**',
    ],
  },
]);
