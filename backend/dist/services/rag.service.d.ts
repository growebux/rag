import { Document, ProcessedDocument, RAGResponse, RAGService, OnboardingSectionType } from '../types/rag';
export declare class RAGServiceImpl implements RAGService {
    private isInitialized;
    private readonly maxSources;
    private readonly similarityThreshold;
    /**
     * Initialize the RAG system with documents
     */
    initialize(documents: Document[]): Promise<void>;
    /**
     * Query the RAG system for contextual answers
     */
    query(question: string, context?: string): Promise<RAGResponse>;
    /**
     * Update documents in the RAG system
     */
    updateDocuments(documents: Document[]): Promise<void>;
    /**
     * Add a single document to the RAG system
     */
    addDocument(document: Document): Promise<void>;
    /**
     * Remove a document from the RAG system
     */
    removeDocument(documentId: string): Promise<void>;
    /**
     * Get all processed documents
     */
    getDocuments(): ProcessedDocument[];
    /**
     * Generate a contextual answer using OpenAI
     */
    private generateContextualAnswer;
    /**
     * Format the response for better frontend consumption
     */
    private formatResponseForFrontend;
    /**
     * Create a DocumentSource from similarity results
     */
    private createDocumentSource;
    /**
     * Create an excerpt from content
     */
    private createExcerpt;
    /**
     * Calculate confidence score based on source relevance
     */
    private calculateConfidence;
    /**
     * Get system status and statistics
     */
    getStatus(): {
        initialized: boolean;
        documentCount: number;
        sections: OnboardingSectionType[];
    };
}
export declare const ragService: () => RAGServiceImpl;
//# sourceMappingURL=rag.service.d.ts.map