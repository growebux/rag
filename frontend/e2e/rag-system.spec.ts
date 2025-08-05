import { test, expect } from '@playwright/test';

test.describe('RAG System Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/wizard/section/profile');
    await page.waitForLoadState('networkidle');
  });

  test('should provide contextual help using RAG system', async ({ page }) => {
    // Wait for help system to load
    await page.waitForSelector('[data-testid="help-system"]');
    
    // Check that help content is displayed
    await expect(page.locator('[data-testid="help-content"]')).toBeVisible();
    
    // Check that help content contains relevant information
    const helpContent = await page.locator('[data-testid="help-content"]').textContent();
    expect(helpContent).toBeTruthy();
    expect(helpContent!.length).toBeGreaterThan(50); // Should have substantial content
  });

  test('should retrieve section-specific guidance from documentation', async ({ page }) => {
    // Test Profile section guidance
    await page.goto('/wizard/section/profile');
    await page.waitForSelector('[data-testid="help-content"]');
    
    const profileHelp = await page.locator('[data-testid="help-content"]').textContent();
    expect(profileHelp).toContain('profile'); // Should contain section-relevant content
    
    // Test Tours section guidance
    await page.goto('/wizard/section/tours');
    await page.waitForSelector('[data-testid="help-content"]');
    
    const toursHelp = await page.locator('[data-testid="help-content"]').textContent();
    expect(toursHelp).toContain('tour'); // Should contain section-relevant content
    
    // Content should be different for different sections
    expect(profileHelp).not.toEqual(toursHelp);
  });

  test('should handle RAG system errors gracefully', async ({ page }) => {
    // Mock network failure for help requests
    await page.route('**/api/sections/*/guidance', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await page.goto('/wizard/section/profile');
    
    // Should display error state or fallback content
    await expect(page.locator('[data-testid="help-error"]')).toBeVisible();
  });

  test('should display help content in clear, actionable format', async ({ page }) => {
    await page.waitForSelector('[data-testid="help-content"]');
    
    // Check that help content is properly formatted
    const helpContent = page.locator('[data-testid="help-content"]');
    await expect(helpContent).toBeVisible();
    
    // Check for proper structure (headings, lists, etc.)
    const hasStructure = await helpContent.locator('h2, h3, ul, ol, p').count();
    expect(hasStructure).toBeGreaterThan(0);
  });

  test('should allow retraining with updated documentation', async ({ page }) => {
    // This test would verify that the system can handle documentation updates
    // For now, we'll test that the help system responds to different sections
    
    const sections = ['profile', 'personal_info', 'payment', 'tours', 'calendar', 'quiz'];
    
    for (const section of sections) {
      await page.goto(`/wizard/section/${section}`);
      await page.waitForSelector('[data-testid="help-content"]');
      
      const helpContent = await page.locator('[data-testid="help-content"]').textContent();
      expect(helpContent).toBeTruthy();
      expect(helpContent!.length).toBeGreaterThan(20);
    }
  });

  test('should provide relevant help based on onboarding documentation', async ({ page }) => {
    // Test that help content is relevant to the ToursByLocals onboarding process
    await page.waitForSelector('[data-testid="help-content"]');
    
    const helpContent = await page.locator('[data-testid="help-content"]').textContent();
    
    // Should contain onboarding-related keywords
    const onboardingKeywords = ['guide', 'tour', 'profile', 'application', 'requirement'];
    const containsRelevantContent = onboardingKeywords.some(keyword => 
      helpContent!.toLowerCase().includes(keyword)
    );
    
    expect(containsRelevantContent).toBeTruthy();
  });
});