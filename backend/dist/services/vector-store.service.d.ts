import { ProcessedDocument, SimilarityResult, VectorStore } from '../types/rag';
export declare class InMemoryVectorStore implements VectorStore {
    private documents;
    /**
     * Add a processed document to the vector store
     */
    addDocument(document: ProcessedDocument): Promise<void>;
    /**
     * Remove a document from the vector store
     */
    removeDocument(documentId: string): Promise<void>;
    /**
     * Find similar documents/chunks based on cosine similarity
     */
    findSimilar(queryEmbedding: number[], topK?: number): Promise<SimilarityResult[]>;
    /**
     * Clear all documents from the vector store
     */
    clear(): Promise<void>;
    /**
     * Get the number of documents in the store
     */
    getDocumentCount(): number;
    /**
     * Get all documents (for testing/debugging)
     */
    getAllDocuments(): ProcessedDocument[];
    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity;
    /**
     * Get document by ID
     */
    getDocument(documentId: string): ProcessedDocument | undefined;
    /**
     * Check if document exists
     */
    hasDocument(documentId: string): boolean;
}
export declare const vectorStore: () => InMemoryVectorStore;
//# sourceMappingURL=vector-store.service.d.ts.map