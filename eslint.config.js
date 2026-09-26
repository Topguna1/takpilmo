import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "node_modules/**", "dist/**", ".dev/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
      "js/vendor/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["js/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "no-undef": "error",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-useless-escape": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["js/**/*.module.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ["tests/**/*.js", "tests/**/*.mjs", "scripts/*.mjs", "playwright.smoke.config.js", "playwright.config.js", "vitest.config.js", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
];
