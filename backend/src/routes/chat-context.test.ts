import request from 'supertest';
import express from 'express';
import chatRouter from './chat';
import { onboardingDataService } from '../services/onboarding-data.service';
import { openAIService } from '../services/openai.service';
import { OnboardingSectionType } from '../types/rag';

// Mock the services
jest.mock('../services/onboarding-data.service');
jest.mock('../services/openai.service');

const mockOnboardingDataService = onboardingDataService as jest.MockedFunction<typeof onboardingDataService>;
const mockOpenAIService = openAIService as jest.MockedFunction<typeof openAIService>;

describe('Chat Context Integration', () => {
  let app: express.Application;

  beforeEach(() => {
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

    // Reset mocks
    jest.clearAllMocks();

    // Setup default mocks
    const mockQueryWithContext = jest.fn().mockResolvedValue({
      answer: 'This is a contextual answer from RAG',
      sources: [
        {
          id: 'doc1',
          title: 'Profile Setup Guide',
          excerpt: 'Information about profile setup...',
          section: OnboardingSectionType.PROFILE,
          relevanceScore: 0.9,
        },
      ],
    });

    const mockDataService = {
      isDocumentationLoaded: jest.fn().mockReturnValue(true),
      loadOnboardingDocumentation: jest.fn().mockResolvedValue(undefined),
      queryWithContext: mockQueryWithContext,
    };

    const mockAIService = {
      generateResponse: jest.fn().mockResolvedValue('AI generated response with context'),
    };

    mockOnboardingDataService.mockReturnValue(mockDataService as any);
    mockOpenAIService.mockReturnValue(mockAIService as any);
  });

  describe('Context-Aware Chat Responses', () => {
    it('should provide section-specific context in responses', async () => {
      const chatMessage = {
        message: 'How do I set up my profile photo?',
        sessionId: 'test-session-1',
        context: {
          section: OnboardingSectionType.PROFILE,
        },
      };

      const response = await request(app)
        .post('/api/chat')
        .send(chatMessage)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message.content).toBeDefined();
      expect(response.body.data.context.section).toBe(OnboardingSectionType.PROFILE);

      // Verify RAG was called with context
      const mockDataService = mockOnboardingDataService();
      expect(mockDataService.queryWithContext).toHaveBeenCalledWith(
        chatMessage.message,
        OnboardingSectionType.PROFILE
      );
    });

    it('should generate section-specific suggestions', async () => {
      const chatMessage = {
        message: 'I need help with my profile',
        sessionId: 'test-session-2',
        context: {
          section: OnboardingSectionType.PROFILE,
        },
      };

      const response = await request(app)
        .post('/api/chat')
        .send(chatMessage)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions).toBeDefined();
      expect(response.body.data.suggestions.length).toBeGreaterThan(0);
      
      // Check that suggestions are profile-specific
      const suggestions = response.body.data.suggestions;
      const profileKeywords = ['profile', 'photo', 'bio', 'expertise'];
      const hasProfileSuggestion = suggestions.some((suggestion: string) =>
        profileKeywords.some(keyword => suggestion.toLowerCase().includes(keyword))
      );
      expect(hasProfileSuggestion).toBe(true);
    });

    it('should maintain context across conversation', async () => {
      const sessionId = 'test-session-3';
      
      // First message with context
      const firstMessage = {
        message: 'What do I need for the profile section?',
        sessionId,
        context: {
          section: OnboardingSectionType.PROFILE,
        },
      };

      await request(app)
        .post('/api/chat')
        .send(firstMessage)
        .expect(200);

      // Second message without explicit context (should maintain from session)
      const secondMessage = {
        message: 'What about the photo requirements?',
        sessionId,
      };

      const response = await request(app)
        .post('/api/chat')
        .send(secondMessage)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.context.section).toBe(OnboardingSectionType.PROFILE);
    });

    it('should include source attribution in responses', async () => {
      const chatMessage = {
        message: 'Tell me about tour creation requirements',
        sessionId: 'test-session-4',
        context: {
          section: OnboardingSectionType.TOURS,
        },
      };

      const response = await request(app)
        .post('/api/chat')
        .send(chatMessage)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message.sources).toBeDefined();
      expect(Array.isArray(response.body.data.message.sources)).toBe(true);
    });

    it('should handle different section contexts appropriately', async () => {
      const sections = [
        OnboardingSectionType.PROFILE,
        OnboardingSectionType.PERSONAL_INFO,
        OnboardingSectionType.PAYMENT,
        OnboardingSectionType.TOURS,
        OnboardingSectionType.CALENDAR,
        OnboardingSectionType.QUIZ,
      ];

      for (const section of sections) {
        const chatMessage = {
          message: `I need help with this section`,
          sessionId: `test-session-${section}`,
          context: { section },
        };

        const response = await request(app)
          .post('/api/chat')
          .send(chatMessage)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.context.section).toBe(section);
        expect(response.body.data.suggestions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Chat History with Context', () => {
    it('should retrieve chat history with context information', async () => {
      const sessionId = 'test-session-history';
      
      // Send a message first
      await request(app)
        .post('/api/chat')
        .send({
          message: 'Help with profile setup',
          sessionId,
          context: {
            section: OnboardingSectionType.PROFILE,
          },
        })
        .expect(200);

      // Get history
      const historyResponse = await request(app)
        .get(`/api/chat/${sessionId}/history`)
        .expect(200);

      expect(historyResponse.body.success).toBe(true);
      expect(historyResponse.body.data.messages.length).toBeGreaterThan(0);
      expect(historyResponse.body.data.context.section).toBe(OnboardingSectionType.PROFILE);
    });
  });

  describe('Error Handling', () => {
    it('should handle RAG service failures gracefully', async () => {
      // Reset the mock to simulate failure
      const mockQueryWithContext = jest.fn().mockRejectedValue(new Error('RAG service error'));
      const mockDataService = {
        isDocumentationLoaded: jest.fn().mockReturnValue(true),
        loadOnboardingDocumentation: jest.fn().mockResolvedValue(undefined),
        queryWithContext: mockQueryWithContext,
      };
      mockOnboardingDataService.mockReturnValue(mockDataService as any);

      const chatMessage = {
        message: 'Test message',
        sessionId: 'test-session-error',
        context: {
          section: OnboardingSectionType.PROFILE,
        },
      };

      const response = await request(app)
        .post('/api/chat')
        .send(chatMessage)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should still get AI response even if RAG fails
      expect(response.body.data.message.content).toBeDefined();
    });

    it('should validate context section values', async () => {
      const chatMessage = {
        message: 'Test message',
        sessionId: 'test-session-invalid',
        context: {
          section: 'invalid_section',
        },
      };

      const response = await request(app)
        .post('/api/chat')
        .send(chatMessage)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('Suggestion Generation', () => {
    it('should avoid repetitive suggestions based on message content', async () => {
      const chatMessage = {
        message: 'What makes a professional profile photo?',
        sessionId: 'test-session-suggestions',
        context: {
          section: OnboardingSectionType.PROFILE,
        },
      };

      const response = await request(app)
        .post('/api/chat')
        .send(chatMessage)
        .expect(200);

      expect(response.body.success).toBe(true);
      const suggestions = response.body.data.suggestions;
      
      // Should not suggest the same thing the user just asked about
      const hasPhotoSuggestion = suggestions.some((suggestion: string) =>
        suggestion.toLowerCase().includes('photo')
      );
      expect(hasPhotoSuggestion).toBe(false);
    });
  });
});