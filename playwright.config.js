import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:4273",
    headless: true,
  },
  webServer: {
    command: "node scripts/dev.mjs --port 4273",
    url: "http://127.0.0.1:4273/index.html",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
