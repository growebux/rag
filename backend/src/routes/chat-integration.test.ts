import request from 'supertest';
import express from 'express';
import chatRouter from './chat';
import { OnboardingSectionType } from '../types/rag';

describe('Chat Context Integration - End to End', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Add mock logger
    app.use((req, _res, next) => {
      req.log = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
      } as any;
      next();
    });
    
    app.use('/api/chat', chatRouter);
  });

  it('should handle complete chat flow with context', async () => {
    const sessionId = 'integration-test-session';
    
    // First message with profile context
    const firstResponse = await request(app)
      .post('/api/chat')
      .send({
        message: 'I need help with my profile setup',
        sessionId,
        context: {
          section: OnboardingSectionType.PROFILE,
        },
      })
      .expect(200);

    expect(firstResponse.body.success).toBe(true);
    expect(firstResponse.body.data.sessionId).toBe(sessionId);
    expect(firstResponse.body.data.context.section).toBe(OnboardingSectionType.PROFILE);
    expect(firstResponse.body.data.suggestions).toBeDefined();
    expect(firstResponse.body.data.suggestions.length).toBeGreaterThan(0);

    // Second message in same session (context should be maintained)
    const secondResponse = await request(app)
      .post('/api/chat')
      .send({
        message: 'What about photo requirements?',
        sessionId,
      })
      .expect(200);

    expect(secondResponse.body.success).toBe(true);
    expect(secondResponse.body.data.context.section).toBe(OnboardingSectionType.PROFILE);

    // Get chat history
    const historyResponse = await request(app)
      .get(`/api/chat/${sessionId}/history`)
      .expect(200);

    expect(historyResponse.body.success).toBe(true);
    expect(historyResponse.body.data.messages.length).toBe(4); // 2 user + 2 assistant
    expect(historyResponse.body.data.context.section).toBe(OnboardingSectionType.PROFILE);

    // Switch context to tours
    const thirdResponse = await request(app)
      .post('/api/chat')
      .send({
        message: 'Now I need help with tour creation',
        sessionId,
        context: {
          section: OnboardingSectionType.TOURS,
        },
      })
      .expect(200);

    expect(thirdResponse.body.success).toBe(true);
    expect(thirdResponse.body.data.context.section).toBe(OnboardingSectionType.TOURS);
    
    // Suggestions should be tour-specific
    const suggestions = thirdResponse.body.data.suggestions;
    const hasTourSuggestion = suggestions.some((suggestion: string) =>
      suggestion.toLowerCase().includes('tour') || 
      suggestion.toLowerCase().includes('price') ||
      suggestion.toLowerCase().includes('description')
    );
    expect(hasTourSuggestion).toBe(true);
  });

  it('should provide different suggestions for different sections', async () => {
    const sections = [
      OnboardingSectionType.PROFILE,
      OnboardingSectionType.PAYMENT,
      OnboardingSectionType.TOURS,
      OnboardingSectionType.CALENDAR,
      OnboardingSectionType.QUIZ,
    ];

    const allSuggestions: string[][] = [];

    for (const section of sections) {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: `I need help with ${section}`,
          sessionId: `test-${section}`,
          context: { section },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions).toBeDefined();
      allSuggestions.push(response.body.data.suggestions);
    }

    // Verify that different sections get different suggestions
    for (let i = 0; i < allSuggestions.length; i++) {
      for (let j = i + 1; j < allSuggestions.length; j++) {
        const suggestions1 = allSuggestions[i]!;
        const suggestions2 = allSuggestions[j]!;
        
        // It's okay to have some overlap, but they shouldn't be identical
        expect(JSON.stringify(suggestions1)).not.toBe(JSON.stringify(suggestions2));
      }
    }
  });
});