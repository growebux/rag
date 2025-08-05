"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vectorStore = exports.InMemoryVectorStore = void 0;
class InMemoryVectorStore {
    documents = new Map();
    /**
     * Add a processed document to the vector store
     */
    async addDocument(document) {
        this.documents.set(document.id, document);
    }
    /**
     * Remove a document from the vector store
     */
    async removeDocument(documentId) {
        this.documents.delete(documentId);
    }
    /**
     * Find similar documents/chunks based on cosine similarity
     */
    async findSimilar(queryEmbedding, topK = 5) {
        const results = [];
        // Search through all documents and their chunks
        for (const document of this.documents.values()) {
            // Calculate similarity with the full document
            const documentSimilarity = this.cosineSimilarity(queryEmbedding, document.embedding);
            results.push({
                document: document,
                similarity: documentSimilarity,
            });
            // Calculate similarity with each chunk
            for (const chunk of document.chunks) {
                const chunkSimilarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
                results.push({
                    document: document,
                    chunk: chunk,
                    similarity: chunkSimilarity,
                });
            }
        }
        // Sort by similarity (highest first) and return top K
        return results.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
    }
    /**
     * Clear all documents from the vector store
     */
    async clear() {
        this.documents.clear();
    }
    /**
     * Get the number of documents in the store
     */
    getDocumentCount() {
        return this.documents.size;
    }
    /**
     * Get all documents (for testing/debugging)
     */
    getAllDocuments() {
        return Array.from(this.documents.values());
    }
    /**
     * Calculate cosine similarity between two vectors
     */
    cosineSimilarity(vectorA, vectorB) {
        if (vectorA.length !== vectorB.length) {
            throw new Error('Vectors must have the same length for cosine similarity calculation');
        }
        let dotProduct = 0;
        let magnitudeA = 0;
        let magnitudeB = 0;
        for (let i = 0; i < vectorA.length; i++) {
            const aVal = vectorA[i] ?? 0;
            const bVal = vectorB[i] ?? 0;
            dotProduct += aVal * bVal;
            magnitudeA += aVal * aVal;
            magnitudeB += bVal * bVal;
        }
        magnitudeA = Math.sqrt(magnitudeA);
        magnitudeB = Math.sqrt(magnitudeB);
        if (magnitudeA === 0 || magnitudeB === 0) {
            return 0;
        }
        return dotProduct / (magnitudeA * magnitudeB);
    }
    /**
     * Get document by ID
     */
    getDocument(documentId) {
        return this.documents.get(documentId);
    }
    /**
     * Check if document exists
     */
    hasDocument(documentId) {
        return this.documents.has(documentId);
    }
}
exports.InMemoryVectorStore = InMemoryVectorStore;
// Export singleton instance
let _vectorStore = null;
const vectorStore = () => {
    if (!_vectorStore) {
        _vectorStore = new InMemoryVectorStore();
    }
    return _vectorStore;
};
exports.vectorStore = vectorStore;
//# sourceMappingURL=vector-store.service.js.map