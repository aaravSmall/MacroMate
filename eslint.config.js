// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    // Edge Function entrypoints run on Deno; their pure modules (and tests) are still linted.
    ignores: [
      'dist/*',
      '.expo/*',
      'ios/*',
      'android/*',
      'coverage/*',
      'supabase/functions/*/index.ts',
    ],
  },
]);
