import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  retries: 1,
  reporter: "list",
  use: {
    baseURL: "https://be6c5bf2-ab0c-4248-b07c-b6a3778d7fd2-00-m2hrds0gejge.janeway.replit.dev",
    headless: true,
    ignoreHTTPSErrors: true,
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
