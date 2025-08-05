import {
  OnboardingDataService,
  onboardingDataService,
} from './onboarding-data.service';
import { ragService } from './rag.service';
import { onboardingDocuments } from '../data/onboarding-documentation';
import { OnboardingSectionType } from '../types/rag';

// Mock the RAG service
jest.mock('./rag.service');

describe('OnboardingDataService', () => {
  let service: OnboardingDataService;
  let mockRagService: any;

  beforeEach(() => {
    service = new OnboardingDataService();

    // Mock RAG service
    mockRagService = {
      initialize: jest.fn(),
      query: jest.fn(),
      addDocument: jest.fn(),
      removeDocument: jest.fn(),
      getDocuments: jest.fn(),
      getStatus: jest.fn(),
    };

    (ragService as jest.MockedFunction<typeof ragService>).mockReturnValue(
      mockRagService
    );

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('loadOnboardingDocumentation', () => {
    it('should initialize RAG system with onboarding documents', async () => {
      mockRagService.initialize.mockResolvedValue(undefined);

      await service.loadOnboardingDocumentation();

      expect(mockRagService.initialize).toHaveBeenCalledWith(
        onboardingDocuments
      );
      expect(service.isDocumentationLoaded()).toBe(true);
    });

    it('should handle initialization errors', async () => {
      mockRagService.initialize.mockRejectedValue(
        new Error('RAG initialization failed')
      );

      await expect(service.loadOnboardingDocumentation()).rejects.toThrow(
        'Failed to load onboarding documentation: RAG initialization failed'
      );
    });
  });

  describe('updateSectionDocumentation', () => {
    it('should update documents for a specific section', async () => {
      const existingDocs = [
        {
          id: 'profile-doc-1',
          section: OnboardingSectionType.PROFILE,
          title: 'Old Profile Doc',
          content: 'Old content',
          metadata: {},
          embedding: [0.1, 0.2, 0.3],
          chunks: [],
        },
        {
          id: 'payment-doc-1',
          section: OnboardingSectionType.PAYMENT,
          title: 'Payment Doc',
          content: 'Payment content',
          metadata: {},
          embedding: [0.1, 0.2, 0.3],
          chunks: [],
        },
      ];

      const newProfileDocs = [
        {
          id: 'profile-doc-new',
          title: 'New Profile Doc',
          content: 'New profile content',
          section: OnboardingSectionType.PROFILE,
          metadata: {},
        },
      ];

      mockRagService.getDocuments.mockReturnValue(existingDocs);
      mockRagService.removeDocument.mockResolvedValue(undefined);
      mockRagService.addDocument.mockResolvedValue(undefined);

      await service.updateSectionDocumentation(
        OnboardingSectionType.PROFILE,
        newProfileDocs
      );

      expect(mockRagService.removeDocument).toHaveBeenCalledWith(
        'profile-doc-1'
      );
      expect(mockRagService.removeDocument).not.toHaveBeenCalledWith(
        'payment-doc-1'
      );
      expect(mockRagService.addDocument).toHaveBeenCalledWith(
        newProfileDocs[0]
      );
    });
  });

  describe('getSectionDocuments', () => {
    it('should return documents for a specific section', () => {
      const profileDocs = service.getSectionDocuments(
        OnboardingSectionType.PROFILE
      );

      expect(profileDocs).toHaveLength(1);
      expect(profileDocs[0]?.section).toBe(OnboardingSectionType.PROFILE);
      expect(profileDocs[0]?.id).toBe('profile-setup');
    });
  });

  describe('testRAGResponses', () => {
    it('should test RAG system with sample queries', async () => {
      mockRagService.initialize.mockResolvedValue(undefined);
      mockRagService.query.mockResolvedValue({
        answer: 'Test answer',
        sources: [
          {
            id: 'test',
            title: 'Test Doc',
            excerpt: 'Test excerpt',
            section: OnboardingSectionType.PROFILE,
            relevanceScore: 0.8,
          },
        ],
        confidence: 0.85,
      });

      const results = await service.testRAGResponses();

      expect(results).toHaveLength(6); // 6 test queries
      expect(mockRagService.initialize).toHaveBeenCalledWith(
        onboardingDocuments
      );
      expect(mockRagService.query).toHaveBeenCalledTimes(6);

      results.forEach(result => {
        expect(result).toHaveProperty('query');
        expect(result).toHaveProperty('response');
      });
    });

    it('should handle query errors gracefully', async () => {
      mockRagService.initialize.mockResolvedValue(undefined);
      mockRagService.query
        .mockResolvedValueOnce({
          answer: 'Success',
          sources: [],
          confidence: 0.8,
        })
        .mockRejectedValueOnce(new Error('Query failed'))
        .mockResolvedValue({ answer: 'Success', sources: [], confidence: 0.8 });

      const results = await service.testRAGResponses();

      expect(results).toHaveLength(6);
      expect(results[1]?.response).toHaveProperty('error', 'Query failed');
    });
  });

  describe('getSystemStatus', () => {
    it('should return comprehensive system status', () => {
      mockRagService.getStatus.mockReturnValue({
        initialized: true,
        documentCount: 6,
        sections: [
          OnboardingSectionType.PROFILE,
          OnboardingSectionType.PAYMENT,
        ],
      });

      const status = service.getSystemStatus();

      expect(status).toEqual({
        initialized: true,
        documentCount: 6,
        sections: [
          OnboardingSectionType.PROFILE,
          OnboardingSectionType.PAYMENT,
        ],
        isLoaded: false, // Not loaded initially
        availableSections: Object.values(OnboardingSectionType),
        totalDocuments: onboardingDocuments.length,
      });
    });
  });

  describe('queryWithContext', () => {
    it('should query with section context', async () => {
      mockRagService.initialize.mockResolvedValue(undefined);
      mockRagService.query.mockResolvedValue({
        answer: 'Contextual answer',
        sources: [],
        confidence: 0.9,
      });

      const result = await service.queryWithContext(
        'How do I set up my profile?',
        OnboardingSectionType.PROFILE
      );

      expect(mockRagService.query).toHaveBeenCalledWith(
        'How do I set up my profile?',
        'Context: User is asking about the profile section of onboarding.'
      );
      expect(result.answer).toBe('Contextual answer');
    });

    it('should query without context when section not provided', async () => {
      mockRagService.initialize.mockResolvedValue(undefined);
      mockRagService.query.mockResolvedValue({
        answer: 'General answer',
        sources: [],
        confidence: 0.8,
      });

      await service.queryWithContext('General question');

      expect(mockRagService.query).toHaveBeenCalledWith(
        'General question',
        undefined
      );
    });
  });

  describe('getSectionGuidance', () => {
    it('should get guidance for profile section', async () => {
      mockRagService.query.mockResolvedValue({
        answer: 'Profile guidance',
        sources: [],
        confidence: 0.9,
      });

      const result = await service.getSectionGuidance(
        OnboardingSectionType.PROFILE
      );

      expect(mockRagService.query).toHaveBeenCalledWith(
        'What do I need to know about profile setup? What are the requirements and steps?',
        'Context: User is asking about the profile section of onboarding.'
      );
      expect(result.answer).toBe('Profile guidance');
    });

    it('should get guidance for all section types', async () => {
      mockRagService.query.mockResolvedValue({
        answer: 'Section guidance',
        sources: [],
        confidence: 0.9,
      });

      const sections = Object.values(OnboardingSectionType);

      for (const section of sections) {
        await service.getSectionGuidance(section);
      }

      expect(mockRagService.query).toHaveBeenCalledTimes(sections.length);
    });
  });

  describe('reloadDocumentation', () => {
    it('should reload documentation', async () => {
      mockRagService.initialize.mockResolvedValue(undefined);

      // First load
      await service.loadOnboardingDocumentation();
      expect(service.isDocumentationLoaded()).toBe(true);

      // Reload
      await service.reloadDocumentation();

      expect(mockRagService.initialize).toHaveBeenCalledTimes(2);
      expect(service.isDocumentationLoaded()).toBe(true);
    });
  });

  describe('singleton instance', () => {
    it('should return the same instance', () => {
      const instance1 = onboardingDataService();
      const instance2 = onboardingDataService();

      expect(instance1).toBe(instance2);
    });
  });
});
