import { RAGServiceImpl, ragService } from './rag.service';
import { Document, OnboardingSectionType } from '../types/rag';
import { documentProcessorService } from './document-processor.service';
import { vectorStore } from './vector-store.service';
import { openAIService } from './openai.service';

// Mock dependencies
jest.mock('./document-processor.service');
jest.mock('./vector-store.service');
jest.mock('./openai.service');

describe('RAGServiceImpl', () => {
  let service: RAGServiceImpl;
  let mockDocumentProcessor: any;
  let mockVectorStore: any;
  let mockOpenAIService: any;

  const sampleDocuments: Document[] = [
    {
      id: 'profile-doc',
      title: 'Profile Setup Guide',
      content:
        'To set up your profile, you need to upload a professional photo and write a compelling bio that highlights your expertise.',
      section: OnboardingSectionType.PROFILE,
      metadata: { priority: 'high' },
    },
    {
      id: 'payment-doc',
      title: 'Payment Information',
      content:
        'You need to provide your banking details and tax information to receive payments for your tours.',
      section: OnboardingSectionType.PAYMENT,
      metadata: { priority: 'medium' },
    },
  ];

  beforeEach(() => {
    service = new RAGServiceImpl();

    // Mock document processor
    mockDocumentProcessor = {
      processDocuments: jest.fn(),
      processDocument: jest.fn(),
    };
    (
      documentProcessorService as jest.MockedFunction<
        typeof documentProcessorService
      >
    ).mockReturnValue(mockDocumentProcessor);

    // Mock vector store
    mockVectorStore = {
      clear: jest.fn(),
      addDocument: jest.fn(),
      removeDocument: jest.fn(),
      findSimilar: jest.fn(),
      getAllDocuments: jest.fn(),
      getDocumentCount: jest.fn(),
    };
    (vectorStore as jest.MockedFunction<typeof vectorStore>).mockReturnValue(
      mockVectorStore
    );

    // Mock OpenAI service
    mockOpenAIService = {
      generateEmbeddings: jest.fn(),
      generateResponse: jest.fn(),
    };
    (
      openAIService as jest.MockedFunction<typeof openAIService>
    ).mockReturnValue(mockOpenAIService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize the RAG system with documents', async () => {
      const processedDocs = sampleDocuments.map(doc => ({
        ...doc,
        embedding: [0.1, 0.2, 0.3],
        chunks: [
          {
            id: `${doc.id}_chunk_0`,
            content: doc.content,
            embedding: [0.1, 0.2, 0.3],
            documentId: doc.id,
            startIndex: 0,
            endIndex: doc.content.length,
          },
        ],
      }));

      mockDocumentProcessor.processDocuments.mockResolvedValue(processedDocs);
      mockVectorStore.clear.mockResolvedValue(undefined);
      mockVectorStore.addDocument.mockResolvedValue(undefined);

      await service.initialize(sampleDocuments);

      expect(mockVectorStore.clear).toHaveBeenCalledTimes(1);
      expect(mockDocumentProcessor.processDocuments).toHaveBeenCalledWith(
        sampleDocuments
      );
      expect(mockVectorStore.addDocument).toHaveBeenCalledTimes(2);
    });

    it('should handle initialization errors', async () => {
      mockDocumentProcessor.processDocuments.mockRejectedValue(
        new Error('Processing failed')
      );

      await expect(service.initialize(sampleDocuments)).rejects.toThrow(
        'Failed to initialize RAG system: Processing failed'
      );
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      // Initialize the service first
      const processedDocs = sampleDocuments.map(doc => ({
        ...doc,
        embedding: [0.1, 0.2, 0.3],
        chunks: [
          {
            id: `${doc.id}_chunk_0`,
            content: doc.content,
            embedding: [0.1, 0.2, 0.3],
            documentId: doc.id,
            startIndex: 0,
            endIndex: doc.content.length,
          },
        ],
      }));

      mockDocumentProcessor.processDocuments.mockResolvedValue(processedDocs);
      mockVectorStore.clear.mockResolvedValue(undefined);
      mockVectorStore.addDocument.mockResolvedValue(undefined);

      await service.initialize(sampleDocuments);
    });

    it('should return relevant answers with sources', async () => {
      const question = 'How do I set up my profile?';
      const queryEmbedding = [0.1, 0.2, 0.3];

      mockOpenAIService.generateEmbeddings.mockResolvedValue(queryEmbedding);
      mockVectorStore.findSimilar.mockResolvedValue([
        {
          document: {
            id: 'profile-doc',
            title: 'Profile Setup Guide',
            content:
              'To set up your profile, you need to upload a professional photo and write a compelling bio.',
            section: OnboardingSectionType.PROFILE,
            metadata: {},
            embedding: [0.1, 0.2, 0.3],
            chunks: [],
          },
          similarity: 0.85,
        },
      ]);
      mockOpenAIService.generateResponse.mockResolvedValue(
        'To set up your profile, upload a professional photo and write a compelling bio highlighting your expertise.'
      );

      const result = await service.query(question);

      expect(result.answer).toContain('professional photo');
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0]?.title).toBe('Profile Setup Guide');
      expect(result.sources[0]?.section).toBe(OnboardingSectionType.PROFILE);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle queries with no relevant results', async () => {
      const question = 'How do I fly to Mars?';

      mockOpenAIService.generateEmbeddings.mockResolvedValue([0.1, 0.2, 0.3]);
      mockVectorStore.findSimilar.mockResolvedValue([
        {
          document: {
            id: 'profile-doc',
            title: 'Profile Setup Guide',
            content: 'Profile content',
            section: OnboardingSectionType.PROFILE,
            metadata: {},
            embedding: [0.1, 0.2, 0.3],
            chunks: [],
          },
          similarity: 0.1, // Below threshold
        },
      ]);

      const result = await service.query(question);

      expect(result.answer).toContain("don't have enough relevant information");
      expect(result.sources).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });

    it('should include context in query processing', async () => {
      const question = 'What information do I need?';
      const context = 'Setting up payment information';

      mockOpenAIService.generateEmbeddings.mockResolvedValue([0.1, 0.2, 0.3]);
      mockVectorStore.findSimilar.mockResolvedValue([
        {
          document: {
            id: 'payment-doc',
            title: 'Payment Information',
            content: 'You need banking details and tax information.',
            section: OnboardingSectionType.PAYMENT,
            metadata: {},
            embedding: [0.1, 0.2, 0.3],
            chunks: [],
          },
          similarity: 0.75,
        },
      ]);
      mockOpenAIService.generateResponse.mockResolvedValue(
        'For payment setup, you need banking details and tax information.'
      );

      const result = await service.query(question, context);

      expect(mockOpenAIService.generateEmbeddings).toHaveBeenCalledWith(
        `${context}\n\n${question}`
      );
      expect(result.sources[0]?.section).toBe(OnboardingSectionType.PAYMENT);
    });

    it('should throw error when not initialized', async () => {
      const uninitializedService = new RAGServiceImpl();

      await expect(uninitializedService.query('test question')).rejects.toThrow(
        'RAG system not initialized'
      );
    });
  });

  describe('addDocument', () => {
    it('should add a single document to the system', async () => {
      const document = sampleDocuments[0]!;
      const processedDoc = {
        ...document,
        embedding: [0.1, 0.2, 0.3],
        chunks: [],
      };

      mockDocumentProcessor.processDocument.mockResolvedValue(processedDoc);
      mockVectorStore.addDocument.mockResolvedValue(undefined);

      await service.addDocument(document);

      expect(mockDocumentProcessor.processDocument).toHaveBeenCalledWith(
        document
      );
      expect(mockVectorStore.addDocument).toHaveBeenCalledWith(processedDoc);
    });

    it('should handle document processing errors', async () => {
      const document = sampleDocuments[0]!;
      mockDocumentProcessor.processDocument.mockRejectedValue(
        new Error('Processing failed')
      );

      await expect(service.addDocument(document)).rejects.toThrow(
        'Failed to add document: Processing failed'
      );
    });
  });

  describe('removeDocument', () => {
    it('should remove a document from the system', async () => {
      mockVectorStore.removeDocument.mockResolvedValue(undefined);

      await service.removeDocument('test-doc-id');

      expect(mockVectorStore.removeDocument).toHaveBeenCalledWith(
        'test-doc-id'
      );
    });
  });

  describe('getDocuments', () => {
    it('should return all processed documents', () => {
      const mockDocs = [
        {
          id: 'doc1',
          title: 'Document 1',
          content: 'Content 1',
          section: OnboardingSectionType.PROFILE,
          metadata: {},
          embedding: [0.1, 0.2, 0.3],
          chunks: [],
        },
      ];

      mockVectorStore.getAllDocuments.mockReturnValue(mockDocs);

      const result = service.getDocuments();

      expect(result).toEqual(mockDocs);
      expect(mockVectorStore.getAllDocuments).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStatus', () => {
    it('should return system status', () => {
      const mockDocs = [
        {
          id: 'doc1',
          title: 'Document 1',
          content: 'Content 1',
          section: OnboardingSectionType.PROFILE,
          metadata: {},
          embedding: [0.1, 0.2, 0.3],
          chunks: [],
        },
        {
          id: 'doc2',
          title: 'Document 2',
          content: 'Content 2',
          section: OnboardingSectionType.PAYMENT,
          metadata: {},
          embedding: [0.1, 0.2, 0.3],
          chunks: [],
        },
      ];

      mockVectorStore.getAllDocuments.mockReturnValue(mockDocs);

      const status = service.getStatus();

      expect(status.initialized).toBe(false); // Not initialized in this test
      expect(status.documentCount).toBe(2);
      expect(status.sections).toContain(OnboardingSectionType.PROFILE);
      expect(status.sections).toContain(OnboardingSectionType.PAYMENT);
    });
  });

  describe('singleton instance', () => {
    it('should return the same instance', () => {
      const instance1 = ragService();
      const instance2 = ragService();

      expect(instance1).toBe(instance2);
    });
  });
});
