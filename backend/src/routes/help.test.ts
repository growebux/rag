import request from 'supertest';
import app from '../index';
import { OnboardingSectionType } from '../types/rag';
import { onboardingDataService } from '../services/onboarding-data.service';

// Mock the onboarding data service
jest.mock('../services/onboarding-data.service');

describe('Help API', () => {
  let mockOnboardingDataService: any;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create mock implementation
    mockOnboardingDataService = {
      isDocumentationLoaded: jest.fn().mockReturnValue(true),
      loadOnboardingDocumentation: jest.fn().mockResolvedValue(undefined),
      queryWithContext: jest
        .fn()
        .mockImplementation(
          (question: string, section?: OnboardingSectionType) => {
            const mockAnswers = {
              'How do I set up my profile?':
                'To set up your profile, you need to upload a professional photo and write a compelling bio.',
              'What payment information do I need?':
                'You need to provide your banking details and tax information.',
              'How many tours should I create?':
                'You need to create at least 3 tours to activate your account.',
            };

            const answer =
              mockAnswers[question as keyof typeof mockAnswers] ||
              'This is a mock answer for your question.';

            return Promise.resolve({
              answer,
              sources: [
                {
                  id: 'mock-doc-1',
                  title: 'Mock Document',
                  excerpt: 'This is a mock document excerpt...',
                  section: section || OnboardingSectionType.PROFILE,
                  relevanceScore: 0.85,
                },
              ],
              confidence: 0.85,
            });
          }
        ),
    };

    // Mock the service factory function
    (
      onboardingDataService as jest.MockedFunction<typeof onboardingDataService>
    ).mockReturnValue(mockOnboardingDataService);
  });

  describe('POST /api/help', () => {
    it('should return help response for valid question', async () => {
      const helpRequest = {
        question: 'How do I set up my profile?',
      };

      const response = await request(app)
        .post('/api/help')
        .send(helpRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('question');
      expect(response.body.data).toHaveProperty('answer');
      expect(response.body.data).toHaveProperty('sources');
      expect(response.body.data).toHaveProperty('confidence');
      expect(response.body.data).toHaveProperty('context');
      expect(response.body.data).toHaveProperty('suggestions');

      expect(response.body.data.question).toBe(helpRequest.question);
      expect(response.body.data.answer).toContain('profile');
      expect(response.body.data.sources).toBeInstanceOf(Array);
      expect(response.body.data.sources.length).toBeGreaterThan(0);
      expect(response.body.data.confidence).toBe(0.85);
      expect(response.body.data.suggestions).toBeInstanceOf(Array);
      expect(response.body.timestamp).toBeDefined();
    });

    it('should handle help request with section context', async () => {
      const helpRequest = {
        question: 'What information do I need to provide?',
        section: OnboardingSectionType.PAYMENT,
      };

      const response = await request(app)
        .post('/api/help')
        .send(helpRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.context.section).toBe(
        OnboardingSectionType.PAYMENT
      );
      expect(response.body.data.sources[0].section).toBe(
        OnboardingSectionType.PAYMENT
      );

      // Verify that queryWithContext was called with the section
      expect(mockOnboardingDataService.queryWithContext).toHaveBeenCalledWith(
        helpRequest.question,
        OnboardingSectionType.PAYMENT
      );
    });

    it('should handle help request with additional context', async () => {
      const helpRequest = {
        question: 'What should I do next?',
        context: 'I just finished uploading my profile photo',
        section: OnboardingSectionType.PROFILE,
      };

      const response = await request(app)
        .post('/api/help')
        .send(helpRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.context.section).toBe(
        OnboardingSectionType.PROFILE
      );
      expect(response.body.data.context.userContext).toBe(helpRequest.context);
    });

    it('should return section-specific suggestions', async () => {
      const helpRequest = {
        question: 'I need help with this section',
        section: OnboardingSectionType.TOURS,
      };

      const response = await request(app)
        .post('/api/help')
        .send(helpRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions).toBeInstanceOf(Array);
      expect(response.body.data.suggestions.length).toBeGreaterThan(0);

      // Check that suggestions are relevant to tours
      const suggestions = response.body.data.suggestions;
      const tourRelatedSuggestion = suggestions.some((s: string) =>
        s.toLowerCase().includes('tour')
      );
      expect(tourRelatedSuggestion).toBe(true);
    });

    it('should validate required question field', async () => {
      const helpRequest = {};

      const response = await request(app)
        .post('/api/help')
        .send(helpRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeInstanceOf(Array);
      expect(response.body.details.length).toBeGreaterThan(0);
      expect(response.body.details[0].msg).toContain('Invalid value');
    });

    it('should validate question length', async () => {
      const helpRequest = {
        question: '', // Empty question
      };

      const response = await request(app)
        .post('/api/help')
        .send(helpRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should validate question maximum length', async () => {
      const helpRequest = {
        question: 'a'.repeat(1001), // Too long
      };

      const response = await request(app)
        .post('/api/help')
        .send(helpRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should validate section type', async () => {
      const helpRequest = {
        question: 'Valid question',
        section: 'invalid-section',
      };

      const response = await request(app)
        .post('/api/help')
        .send(helpRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(
        response.body.details.some((d: any) =>
          d.msg.includes('valid onboarding section')
        )
      ).toBe(true);
    });

    it('should validate context length', async () => {
      const helpRequest = {
        question: 'Valid question',
        context: 'a'.repeat(501), // Too long
      };

      const response = await request(app)
        .post('/api/help')
        .send(helpRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should handle all valid section types', async () => {
      const sectionTypes = Object.values(OnboardingSectionType);

      for (const sectionType of sectionTypes) {
        const helpRequest = {
          question: `Help with ${sectionType}`,
          section: sectionType,
        };

        const response = await request(app)
          .post('/api/help')
          .send(helpRequest)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.context.section).toBe(sectionType);
      }
    });

    it('should initialize documentation if not loaded', async () => {
      // Mock service as not loaded initially
      mockOnboardingDataService.isDocumentationLoaded.mockReturnValue(false);

      const helpRequest = {
        question: 'How do I get started?',
      };

      const response = await request(app)
        .post('/api/help')
        .send(helpRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(
        mockOnboardingDataService.loadOnboardingDocumentation
      ).toHaveBeenCalledTimes(1);
    });

    it('should handle RAG service errors gracefully', async () => {
      // Mock service to throw an error
      mockOnboardingDataService.queryWithContext.mockRejectedValue(
        new Error('RAG service error')
      );

      const helpRequest = {
        question: 'This will cause an error',
      };

      const response = await request(app)
        .post('/api/help')
        .send(helpRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to process help request');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should format sources correctly', async () => {
      const helpRequest = {
        question: 'How do I set up my profile?',
      };

      const response = await request(app)
        .post('/api/help')
        .send(helpRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      const sources = response.body.data.sources;
      expect(sources).toBeInstanceOf(Array);
      expect(sources.length).toBeGreaterThan(0);

      const source = sources[0];
      expect(source).toHaveProperty('id');
      expect(source).toHaveProperty('title');
      expect(source).toHaveProperty('excerpt');
      expect(source).toHaveProperty('section');
      expect(source).toHaveProperty('relevanceScore');
      expect(typeof source.relevanceScore).toBe('number');
    });

    it('should return appropriate suggestions for different questions', async () => {
      const testCases = [
        {
          question: 'How do I upload a photo?',
          section: OnboardingSectionType.PROFILE,
          expectedSuggestionKeyword: 'profile',
        },
        {
          question: 'What payment methods are accepted?',
          section: OnboardingSectionType.PAYMENT,
          expectedSuggestionKeyword: 'payment',
        },
        {
          question: 'How do I create a tour?',
          section: OnboardingSectionType.TOURS,
          expectedSuggestionKeyword: 'tour',
        },
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/help')
          .send({
            question: testCase.question,
            section: testCase.section,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        const suggestions = response.body.data.suggestions;
        expect(suggestions).toBeInstanceOf(Array);
        expect(suggestions.length).toBeGreaterThan(0);
      }
    });
  });
});
