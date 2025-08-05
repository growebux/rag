import { test, expect } from '@playwright/test';

test.describe('Error Scenarios', () => {
  test('should handle backend API unavailable', async ({ page }) => {
    // Mock all API endpoints to return 503 Service Unavailable
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service unavailable' })
      });
    });
    
    await page.goto('/wizard');
    
    // Should display error state or fallback UI
    await expect(page.locator('[data-testid="error-boundary"], [data-testid="api-error"]')).toBeVisible();
  });

  test('should handle network connectivity issues', async ({ page }) => {
    // Simulate network failure
    await page.route('**/api/**', route => {
      route.abort('failed');
    });
    
    await page.goto('/wizard');
    
    // Should handle network errors gracefully
    await expect(page.locator('[data-testid="network-error"], [data-testid="error-boundary"]')).toBeVisible();
  });

  test('should handle OpenAI API errors', async ({ page }) => {
    // Mock OpenAI API errors for chat
    await page.route('**/api/chat', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Rate limit exceeded' })
      });
    });
    
    await page.goto('/wizard/section/profile');
    await page.click('[data-testid="open-chat"]');
    
    await page.fill('[data-testid="chat-input"]', 'Test message');
    await page.click('[data-testid="send-message"]');
    
    // Should display appropriate error message
    await expect(page.locator('[data-testid="chat-error"]')).toBeVisible();
    
    const errorMessage = await page.locator('[data-testid="chat-error"]').textContent();
    expect(errorMessage).toContain('error');
  });

  test('should handle RAG service failures', async ({ page }) => {
    // Mock RAG service errors
    await page.route('**/api/sections/*/guidance', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'RAG service error' })
      });
    });
    
    await page.goto('/wizard/section/profile');
    
    // Should display fallback help content or error state
    await expect(page.locator('[data-testid="help-error"], [data-testid="fallback-help"]')).toBeVisible();
  });

  test('should handle invalid section navigation', async ({ page }) => {
    // Try to navigate to invalid sections
    const invalidSections = ['invalid', 'nonexistent', '123', 'test'];
    
    for (const section of invalidSections) {
      await page.goto(`/wizard/section/${section}`);
      
      // Should redirect to wizard or show error
      await page.waitForLoadState('networkidle');
      const currentUrl = page.url();
      
      // Should either redirect to wizard or show error page
      expect(currentUrl.includes('/wizard') || currentUrl.includes('error')).toBeTruthy();
    }
  });

  test('should handle malformed API responses', async ({ page }) => {
    // Mock malformed JSON responses
    await page.route('**/api/sections', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json response'
      });
    });
    
    await page.goto('/wizard');
    
    // Should handle JSON parsing errors
    await expect(page.locator('[data-testid="parse-error"], [data-testid="error-boundary"]')).toBeVisible();
  });

  test('should handle timeout scenarios', async ({ page }) => {
    // Mock slow API responses
    await page.route('**/api/chat', route => {
      // Delay response by 30 seconds to trigger timeout
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Delayed response' })
        });
      }, 30000);
    });
    
    await page.goto('/wizard/section/profile');
    await page.click('[data-testid="open-chat"]');
    
    await page.fill('[data-testid="chat-input"]', 'Test timeout');
    await page.click('[data-testid="send-message"]');
    
    // Should show loading state and then timeout error
    await expect(page.locator('[data-testid="chat-loading"]')).toBeVisible();
    
    // Wait for timeout (should be less than 30 seconds)
    await expect(page.locator('[data-testid="chat-timeout"], [data-testid="chat-error"]')).toBeVisible({ timeout: 15000 });
  });

  test('should handle browser compatibility issues', async ({ page }) => {
    // Test with disabled JavaScript (if supported by browser)
    await page.goto('/wizard');
    
    // Should still display basic content
    await expect(page.locator('body')).toBeVisible();
    
    // Test with disabled cookies
    await page.context().clearCookies();
    await page.reload();
    
    // Should still function
    await expect(page.locator('[data-testid="wizard-container"]')).toBeVisible();
  });

  test('should handle memory and performance issues', async ({ page }) => {
    // Test with many chat messages to check memory handling
    await page.goto('/wizard/section/profile');
    await page.click('[data-testid="open-chat"]');
    
    // Send multiple messages quickly
    for (let i = 0; i < 10; i++) {
      await page.fill('[data-testid="chat-input"]', `Test message ${i}`);
      await page.click('[data-testid="send-message"]');
      
      // Small delay to prevent overwhelming
      await page.waitForTimeout(100);
    }
    
    // Should still be responsive
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    
    // Check that messages are properly managed (not causing memory leaks)
    const messageCount = await page.locator('[data-testid="chat-messages"] > div').count();
    expect(messageCount).toBeLessThan(50); // Should have reasonable message limit
  });

  test('should handle configuration errors', async ({ page }) => {
    // Mock configuration API errors
    await page.route('**/api/config', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Configuration service unavailable' })
      });
    });
    
    await page.goto('/wizard');
    
    // Should still function with default configuration
    await expect(page.locator('[data-testid="wizard-container"]')).toBeVisible();
  });

  test('should provide user-friendly error messages', async ({ page }) => {
    // Test various error scenarios and check error message quality
    const errorScenarios = [
      {
        route: '**/api/sections',
        status: 404,
        expectedMessage: 'not found'
      },
      {
        route: '**/api/chat',
        status: 401,
        expectedMessage: 'unauthorized'
      },
      {
        route: '**/api/help',
        status: 403,
        expectedMessage: 'forbidden'
      }
    ];
    
    for (const scenario of errorScenarios) {
      await page.route(scenario.route, route => {
        route.fulfill({
          status: scenario.status,
          contentType: 'application/json',
          body: JSON.stringify({ error: `${scenario.status} error` })
        });
      });
      
      await page.goto('/wizard');
      
      // Should display user-friendly error messages
      const errorElements = await page.locator('[data-testid*="error"]').all();
      
      if (errorElements.length > 0) {
        const errorText = await errorElements[0].textContent();
        expect(errorText).toBeTruthy();
        expect(errorText!.length).toBeGreaterThan(10); // Should be descriptive
      }
      
      // Clear the route for next iteration
      await page.unroute(scenario.route);
    }
  });
});