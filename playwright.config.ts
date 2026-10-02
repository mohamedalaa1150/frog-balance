import { defineConfig, devices } from '@playwright/test';

// Optional system Chromium for runners where downloading managed browsers is blocked.
const chromiumLaunchOptions = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
  : undefined;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Software GPU contexts contend for the runner CPU and framebuffer memory.
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: chromiumLaunchOptions,
        viewport: { width: 1366, height: 768 },
      },
    },
    {
      name: 'webkit-ipad',
      testIgnore: ['**/visual-style.spec.ts', '**/phase-3-playthrough.spec.ts'],
      use: { ...devices['iPad (gen 7) landscape'] },
    },
    {
      name: 'chromium-android',
      testIgnore: ['**/visual-style.spec.ts', '**/phase-3-playthrough.spec.ts'],
      use: { ...devices['Pixel 7'], launchOptions: chromiumLaunchOptions },
    },
    {
      name: 'chromium-whiteboard',
      testIgnore: ['**/visual-style.spec.ts', '**/phase-3-playthrough.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: chromiumLaunchOptions,
        viewport: { width: 1920, height: 1080 },
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
