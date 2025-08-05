import { test, expect } from '@playwright/test';

test.describe('Basic Setup Test', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads
    await expect(page).toHaveTitle(/Onboarding Wizard/);
    
    // Check that we're redirected to wizard
    await expect(page).toHaveURL('/wizard');
  });

  test('should have working backend API', async ({ page }) => {
    // Test the health endpoint
    const response = await page.request.get('http://localhost:3001/health');
    expect(response.ok()).toBeTruthy();
    
    const health = await response.json();
    expect(health.status).toBe('healthy');
  });
});