const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/browser",
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  use: {
    baseURL: "http://127.0.0.1:4174",
    bypassCSP: true,
    colorScheme: "light",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "node scripts/static-server.cjs 4174",
    url: "http://127.0.0.1:4174/",
    reuseExistingServer: true,
    timeout: 10000,
  },
});
