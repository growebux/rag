import { test, expect } from '@playwright/test';

test.describe('Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/wizard/section/profile');
    await page.waitForLoadState('networkidle');
  });

  test('should open chat interface when help is needed', async ({ page }) => {
    // Click on chat button or help trigger
    await page.click('[data-testid="open-chat"]');
    
    // Check that chat interface is visible
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    
    // Check that chat input is available
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
    
    // Check that chat messages container is visible
    await expect(page.locator('[data-testid="chat-messages"]')).toBeVisible();
  });

  test('should send and receive messages in chat', async ({ page }) => {
    // Open chat
    await page.click('[data-testid="open-chat"]');
    
    // Type a message
    const testMessage = 'How do I complete my profile?';
    await page.fill('[data-testid="chat-input"]', testMessage);
    
    // Send the message
    await page.click('[data-testid="send-message"]');
    
    // Check that user message appears
    await expect(page.locator('[data-testid="user-message"]').last()).toContainText(testMessage);
    
    // Wait for AI response
    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 10000 });
    
    // Check that assistant response appears
    const assistantMessage = page.locator('[data-testid="assistant-message"]').last();
    await expect(assistantMessage).toBeVisible();
    
    const responseText = await assistantMessage.textContent();
    expect(responseText).toBeTruthy();
    expect(responseText!.length).toBeGreaterThan(10);
  });

  test('should maintain conversation history within session', async ({ page }) => {
    // Open chat
    await page.click('[data-testid="open-chat"]');
    
    // Send first message
    await page.fill('[data-testid="chat-input"]', 'What is required for the profile section?');
    await page.click('[data-testid="send-message"]');
    
    // Wait for response
    await page.waitForSelector('[data-testid="assistant-message"]');
    
    // Send second message
    await page.fill('[data-testid="chat-input"]', 'Can you give me more details?');
    await page.click('[data-testid="send-message"]');
    
    // Wait for second response
    await page.waitForSelector('[data-testid="assistant-message"]:nth-child(4)'); // 2 user + 2 assistant messages
    
    // Check that both messages and responses are visible
    const messages = await page.locator('[data-testid="chat-messages"] > div').count();
    expect(messages).toBeGreaterThanOrEqual(4); // At least 2 user + 2 assistant messages
  });

  test('should incorporate onboarding context in responses', async ({ page }) => {
    // Open chat from Profile section
    await page.click('[data-testid="open-chat"]');
    
    // Ask a context-specific question
    await page.fill('[data-testid="chat-input"]', 'What do I need to do here?');
    await page.click('[data-testid="send-message"]');
    
    // Wait for response
    await page.waitForSelector('[data-testid="assistant-message"]');
    
    const response = await page.locator('[data-testid="assistant-message"]').last().textContent();
    
    // Response should be contextual to the Profile section
    expect(response).toContain('profile');
  });

  test('should close chat interface', async ({ page }) => {
    // Open chat
    await page.click('[data-testid="open-chat"]');
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    
    // Close chat
    await page.click('[data-testid="close-chat"]');
    
    // Check that chat is no longer visible
    await expect(page.locator('[data-testid="chat-interface"]')).not.toBeVisible();
  });

  test('should handle chat errors gracefully', async ({ page }) => {
    // Mock chat API failure
    await page.route('**/api/chat', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Chat service unavailable' })
      });
    });
    
    // Open chat and try to send message
    await page.click('[data-testid="open-chat"]');
    await page.fill('[data-testid="chat-input"]', 'Test message');
    await page.click('[data-testid="send-message"]');
    
    // Should display error message
    await expect(page.locator('[data-testid="chat-error"]')).toBeVisible();
  });

  test('should provide intelligent responses using OpenAI integration', async ({ page }) => {
    // Open chat
    await page.click('[data-testid="open-chat"]');
    
    // Ask a complex question
    const complexQuestion = 'I am having trouble understanding what information I need to provide for my guide profile. Can you help me understand the requirements and give me some tips?';
    await page.fill('[data-testid="chat-input"]', complexQuestion);
    await page.click('[data-testid="send-message"]');
    
    // Wait for response
    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 15000 });
    
    const response = await page.locator('[data-testid="assistant-message"]').last().textContent();
    
    // Response should be substantial and helpful
    expect(response).toBeTruthy();
    expect(response!.length).toBeGreaterThan(100);
    
    // Should contain helpful keywords
    const helpfulKeywords = ['profile', 'information', 'requirement', 'guide', 'help'];
    const containsHelpfulContent = helpfulKeywords.some(keyword => 
      response!.toLowerCase().includes(keyword)
    );
    expect(containsHelpfulContent).toBeTruthy();
  });

  test('should log conversations for system improvement', async ({ page }) => {
    // This test verifies that chat interactions are properly logged
    // We'll check that the chat API is called with proper parameters
    
    let chatApiCalled = false;
    await page.route('**/api/chat', route => {
      chatApiCalled = true;
      const request = route.request();
      const postData = request.postData();
      
      // Verify that the request contains expected fields
      expect(postData).toBeTruthy();
      
      route.continue();
    });
    
    // Open chat and send message
    await page.click('[data-testid="open-chat"]');
    await page.fill('[data-testid="chat-input"]', 'Test logging message');
    await page.click('[data-testid="send-message"]');
    
    // Verify API was called
    expect(chatApiCalled).toBeTruthy();
  });

  test('should handle different chat scenarios', async ({ page }) => {
    // Test various chat scenarios
    const scenarios = [
      {
        input: 'Hello',
        expectedKeywords: ['hello', 'help', 'assist']
      },
      {
        input: 'What documents do I need?',
        expectedKeywords: ['document', 'requirement', 'need']
      },
      {
        input: 'How long does the process take?',
        expectedKeywords: ['time', 'process', 'take']
      }
    ];
    
    await page.click('[data-testid="open-chat"]');
    
    for (const scenario of scenarios) {
      // Send message
      await page.fill('[data-testid="chat-input"]', scenario.input);
      await page.click('[data-testid="send-message"]');
      
      // Wait for response
      await page.waitForSelector(`[data-testid="assistant-message"]:has-text("${scenario.input.substring(0, 10)}")`, { timeout: 10000 });
      
      const response = await page.locator('[data-testid="assistant-message"]').last().textContent();
      
      // Check that response is relevant
      expect(response).toBeTruthy();
      expect(response!.length).toBeGreaterThan(20);
    }
  });
});