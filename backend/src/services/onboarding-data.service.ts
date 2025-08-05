import { ragService } from './rag.service';
import {
  onboardingDocuments,
  getDocumentsBySection,
  getAllSections,
} from '../data/onboarding-documentation';
import { OnboardingSectionType, Document } from '../types/rag';

export class OnboardingDataService {
  private isLoaded: boolean = false;
  private isLoading: boolean = false;
  private loadingPromise: Promise<void> | null = null;

  /**
   * Initialize the RAG system with all onboarding documentation
   */
  async loadOnboardingDocumentation(): Promise<void> {
    // If already loaded, return immediately
    if (this.isLoaded) {
      return;
    }

    // If currently loading, wait for the existing promise
    if (this.isLoading && this.loadingPromise) {
      return this.loadingPromise;
    }

    // Start loading
    this.isLoading = true;
    this.loadingPromise = this.performLoad();

    try {
      await this.loadingPromise;
    } finally {
      this.isLoading = false;
      this.loadingPromise = null;
    }
  }

  private async performLoad(): Promise<void> {
    const startTime = Date.now();
    try {
      console.log('🚀 [DEBUG] Starting RAG system initialization...');
      console.log(`📊 [DEBUG] Documents to process: ${onboardingDocuments.length}`);
      
      // Log document sizes
      onboardingDocuments.forEach(doc => {
        console.log(`📄 [DEBUG] Document ${doc.id}: ${doc.content.length} characters`);
      });

      const ragStartTime = Date.now();
      await ragService().initialize(onboardingDocuments);
      const ragEndTime = Date.now();
      
      this.isLoaded = true;

      console.log(`✅ [DEBUG] RAG initialization completed in ${ragEndTime - ragStartTime}ms`);
      console.log(`📈 [DEBUG] Total initialization time: ${Date.now() - startTime}ms`);
      console.log(`📋 [DEBUG] Sections loaded:`, getAllSections());
    } catch (error) {
      this.isLoaded = false;
      console.error(`❌ [DEBUG] RAG initialization failed after ${Date.now() - startTime}ms:`, error);
      throw new Error(
        `Failed to load onboarding documentation: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Add or update a specific section's documentation
   */
  async updateSectionDocumentation(
    section: OnboardingSectionType,
    documents: Document[]
  ): Promise<void> {
    try {
      // Remove existing documents for this section
      const existingDocs = ragService().getDocuments();
      for (const doc of existingDocs) {
        if (doc.section === section) {
          await ragService().removeDocument(doc.id);
        }
      }

      // Add new documents for this section
      for (const document of documents) {
        await ragService().addDocument(document);
      }

      console.log(
        `Updated ${documents.length} documents for section: ${section}`
      );
    } catch (error) {
      throw new Error(
        `Failed to update section documentation: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get documentation for a specific section
   */
  getSectionDocuments(section: OnboardingSectionType): Document[] {
    return getDocumentsBySection(section);
  }

  /**
   * Test RAG responses with sample queries
   */
  async testRAGResponses(): Promise<{ query: string; response: any }[]> {
    if (!this.isLoaded) {
      await this.loadOnboardingDocumentation();
    }

    const testQueries = [
      'How do I set up my profile photo?',
      'What payment information do I need to provide?',
      'How many tours do I need to create?',
      'What is required for the knowledge quiz?',
      'How do I manage my calendar availability?',
      'What personal information is required for verification?',
    ];

    const results = [];

    for (const query of testQueries) {
      try {
        const response = await ragService().query(query);
        results.push({ query, response });
        console.log(`Query: "${query}"`);
        console.log(`Answer: ${response.answer.substring(0, 100)}...`);
        console.log(
          `Sources: ${response.sources.length}, Confidence: ${response.confidence}`
        );
        console.log('---');
      } catch (error) {
        console.error(`Failed to process query "${query}":`, error);
        results.push({
          query,
          response: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }

    return results;
  }

  /**
   * Get RAG system status and statistics
   */
  getSystemStatus() {
    const status = ragService().getStatus();
    return {
      ...status,
      isLoaded: this.isLoaded,
      availableSections: getAllSections(),
      totalDocuments: onboardingDocuments.length,
    };
  }

  /**
   * Reload all documentation (useful for updates)
   */
  async reloadDocumentation(): Promise<void> {
    this.isLoaded = false;
    this.isLoading = false;
    this.loadingPromise = null;
    await this.loadOnboardingDocumentation();
  }

  /**
   * Query the RAG system with context
   */
  async queryWithContext(
    question: string,
    section?: OnboardingSectionType
  ): Promise<any> {
    if (!this.isLoaded) {
      await this.loadOnboardingDocumentation();
    }

    const context = section
      ? `Context: User is asking about the ${section} section of onboarding.`
      : undefined;
    return await ragService().query(question, context);
  }

  /**
   * Get section-specific guidance
   */
  async getSectionGuidance(section: OnboardingSectionType): Promise<any> {
    const sectionNames = {
      [OnboardingSectionType.PROFILE]: 'profile setup',
      [OnboardingSectionType.PERSONAL_INFO]: 'personal information',
      [OnboardingSectionType.PAYMENT]: 'payment setup',
      [OnboardingSectionType.TOURS]: 'tour creation',
      [OnboardingSectionType.CALENDAR]: 'calendar management',
      [OnboardingSectionType.QUIZ]: 'knowledge quiz',
    };

    const query = `What do I need to know about ${sectionNames[section]}? What are the requirements and steps?`;
    return await this.queryWithContext(query, section);
  }

  /**
   * Check if documentation is loaded
   */
  isDocumentationLoaded(): boolean {
    return this.isLoaded;
  }
}

// Export singleton instance
let _onboardingDataService: OnboardingDataService | null = null;
export const onboardingDataService = (): OnboardingDataService => {
  if (!_onboardingDataService) {
    _onboardingDataService = new OnboardingDataService();
  }
  return _onboardingDataService;
};
