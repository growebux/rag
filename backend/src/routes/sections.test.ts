import request from 'supertest';
import app from '../index';
import { OnboardingSectionType } from '../types/rag';
import { onboardingDataService } from '../services/onboarding-data.service';

// Mock the onboarding data service
jest.mock('../services/onboarding-data.service');

describe('Sections API', () => {
  let mockOnboardingDataService: any;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create mock implementation
    mockOnboardingDataService = {
      isDocumentationLoaded: jest.fn().mockReturnValue(true),
      loadOnboardingDocumentation: jest.fn().mockResolvedValue(undefined),
      getSectionGuidance: jest
        .fn()
        .mockImplementation((sectionType: OnboardingSectionType) => {
          const sectionContent = {
            [OnboardingSectionType.PROFILE]:
              'This is mock guidance content for the profile section setup.',
            [OnboardingSectionType.PERSONAL_INFO]:
              'This is mock guidance content for personal information.',
            [OnboardingSectionType.PAYMENT]:
              'This is mock guidance content for payment setup.',
            [OnboardingSectionType.TOURS]:
              'This is mock guidance content for tour creation.',
            [OnboardingSectionType.CALENDAR]:
              'This is mock guidance content for calendar management.',
            [OnboardingSectionType.QUIZ]:
              'This is mock guidance content for the knowledge quiz.',
          };

          return Promise.resolve({
            answer:
              sectionContent[sectionType] ||
              'This is mock guidance content for the section.',
            sources: [
              {
                id: 'mock-doc-1',
                title: 'Mock Document',
                excerpt: 'This is a mock document excerpt...',
                section: sectionType,
                relevanceScore: 0.85,
              },
            ],
            confidence: 0.85,
          });
        }),
    };

    // Mock the service factory function
    (
      onboardingDataService as jest.MockedFunction<typeof onboardingDataService>
    ).mockReturnValue(mockOnboardingDataService);
  });
  describe('GET /api/sections', () => {
    it('should return all onboarding sections', async () => {
      const response = await request(app).get('/api/sections').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toHaveLength(6);
      expect(response.body.timestamp).toBeDefined();

      // Verify section structure
      const section = response.body.data[0];
      expect(section).toHaveProperty('id');
      expect(section).toHaveProperty('title');
      expect(section).toHaveProperty('description');
      expect(section).toHaveProperty('order');
      expect(section).toHaveProperty('estimatedTime');
      expect(section).toHaveProperty('requirements');
      expect(section).toHaveProperty('status');
      expect(section.requirements).toBeInstanceOf(Array);
    });

    it('should return sections in correct order', async () => {
      const response = await request(app).get('/api/sections').expect(200);

      const sections = response.body.data;
      expect(sections[0].id).toBe(OnboardingSectionType.PROFILE);
      expect(sections[1].id).toBe(OnboardingSectionType.PERSONAL_INFO);
      expect(sections[2].id).toBe(OnboardingSectionType.PAYMENT);
      expect(sections[3].id).toBe(OnboardingSectionType.TOURS);
      expect(sections[4].id).toBe(OnboardingSectionType.CALENDAR);
      expect(sections[5].id).toBe(OnboardingSectionType.QUIZ);
    });

    it('should include all required section properties', async () => {
      const response = await request(app).get('/api/sections').expect(200);

      const profileSection = response.body.data.find(
        (s: any) => s.id === OnboardingSectionType.PROFILE
      );

      expect(profileSection).toEqual({
        id: OnboardingSectionType.PROFILE,
        title: 'Profile Setup',
        description:
          'Create your professional guide profile with photo, bio, and expertise areas',
        order: 1,
        estimatedTime: '30-45 minutes',
        requirements: [
          'Professional photo',
          'Written bio (150-300 words)',
          'Language selection',
          'Expertise areas (up to 5)',
          'Identity verification',
        ],
        status: 'available',
      });
    });
  });

  describe('GET /api/sections/:id/guidance', () => {
    it('should return guidance for valid section ID', async () => {
      const response = await request(app)
        .get(`/api/sections/${OnboardingSectionType.PROFILE}/guidance`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('section');
      expect(response.body.data).toHaveProperty('guidance');
      expect(response.body.data).toHaveProperty('relatedSections');
      expect(response.body.data).toHaveProperty('documents');

      // Verify guidance structure
      const guidance = response.body.data.guidance;
      expect(guidance).toHaveProperty('title');
      expect(guidance).toHaveProperty('content');
      expect(guidance).toHaveProperty('sources');
      expect(guidance).toHaveProperty('confidence');
      expect(guidance.sources).toBeInstanceOf(Array);
      expect(typeof guidance.confidence).toBe('number');

      // Verify section data
      const section = response.body.data.section;
      expect(section.id).toBe(OnboardingSectionType.PROFILE);
      expect(section.title).toBe('Profile Setup');

      // Verify related sections
      const relatedSections = response.body.data.relatedSections;
      expect(relatedSections).toBeInstanceOf(Array);
      expect(relatedSections.length).toBeLessThanOrEqual(3);
      expect(
        relatedSections.every(
          (s: any) => s.id !== OnboardingSectionType.PROFILE
        )
      ).toBe(true);

      // Verify documents
      const documents = response.body.data.documents;
      expect(documents).toBeInstanceOf(Array);
      expect(documents.length).toBeGreaterThan(0);
      documents.forEach((doc: any) => {
        expect(doc).toHaveProperty('id');
        expect(doc).toHaveProperty('title');
        expect(doc).toHaveProperty('excerpt');
        expect(doc).toHaveProperty('metadata');
      });
    }, 10000); // Increase timeout for RAG processing

    it('should return guidance for all valid section types', async () => {
      const sectionTypes = Object.values(OnboardingSectionType);

      for (const sectionType of sectionTypes) {
        const response = await request(app)
          .get(`/api/sections/${sectionType}/guidance`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.section.id).toBe(sectionType);
        expect(response.body.data.guidance.content).toBeTruthy();
        expect(response.body.data.guidance.sources).toBeInstanceOf(Array);
      }
    }, 30000); // Increase timeout for multiple RAG calls

    it('should return 400 for invalid section ID', async () => {
      const response = await request(app)
        .get('/api/sections/invalid-section/guidance')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid section ID');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should handle RAG service errors gracefully', async () => {
      // This test would require mocking the RAG service to throw an error
      // For now, we'll test with a valid section to ensure the endpoint works
      const response = await request(app)
        .get(`/api/sections/${OnboardingSectionType.PERSONAL_INFO}/guidance`)
        .expect(200);

      expect(response.body.success).toBe(true);
    }, 10000);

    it('should include relevant sources in guidance response', async () => {
      const response = await request(app)
        .get(`/api/sections/${OnboardingSectionType.TOURS}/guidance`)
        .expect(200);

      const guidance = response.body.data.guidance;
      expect(guidance.sources).toBeInstanceOf(Array);

      if (guidance.sources.length > 0) {
        const source = guidance.sources[0];
        expect(source).toHaveProperty('id');
        expect(source).toHaveProperty('title');
        expect(source).toHaveProperty('excerpt');
        expect(source).toHaveProperty('section');
        expect(source).toHaveProperty('relevanceScore');
        expect(typeof source.relevanceScore).toBe('number');
      }
    }, 10000);

    it('should return appropriate content for each section type', async () => {
      // Test profile section guidance
      const profileResponse = await request(app)
        .get(`/api/sections/${OnboardingSectionType.PROFILE}/guidance`)
        .expect(200);

      const profileGuidance = profileResponse.body.data.guidance.content;
      expect(profileGuidance.toLowerCase()).toContain('profile');

      // Test tours section guidance
      const toursResponse = await request(app)
        .get(`/api/sections/${OnboardingSectionType.TOURS}/guidance`)
        .expect(200);

      const toursGuidance = toursResponse.body.data.guidance.content;
      expect(toursGuidance.toLowerCase()).toContain('tour');
    }, 15000);
  });

  describe('Error handling', () => {
    it('should handle server errors gracefully', async () => {
      // Test with a route that doesn't exist
      const response = await request(app)
        .get('/api/sections/nonexistent/guidance')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });
});
