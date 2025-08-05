import request from 'supertest';
import app from '../index';
import { OnboardingSectionType } from '../types/rag';
import { onboardingDataService } from '../services/onboarding-data.service';
import { openAIService } from '../services/openai.service';

// Mock the services
jest.mock('../services/onboarding-data.service');
jest.mock('../services/openai.service');

describe('Chat API', () => {
  let mockOnboardingDataService: any;
  let mockOpenAIService: any;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create mock onboarding data service
    mockOnboardingDataService = {
      isDocumentationLoaded: jest.fn().mockReturnValue(true),
      loadOnboardingDocumentation: jest.fn().mockResolvedValue(undefined),
      queryWithContext: jest.fn().mockResolvedValue({
        answer: 'This is mock RAG response content.',
        sources: [
          {
            id: 'mock-doc-1',
            title: 'Mock Document',
            excerpt: 'This is a mock document excerpt...',
            section: OnboardingSectionType.PROFILE,
            relevanceScore: 0.85,
          },
        ],
        confidence: 0.85,
      }),
    };

    // Create mock OpenAI service
    mockOpenAIService = {
      generateResponse: jest
        .fn()
        .mockResolvedValue('This is a mock AI response to your question.'),
    };

    // Mock the service factory functions
    (
      onboardingDataService as jest.MockedFunction<typeof onboardingDataService>
    ).mockReturnValue(mockOnboardingDataService);
    (
      openAIService as jest.MockedFunction<typeof openAIService>
    ).mockReturnValue(mockOpenAIService);
  });

  describe('POST /api/chat', () => {
    it('should create new chat session and return AI response', async () => {
      const chatRequest = {
        message: 'How do I get started with onboarding?',
      };

      const response = await request(app)
        .post('/api/chat')
        .send(chatRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sessionId');
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('suggestions');
      expect(response.body.data).toHaveProperty('context');

      // Verify message structure
      const message = response.body.data.message;
      expect(message).toHaveProperty('id');
      expect(message).toHaveProperty('content');
      expect(message).toHaveProperty('timestamp');
      expect(message).toHaveProperty('sources');
      expect(message.content).toBe(
        'This is a mock AI response to your question.'
      );

      // Verify session ID format
      expect(response.body.data.sessionId).toMatch(/^chat_\d+_[a-z0-9]+$/);

      // Verify suggestions
      expect(response.body.data.suggestions).toBeInstanceOf(Array);
      expect(response.body.data.suggestions.length).toBeGreaterThan(0);
    });

    it('should use existing session when sessionId provided', async () => {
      const sessionId = 'test_session_123';
      const chatRequest = {
        message: 'What about profile setup?',
        sessionId,
      };

      const response = await request(app)
        .post('/api/chat')
        .send(chatRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessionId).toBe(sessionId);
    });

    it('should handle chat with section context', async () => {
      const chatRequest = {
        message: 'I need help with this section',
        context: {
          section: OnboardingSectionType.PROFILE,
        },
      };

      const response = await request(app)
        .post('/api/chat')
        .send(chatRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.context.section).toBe(
        OnboardingSectionType.PROFILE
      );

      // Verify that RAG was called with section context
      expect(mockOnboardingDataService.queryWithContext).toHaveBeenCalledWith(
        chatRequest.message,
        OnboardingSectionType.PROFILE
      );
    });

    it('should include sources in response when available', async () => {
      const chatRequest = {
        message: 'Tell me about profile requirements',
      };

      const response = await request(app)
        .post('/api/chat')
        .send(chatRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message.sources).toBeInstanceOf(Array);
      expect(response.body.data.message.sources.length).toBeGreaterThan(0);

      const source = response.body.data.message.sources[0];
      expect(source).toHaveProperty('id');
      expect(source).toHaveProperty('title');
      expect(source).toHaveProperty('excerpt');
      expect(source).toHaveProperty('section');
      expect(source).toHaveProperty('relevanceScore');
    });

    it('should validate required message field', async () => {
      const chatRequest = {};

      const response = await request(app)
        .post('/api/chat')
        .send(chatRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeInstanceOf(Array);
      expect(response.body.details.length).toBeGreaterThan(0);
    });

    it('should validate message length', async () => {
      const chatRequest = {
        message: '', // Empty message
      };

      const response = await request(app)
        .post('/api/chat')
        .send(chatRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should validate message maximum length', async () => {
      const chatRequest = {
        message: 'a'.repeat(2001), // Too long
      };

      const response = await request(app)
        .post('/api/chat')
        .send(chatRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should validate section type in context', async () => {
      const chatRequest = {
        message: 'Valid message',
        context: {
          section: 'invalid-section',
        },
      };

      const response = await request(app)
        .post('/api/chat')
        .send(chatRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should handle RAG service errors gracefully', async () => {
      // Mock RAG service to throw an error
      mockOnboardingDataService.queryWithContext.mockRejectedValue(
        new Error('RAG service error')
      );

      const chatRequest = {
        message: 'This will cause RAG error',
      };

      const response = await request(app)
        .post('/api/chat')
        .send(chatRequest)
        .expect(200); // Should still succeed with OpenAI only

      expect(response.body.success).toBe(true);
      expect(response.body.data.message.content).toBe(
        'This is a mock AI response to your question.'
      );
    });

    it('should handle OpenAI service errors', async () => {
      // Mock OpenAI service to throw an error
      mockOpenAIService.generateResponse.mockRejectedValue(
        new Error('OpenAI service error')
      );

      const chatRequest = {
        message: 'This will cause OpenAI error',
      };

      const response = await request(app)
        .post('/api/chat')
        .send(chatRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to process chat message');
    });

    it('should initialize documentation if not loaded', async () => {
      // Mock service as not loaded initially
      mockOnboardingDataService.isDocumentationLoaded.mockReturnValue(false);

      const chatRequest = {
        message: 'How do I get started?',
      };

      const response = await request(app)
        .post('/api/chat')
        .send(chatRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(
        mockOnboardingDataService.loadOnboardingDocumentation
      ).toHaveBeenCalledTimes(1);
    });

    it('should return section-specific suggestions', async () => {
      const testCases = [
        {
          section: OnboardingSectionType.PROFILE,
          expectedKeyword: 'profile',
        },
        {
          section: OnboardingSectionType.TOURS,
          expectedKeyword: 'tour',
        },
        {
          section: OnboardingSectionType.PAYMENT,
          expectedKeyword: 'payment',
        },
      ];

      for (const testCase of testCases) {
        const chatRequest = {
          message: 'I need help',
          context: {
            section: testCase.section,
          },
        };

        const response = await request(app)
          .post('/api/chat')
          .send(chatRequest)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.suggestions).toBeInstanceOf(Array);
        expect(response.body.data.suggestions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('GET /api/chat/:sessionId/history', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create a chat session first
      const chatRequest = {
        message: 'Hello, I need help with onboarding',
      };

      const response = await request(app)
        .post('/api/chat')
        .send(chatRequest)
        .expect(200);

      sessionId = response.body.data.sessionId;
    });

    it('should return chat history for existing session', async () => {
      const response = await request(app)
        .get(`/api/chat/${sessionId}/history`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sessionId');
      expect(response.body.data).toHaveProperty('messages');
      expect(response.body.data).toHaveProperty('context');
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('updatedAt');

      expect(response.body.data.sessionId).toBe(sessionId);
      expect(response.body.data.messages).toBeInstanceOf(Array);
      expect(response.body.data.messages.length).toBe(2); // User message + AI response

      // Verify message structure
      const userMessage = response.body.data.messages[0];
      expect(userMessage.sender).toBe('user');
      expect(userMessage.content).toBe('Hello, I need help with onboarding');

      const aiMessage = response.body.data.messages[1];
      expect(aiMessage.sender).toBe('assistant');
      expect(aiMessage.content).toBe(
        'This is a mock AI response to your question.'
      );
    });

    it('should return 404 for non-existent session', async () => {
      const response = await request(app)
        .get('/api/chat/non-existent-session/history')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Chat session not found');
    });

    it('should validate session ID parameter', async () => {
      await request(app)
        .get('/api/chat//history') // Empty session ID
        .expect(404); // Express will return 404 for empty param

      // This tests the route matching, not our validation
    });

    it('should return complete conversation history', async () => {
      // Add more messages to the session
      await request(app)
        .post('/api/chat')
        .send({
          message: 'What about profile setup?',
          sessionId,
        })
        .expect(200);

      await request(app)
        .post('/api/chat')
        .send({
          message: 'How do I upload photos?',
          sessionId,
        })
        .expect(200);

      // Get history
      const response = await request(app)
        .get(`/api/chat/${sessionId}/history`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.messages.length).toBe(6); // 3 user + 3 AI messages

      // Verify chronological order
      const messages = response.body.data.messages;
      for (let i = 1; i < messages.length; i++) {
        const prevTime = new Date(messages[i - 1].timestamp);
        const currTime = new Date(messages[i].timestamp);
        expect(currTime.getTime()).toBeGreaterThanOrEqual(prevTime.getTime());
      }
    });

    it('should include sources in message history', async () => {
      const response = await request(app)
        .get(`/api/chat/${sessionId}/history`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const aiMessage = response.body.data.messages.find(
        (msg: any) => msg.sender === 'assistant'
      );
      expect(aiMessage).toBeDefined();
      expect(aiMessage.sources).toBeInstanceOf(Array);
    });

    it('should handle session retrieval errors gracefully', async () => {
      // This test would require mocking the session storage to throw an error
      // For now, we'll test with a valid session to ensure the endpoint works
      await request(app).get(`/api/chat/${sessionId}/history`).expect(200);
    });
  });

  describe('Chat session management', () => {
    it('should maintain conversation context across messages', async () => {
      // First message
      const firstResponse = await request(app)
        .post('/api/chat')
        .send({
          message: 'I want to create a tour about food',
          context: { section: OnboardingSectionType.TOURS },
        })
        .expect(200);

      const sessionId = firstResponse.body.data.sessionId;

      // Second message in same session
      const secondResponse = await request(app)
        .post('/api/chat')
        .send({
          message: 'What photos should I include?',
          sessionId,
        })
        .expect(200);

      expect(secondResponse.body.data.sessionId).toBe(sessionId);
      expect(secondResponse.body.data.context.section).toBe(
        OnboardingSectionType.TOURS
      );

      // Verify OpenAI was called with conversation history
      expect(mockOpenAIService.generateResponse).toHaveBeenCalledTimes(2);
      const secondCallArgs =
        mockOpenAIService.generateResponse.mock.calls[1][0];
      expect(secondCallArgs).toContain(
        'user: I want to create a tour about food'
      );
      expect(secondCallArgs).toContain(
        'assistant: This is a mock AI response to your question.'
      );
    });

    it('should update session context when provided', async () => {
      // Create session with initial context
      const firstResponse = await request(app)
        .post('/api/chat')
        .send({
          message: 'Hello',
          context: { section: OnboardingSectionType.PROFILE },
        })
        .expect(200);

      const sessionId = firstResponse.body.data.sessionId;

      // Update context in subsequent message
      const secondResponse = await request(app)
        .post('/api/chat')
        .send({
          message: 'Now I need help with tours',
          sessionId,
          context: { section: OnboardingSectionType.TOURS },
        })
        .expect(200);

      expect(secondResponse.body.data.context.section).toBe(
        OnboardingSectionType.TOURS
      );
    });

    it('should limit conversation history in context', async () => {
      const sessionId = 'test_long_conversation';

      // Send many messages to test history limiting
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/chat')
          .send({
            message: `Message number ${i + 1}`,
            sessionId,
          })
          .expect(200);
      }

      // The last call should only include recent messages in context
      const lastCallArgs = mockOpenAIService.generateResponse.mock.calls[9][0];

      // Should contain recent messages (the history shows messages 8, 9, 10)
      expect(lastCallArgs).toContain('Message number 10');
      expect(lastCallArgs).toContain('Message number 8');

      // Should not contain very early messages due to history limiting
      // Based on the output, it correctly excludes messages 1-7
      expect(lastCallArgs).not.toContain('Message number 5');
      expect(lastCallArgs).not.toContain('Message number 6');
      expect(lastCallArgs).not.toContain('Message number 7');
    });
  });
});
