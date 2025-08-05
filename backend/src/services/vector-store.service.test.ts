import { InMemoryVectorStore, vectorStore } from './vector-store.service';
import { ProcessedDocument, OnboardingSectionType } from '../types/rag';

describe('InMemoryVectorStore', () => {
  let store: InMemoryVectorStore;

  beforeEach(() => {
    store = new InMemoryVectorStore();
  });

  const createMockDocument = (
    id: string,
    embedding: number[]
  ): ProcessedDocument => ({
    id,
    title: `Document ${id}`,
    content: `Content for document ${id}`,
    section: OnboardingSectionType.PROFILE,
    metadata: {},
    embedding,
    chunks: [
      {
        id: `${id}_chunk_0`,
        content: `Chunk content for ${id}`,
        embedding: embedding.map(x => x + 0.1), // Slightly different embedding for chunk
        documentId: id,
        startIndex: 0,
        endIndex: 100,
      },
    ],
  });

  describe('addDocument', () => {
    it('should add a document to the store', async () => {
      const document = createMockDocument('doc1', [0.1, 0.2, 0.3]);

      await store.addDocument(document);

      expect(store.getDocumentCount()).toBe(1);
      expect(store.hasDocument('doc1')).toBe(true);
      expect(store.getDocument('doc1')).toEqual(document);
    });

    it('should replace existing document with same ID', async () => {
      const document1 = createMockDocument('doc1', [0.1, 0.2, 0.3]);
      const document2 = createMockDocument('doc1', [0.4, 0.5, 0.6]);

      await store.addDocument(document1);
      await store.addDocument(document2);

      expect(store.getDocumentCount()).toBe(1);
      expect(store.getDocument('doc1')?.embedding).toEqual([0.4, 0.5, 0.6]);
    });
  });

  describe('removeDocument', () => {
    it('should remove a document from the store', async () => {
      const document = createMockDocument('doc1', [0.1, 0.2, 0.3]);

      await store.addDocument(document);
      expect(store.hasDocument('doc1')).toBe(true);

      await store.removeDocument('doc1');
      expect(store.hasDocument('doc1')).toBe(false);
      expect(store.getDocumentCount()).toBe(0);
    });

    it('should handle removing non-existent document gracefully', async () => {
      await store.removeDocument('non-existent');
      expect(store.getDocumentCount()).toBe(0);
    });
  });

  describe('findSimilar', () => {
    beforeEach(async () => {
      // Add test documents with different embeddings
      await store.addDocument(createMockDocument('doc1', [1.0, 0.0, 0.0]));
      await store.addDocument(createMockDocument('doc2', [0.0, 1.0, 0.0]));
      await store.addDocument(createMockDocument('doc3', [0.0, 0.0, 1.0]));
    });

    it('should find similar documents based on cosine similarity', async () => {
      const queryEmbedding = [0.9, 0.1, 0.1]; // Most similar to doc1

      const results = await store.findSimilar(queryEmbedding, 3);

      expect(results).toHaveLength(3);
      expect(results[0]?.document.id).toBe('doc1');
      expect(results[0]?.similarity).toBeGreaterThan(
        results[1]?.similarity || 0
      );
    });

    it('should return both document and chunk similarities', async () => {
      const queryEmbedding = [1.0, 0.0, 0.0];

      const results = await store.findSimilar(queryEmbedding, 10);

      // Should have results for both documents and chunks
      const documentResults = results.filter(r => !r.chunk);
      const chunkResults = results.filter(r => r.chunk);

      expect(documentResults.length).toBeGreaterThan(0);
      expect(chunkResults.length).toBeGreaterThan(0);
    });

    it('should limit results to topK parameter', async () => {
      const queryEmbedding = [1.0, 0.0, 0.0];

      const results = await store.findSimilar(queryEmbedding, 2);

      expect(results).toHaveLength(2);
    });

    it('should handle empty store gracefully', async () => {
      const emptyStore = new InMemoryVectorStore();
      const queryEmbedding = [1.0, 0.0, 0.0];

      const results = await emptyStore.findSimilar(queryEmbedding, 5);

      expect(results).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should remove all documents from the store', async () => {
      await store.addDocument(createMockDocument('doc1', [0.1, 0.2, 0.3]));
      await store.addDocument(createMockDocument('doc2', [0.4, 0.5, 0.6]));

      expect(store.getDocumentCount()).toBe(2);

      await store.clear();

      expect(store.getDocumentCount()).toBe(0);
      expect(store.hasDocument('doc1')).toBe(false);
      expect(store.hasDocument('doc2')).toBe(false);
    });
  });

  describe('cosine similarity calculation', () => {
    it('should calculate perfect similarity for identical vectors', async () => {
      const document = createMockDocument('doc1', [1.0, 0.0, 0.0]);
      await store.addDocument(document);

      const results = await store.findSimilar([1.0, 0.0, 0.0], 1);

      expect(results[0]?.similarity).toBeCloseTo(1.0, 5);
    });

    it('should calculate zero similarity for orthogonal vectors', async () => {
      const document = createMockDocument('doc1', [1.0, 0.0, 0.0]);
      await store.addDocument(document);

      const results = await store.findSimilar([0.0, 1.0, 0.0], 1);

      // The result might be from a chunk with slightly different embedding
      // so we check that similarity is low (close to 0)
      expect(results[0]?.similarity).toBeLessThan(0.2);
    });

    it('should handle zero magnitude vectors', async () => {
      const document = createMockDocument('doc1', [0.0, 0.0, 0.0]);
      await store.addDocument(document);

      const results = await store.findSimilar([1.0, 0.0, 0.0], 1);

      // Check that we get a result and it handles zero vectors gracefully
      expect(results).toHaveLength(1);
      expect(results[0]?.similarity).toBeGreaterThanOrEqual(0);
    });
  });

  describe('singleton instance', () => {
    it('should return the same instance', () => {
      const instance1 = vectorStore();
      const instance2 = vectorStore();

      expect(instance1).toBe(instance2);
    });
  });

  describe('getAllDocuments', () => {
    it('should return all documents in the store', async () => {
      const doc1 = createMockDocument('doc1', [0.1, 0.2, 0.3]);
      const doc2 = createMockDocument('doc2', [0.4, 0.5, 0.6]);

      await store.addDocument(doc1);
      await store.addDocument(doc2);

      const allDocs = store.getAllDocuments();

      expect(allDocs).toHaveLength(2);
      expect(allDocs).toContainEqual(doc1);
      expect(allDocs).toContainEqual(doc2);
    });

    it('should return empty array for empty store', () => {
      const allDocs = store.getAllDocuments();
      expect(allDocs).toHaveLength(0);
    });
  });
});
