import { onboardingDataService } from './onboarding-data.service';
import { OnboardingSectionType } from '../types/rag';

// This is an integration test that requires actual OpenAI API calls
// Skip by default to avoid API costs during regular testing
describe.skip('RAG Integration Tests', () => {
  let service: ReturnType<typeof onboardingDataService>;

  beforeAll(() => {
    service = onboardingDataService();
  });

  describe('Real RAG System Integration', () => {
    it('should load documentation and answer questions', async () => {
      // Load the documentation
      await service.loadOnboardingDocumentation();

      // Test basic queries
      const profileQuery = await service.queryWithContext(
        'What do I need for my profile photo?',
        OnboardingSectionType.PROFILE
      );

      expect(profileQuery.answer).toBeDefined();
      expect(profileQuery.sources.length).toBeGreaterThan(0);
      expect(profileQuery.confidence).toBeGreaterThan(0);

      console.log('Profile Query Result:');
      console.log('Answer:', profileQuery.answer);
      console.log('Sources:', profileQuery.sources.length);
      console.log('Confidence:', profileQuery.confidence);
    }, 30000); // 30 second timeout for API calls

    it('should provide section-specific guidance', async () => {
      const sections = [
        OnboardingSectionType.PROFILE,
        OnboardingSectionType.PAYMENT,
        OnboardingSectionType.TOURS,
      ];

      for (const section of sections) {
        const guidance = await service.getSectionGuidance(section);

        expect(guidance.answer).toBeDefined();
        expect(guidance.answer.length).toBeGreaterThan(50);

        console.log(`\n${section.toUpperCase()} Guidance:`);
        console.log(guidance.answer.substring(0, 200) + '...');
      }
    }, 60000); // 60 second timeout for multiple API calls

    it('should handle various question types', async () => {
      const questions = [
        'How many tours do I need to create?',
        'What payment information is required?',
        'How long does verification take?',
        'What happens if I fail the quiz?',
      ];

      for (const question of questions) {
        const response = await service.queryWithContext(question);

        expect(response.answer).toBeDefined();
        expect(response.answer).not.toContain(
          "don't have enough relevant information"
        );

        console.log(`\nQ: ${question}`);
        console.log(`A: ${response.answer.substring(0, 150)}...`);
        console.log(
          `Sources: ${response.sources.length}, Confidence: ${response.confidence}`
        );
      }
    }, 90000); // 90 second timeout for multiple API calls
  });

  describe('System Status and Performance', () => {
    it('should report correct system status', async () => {
      await service.loadOnboardingDocumentation();

      const status = service.getSystemStatus();

      expect(status.isLoaded).toBe(true);
      expect(status.totalDocuments).toBe(6);
      expect(status.availableSections).toHaveLength(6);
      expect(status.documentCount).toBeGreaterThan(0);

      console.log('System Status:', status);
    });

    it('should handle document updates', async () => {
      await service.loadOnboardingDocumentation();

      const newDoc = {
        id: 'test-update',
        title: 'Test Update Document',
        content: 'This is a test document for updates.',
        section: OnboardingSectionType.PROFILE,
        metadata: { test: true },
      };

      await service.updateSectionDocumentation(OnboardingSectionType.PROFILE, [
        newDoc,
      ]);

      const response = await service.queryWithContext(
        'Tell me about test updates'
      );

      // Should find the new document
      expect(
        response.sources.some((source: any) => source.id === 'test-update')
      ).toBe(true);
    }, 30000);
  });
});
