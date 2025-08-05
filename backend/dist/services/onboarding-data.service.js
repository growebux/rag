"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onboardingDataService = exports.OnboardingDataService = void 0;
const rag_service_1 = require("./rag.service");
const onboarding_documentation_1 = require("../data/onboarding-documentation");
const rag_1 = require("../types/rag");
class OnboardingDataService {
    isLoaded = false;
    isLoading = false;
    loadingPromise = null;
    /**
     * Initialize the RAG system with all onboarding documentation
     */
    async loadOnboardingDocumentation() {
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
        }
        finally {
            this.isLoading = false;
            this.loadingPromise = null;
        }
    }
    async performLoad() {
        const startTime = Date.now();
        try {
            console.log('🚀 [DEBUG] Starting RAG system initialization...');
            console.log(`📊 [DEBUG] Documents to process: ${onboarding_documentation_1.onboardingDocuments.length}`);
            // Log document sizes
            onboarding_documentation_1.onboardingDocuments.forEach(doc => {
                console.log(`📄 [DEBUG] Document ${doc.id}: ${doc.content.length} characters`);
            });
            const ragStartTime = Date.now();
            await (0, rag_service_1.ragService)().initialize(onboarding_documentation_1.onboardingDocuments);
            const ragEndTime = Date.now();
            this.isLoaded = true;
            console.log(`✅ [DEBUG] RAG initialization completed in ${ragEndTime - ragStartTime}ms`);
            console.log(`📈 [DEBUG] Total initialization time: ${Date.now() - startTime}ms`);
            console.log(`📋 [DEBUG] Sections loaded:`, (0, onboarding_documentation_1.getAllSections)());
        }
        catch (error) {
            this.isLoaded = false;
            console.error(`❌ [DEBUG] RAG initialization failed after ${Date.now() - startTime}ms:`, error);
            throw new Error(`Failed to load onboarding documentation: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Add or update a specific section's documentation
     */
    async updateSectionDocumentation(section, documents) {
        try {
            // Remove existing documents for this section
            const existingDocs = (0, rag_service_1.ragService)().getDocuments();
            for (const doc of existingDocs) {
                if (doc.section === section) {
                    await (0, rag_service_1.ragService)().removeDocument(doc.id);
                }
            }
            // Add new documents for this section
            for (const document of documents) {
                await (0, rag_service_1.ragService)().addDocument(document);
            }
            console.log(`Updated ${documents.length} documents for section: ${section}`);
        }
        catch (error) {
            throw new Error(`Failed to update section documentation: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get documentation for a specific section
     */
    getSectionDocuments(section) {
        return (0, onboarding_documentation_1.getDocumentsBySection)(section);
    }
    /**
     * Test RAG responses with sample queries
     */
    async testRAGResponses() {
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
                const response = await (0, rag_service_1.ragService)().query(query);
                results.push({ query, response });
                console.log(`Query: "${query}"`);
                console.log(`Answer: ${response.answer.substring(0, 100)}...`);
                console.log(`Sources: ${response.sources.length}, Confidence: ${response.confidence}`);
                console.log('---');
            }
            catch (error) {
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
        const status = (0, rag_service_1.ragService)().getStatus();
        return {
            ...status,
            isLoaded: this.isLoaded,
            availableSections: (0, onboarding_documentation_1.getAllSections)(),
            totalDocuments: onboarding_documentation_1.onboardingDocuments.length,
        };
    }
    /**
     * Reload all documentation (useful for updates)
     */
    async reloadDocumentation() {
        this.isLoaded = false;
        this.isLoading = false;
        this.loadingPromise = null;
        await this.loadOnboardingDocumentation();
    }
    /**
     * Query the RAG system with context
     */
    async queryWithContext(question, section) {
        if (!this.isLoaded) {
            await this.loadOnboardingDocumentation();
        }
        const context = section
            ? `Context: User is asking about the ${section} section of onboarding.`
            : undefined;
        return await (0, rag_service_1.ragService)().query(question, context);
    }
    /**
     * Get section-specific guidance
     */
    async getSectionGuidance(section) {
        const sectionNames = {
            [rag_1.OnboardingSectionType.PROFILE]: 'profile setup',
            [rag_1.OnboardingSectionType.PERSONAL_INFO]: 'personal information',
            [rag_1.OnboardingSectionType.PAYMENT]: 'payment setup',
            [rag_1.OnboardingSectionType.TOURS]: 'tour creation',
            [rag_1.OnboardingSectionType.CALENDAR]: 'calendar management',
            [rag_1.OnboardingSectionType.QUIZ]: 'knowledge quiz',
        };
        const query = `What do I need to know about ${sectionNames[section]}? What are the requirements and steps?`;
        return await this.queryWithContext(query, section);
    }
    /**
     * Check if documentation is loaded
     */
    isDocumentationLoaded() {
        return this.isLoaded;
    }
}
exports.OnboardingDataService = OnboardingDataService;
// Export singleton instance
let _onboardingDataService = null;
const onboardingDataService = () => {
    if (!_onboardingDataService) {
        _onboardingDataService = new OnboardingDataService();
    }
    return _onboardingDataService;
};
exports.onboardingDataService = onboardingDataService;
//# sourceMappingURL=onboarding-data.service.js.map