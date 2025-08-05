import { ProcessedDocument, SimilarityResult, VectorStore } from '../types/rag';

export class InMemoryVectorStore implements VectorStore {
  private documents: Map<string, ProcessedDocument> = new Map();

  /**
   * Add a processed document to the vector store
   */
  async addDocument(document: ProcessedDocument): Promise<void> {
    this.documents.set(document.id, document);
  }

  /**
   * Remove a document from the vector store
   */
  async removeDocument(documentId: string): Promise<void> {
    this.documents.delete(documentId);
  }

  /**
   * Find similar documents/chunks based on cosine similarity
   */
  async findSimilar(
    queryEmbedding: number[],
    topK: number = 5
  ): Promise<SimilarityResult[]> {
    const results: SimilarityResult[] = [];

    // Search through all documents and their chunks
    for (const document of this.documents.values()) {
      // Calculate similarity with the full document
      const documentSimilarity = this.cosineSimilarity(
        queryEmbedding,
        document.embedding
      );
      results.push({
        document: document,
        similarity: documentSimilarity,
      });

      // Calculate similarity with each chunk
      for (const chunk of document.chunks) {
        const chunkSimilarity = this.cosineSimilarity(
          queryEmbedding,
          chunk.embedding
        );
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
  async clear(): Promise<void> {
    this.documents.clear();
  }

  /**
   * Get the number of documents in the store
   */
  getDocumentCount(): number {
    return this.documents.size;
  }

  /**
   * Get all documents (for testing/debugging)
   */
  getAllDocuments(): ProcessedDocument[] {
    return Array.from(this.documents.values());
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error(
        'Vectors must have the same length for cosine similarity calculation'
      );
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
  getDocument(documentId: string): ProcessedDocument | undefined {
    return this.documents.get(documentId);
  }

  /**
   * Check if document exists
   */
  hasDocument(documentId: string): boolean {
    return this.documents.has(documentId);
  }
}

// Export singleton instance
let _vectorStore: InMemoryVectorStore | null = null;
export const vectorStore = (): InMemoryVectorStore => {
  if (!_vectorStore) {
    _vectorStore = new InMemoryVectorStore();
  }
  return _vectorStore;
};
