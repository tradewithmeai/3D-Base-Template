import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  timeout: 30000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 }
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.002 }
  },
  projects: [
    {
      name: 'visual-tests',
      use: { browserName: 'chromium' }
    }
  ]
});