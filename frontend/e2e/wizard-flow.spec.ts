import { test, expect } from '@playwright/test';

test.describe('Onboarding Wizard Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the wizard
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display wizard interface with all onboarding sections', async ({ page }) => {
    // Check that we're redirected to the wizard
    await expect(page).toHaveURL('/wizard');
    
    // Check that the wizard container is visible
    await expect(page.locator('[data-testid="wizard-container"]')).toBeVisible();
    
    // Check that all expected sections are displayed
    const expectedSections = [
      'Profile',
      'Personal Information', 
      'Payment',
      'Tours',
      'Calendar',
      'Quiz'
    ];
    
    for (const section of expectedSections) {
      await expect(page.locator(`text=${section}`)).toBeVisible();
    }
  });

  test('should navigate to section detail when section is selected', async ({ page }) => {
    // Click on the Profile section
    await page.click('[data-testid="section-profile"]');
    
    // Check that we navigate to the section detail page
    await expect(page).toHaveURL('/wizard/section/profile');
    
    // Check that section detail is displayed
    await expect(page.locator('[data-testid="section-detail"]')).toBeVisible();
    
    // Check that the section title is displayed
    await expect(page.locator('h1')).toContainText('Profile');
  });

  test('should display help content for each section', async ({ page }) => {
    // Navigate to Profile section
    await page.click('[data-testid="section-profile"]');
    
    // Wait for section detail to load
    await page.waitForSelector('[data-testid="section-detail"]');
    
    // Check that help system is visible
    await expect(page.locator('[data-testid="help-system"]')).toBeVisible();
    
    // Check that help content is displayed
    await expect(page.locator('[data-testid="help-content"]')).toBeVisible();
  });

  test('should maintain interface state when navigating between sections', async ({ page }) => {
    // Navigate to Profile section
    await page.click('[data-testid="section-profile"]');
    await expect(page).toHaveURL('/wizard/section/profile');
    
    // Navigate back to wizard
    await page.click('[data-testid="back-to-wizard"]');
    await expect(page).toHaveURL('/wizard');
    
    // Navigate to Tours section
    await page.click('[data-testid="section-tours"]');
    await expect(page).toHaveURL('/wizard/section/tours');
    
    // Check that the correct section is displayed
    await expect(page.locator('h1')).toContainText('Tours');
  });

  test('should display sections in logical order', async ({ page }) => {
    const sections = await page.locator('[data-testid^="section-"]').all();
    
    // Check that we have the expected number of sections
    expect(sections.length).toBe(6);
    
    // Check the order of sections
    const sectionIds = await Promise.all(
      sections.map(section => section.getAttribute('data-testid'))
    );
    
    const expectedOrder = [
      'section-profile',
      'section-personal_info', 
      'section-payment',
      'section-tours',
      'section-calendar',
      'section-quiz'
    ];
    
    expect(sectionIds).toEqual(expectedOrder);
  });

  test('should handle navigation errors gracefully', async ({ page }) => {
    // Try to navigate to a non-existent section
    await page.goto('/wizard/section/nonexistent');
    
    // Should redirect to wizard
    await expect(page).toHaveURL('/wizard');
    
    // Should display error boundary or fallback UI
    await expect(page.locator('[data-testid="wizard-container"]')).toBeVisible();
  });
});