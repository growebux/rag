import { OnboardingSectionType, Document } from '../types/rag';
export declare class OnboardingDataService {
    private isLoaded;
    private isLoading;
    private loadingPromise;
    /**
     * Initialize the RAG system with all onboarding documentation
     */
    loadOnboardingDocumentation(): Promise<void>;
    private performLoad;
    /**
     * Add or update a specific section's documentation
     */
    updateSectionDocumentation(section: OnboardingSectionType, documents: Document[]): Promise<void>;
    /**
     * Get documentation for a specific section
     */
    getSectionDocuments(section: OnboardingSectionType): Document[];
    /**
     * Test RAG responses with sample queries
     */
    testRAGResponses(): Promise<{
        query: string;
        response: any;
    }[]>;
    /**
     * Get RAG system status and statistics
     */
    getSystemStatus(): {
        isLoaded: boolean;
        availableSections: OnboardingSectionType[];
        totalDocuments: number;
        initialized: boolean;
        documentCount: number;
        sections: OnboardingSectionType[];
    };
    /**
     * Reload all documentation (useful for updates)
     */
    reloadDocumentation(): Promise<void>;
    /**
     * Query the RAG system with context
     */
    queryWithContext(question: string, section?: OnboardingSectionType): Promise<any>;
    /**
     * Get section-specific guidance
     */
    getSectionGuidance(section: OnboardingSectionType): Promise<any>;
    /**
     * Check if documentation is loaded
     */
    isDocumentationLoaded(): boolean;
}
export declare const onboardingDataService: () => OnboardingDataService;
//# sourceMappingURL=onboarding-data.service.d.ts.map