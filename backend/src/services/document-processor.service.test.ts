import {
  DocumentProcessorService,
  documentProcessorService,
} from './document-processor.service';
import { Document, OnboardingSectionType } from '../types/rag';
import { openAIService } from './openai.service';

// Mock the OpenAI service
jest.mock('./openai.service', () => ({
  openAIService: jest.fn(),
}));

describe('DocumentProcessorService', () => {
  let service: DocumentProcessorService;
  let mockOpenAIService: any;

  beforeEach(() => {
    service = documentProcessorService();

    // Create mock implementation
    mockOpenAIService = {
      generateEmbeddings: jest
        .fn()
        .mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]),
      generateResponse: jest.fn(),
      setModel: jest.fn(),
      getAvailableModels: jest.fn(),
    };

    // Mock the openAIService function to return our mock
    (
      openAIService as jest.MockedFunction<typeof openAIService>
    ).mockReturnValue(mockOpenAIService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('processDocument', () => {
    it('should process a small document successfully', async () => {
      const document: Document = {
        id: 'test-doc-1',
        title: 'Test Document',
        content: 'This is a test document content.',
        section: OnboardingSectionType.PROFILE,
        metadata: { author: 'test' },
      };

      const result = await service.processDocument(document);

      expect(result.id).toBe(document.id);
      expect(result.title).toBe(document.title);
      expect(result.content).toBe(document.content);
      expect(result.section).toBe(document.section);
      expect(result.embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0]?.content).toBe(document.content);
      expect(mockOpenAIService.generateEmbeddings).toHaveBeenCalledTimes(2); // Once for document, once for chunk
    });

    it('should create multiple chunks for large documents', async () => {
      // Create a large document that will be split into chunks
      const largeContent = 'A'.repeat(1500); // Simple content larger than chunk size
      const document: Document = {
        id: 'large-doc',
        title: 'Large Document',
        content: largeContent,
        section: OnboardingSectionType.TOURS,
        metadata: {},
      };

      const result = await service.processDocument(document);

      expect(result.chunks.length).toBeGreaterThan(1);
      expect(result.chunks[0]?.id).toBe('large-doc_chunk_0');

      // Verify first chunk has content
      expect(result.chunks[0]?.content.length).toBeGreaterThan(0);
      expect(result.chunks[0]?.documentId).toBe(document.id);
      expect(result.chunks[0]?.embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    });

    it('should handle OpenAI service errors gracefully', async () => {
      mockOpenAIService.generateEmbeddings.mockRejectedValue(
        new Error('OpenAI API error')
      );

      const document: Document = {
        id: 'error-doc',
        title: 'Error Document',
        content: 'This will cause an error.',
        section: OnboardingSectionType.PROFILE,
        metadata: {},
      };

      await expect(service.processDocument(document)).rejects.toThrow(
        'Failed to process document error-doc: OpenAI API error'
      );
    });
  });

  describe('processDocuments', () => {
    it('should process multiple documents successfully', async () => {
      const documents: Document[] = [
        {
          id: 'doc-1',
          title: 'Document 1',
          content: 'Content 1',
          section: OnboardingSectionType.PROFILE,
          metadata: {},
        },
        {
          id: 'doc-2',
          title: 'Document 2',
          content: 'Content 2',
          section: OnboardingSectionType.PAYMENT,
          metadata: {},
        },
      ];

      const results = await service.processDocuments(documents);

      expect(results).toHaveLength(2);
      expect(results[0]?.id).toBe('doc-1');
      expect(results[1]?.id).toBe('doc-2');
      expect(mockOpenAIService.generateEmbeddings).toHaveBeenCalledTimes(4); // 2 docs + 2 chunks
    });

    it('should continue processing other documents when one fails', async () => {
      mockOpenAIService.generateEmbeddings
        .mockResolvedValueOnce([0.1, 0.2, 0.3, 0.4, 0.5]) // First document embedding
        .mockResolvedValueOnce([0.1, 0.2, 0.3, 0.4, 0.5]) // First document chunk
        .mockRejectedValueOnce(new Error('API error')) // Second document fails
        .mockResolvedValueOnce([0.1, 0.2, 0.3, 0.4, 0.5]) // Third document embedding
        .mockResolvedValueOnce([0.1, 0.2, 0.3, 0.4, 0.5]); // Third document chunk

      const documents: Document[] = [
        {
          id: 'doc-1',
          title: 'Document 1',
          content: 'Content 1',
          section: OnboardingSectionType.PROFILE,
          metadata: {},
        },
        {
          id: 'doc-2',
          title: 'Document 2',
          content: 'Content 2',
          section: OnboardingSectionType.PAYMENT,
          metadata: {},
        },
        {
          id: 'doc-3',
          title: 'Document 3',
          content: 'Content 3',
          section: OnboardingSectionType.TOURS,
          metadata: {},
        },
      ];

      const results = await service.processDocuments(documents);

      expect(results).toHaveLength(2); // Only successful documents
      expect(results[0]?.id).toBe('doc-1');
      expect(results[1]?.id).toBe('doc-3');
    });
  });

  describe('validateDocument', () => {
    it('should validate a correct document', () => {
      const document: Document = {
        id: 'valid-doc',
        title: 'Valid Document',
        content: 'This is valid content.',
        section: OnboardingSectionType.PROFILE,
        metadata: {},
      };

      const result = service.validateDocument(document);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const document: Document = {
        id: '',
        title: '',
        content: '',
        section: OnboardingSectionType.PROFILE,
        metadata: {},
      };

      const result = service.validateDocument(document);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Document ID is required');
      expect(result.errors).toContain('Document title is required');
      expect(result.errors).toContain('Document content is required');
    });

    it('should detect invalid section type', () => {
      const document = {
        id: 'test-doc',
        title: 'Test Document',
        content: 'Test content',
        section: 'invalid-section' as OnboardingSectionType,
        metadata: {},
      };

      const result = service.validateDocument(document);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid onboarding section type');
    });

    it('should detect content that is too long', () => {
      const document: Document = {
        id: 'long-doc',
        title: 'Long Document',
        content: 'A'.repeat(50001), // Exceeds 50,000 character limit
        section: OnboardingSectionType.PROFILE,
        metadata: {},
      };

      const result = service.validateDocument(document);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Document content exceeds maximum length of 50,000 characters'
      );
    });
  });

  describe('preprocessContent', () => {
    it('should normalize line endings', () => {
      const content = 'Line 1\r\nLine 2\r\nLine 3';
      const result = service.preprocessContent(content);
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should reduce multiple newlines', () => {
      const content = 'Line 1\n\n\n\nLine 2';
      const result = service.preprocessContent(content);
      expect(result).toBe('Line 1\n\nLine 2');
    });

    it('should normalize whitespace', () => {
      const content = 'Word1    Word2\t\tWord3';
      const result = service.preprocessContent(content);
      expect(result).toBe('Word1 Word2 Word3');
    });

    it('should trim leading and trailing whitespace', () => {
      const content = '   Content with spaces   ';
      const result = service.preprocessContent(content);
      expect(result).toBe('Content with spaces');
    });
  });
});
