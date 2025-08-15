import { test, expect } from '@playwright/test';

test.describe('3D Environment Default State', () => {
  test('captures default scene baseline', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
    
    // Wait for canvas element to ensure 3D scene is initialized
    await page.waitForSelector('canvas');
    
    // Additional wait to ensure scene rendering is complete
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot('default.png');
  });
});