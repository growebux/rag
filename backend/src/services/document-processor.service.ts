import {
  Document,
  ProcessedDocument,
  DocumentChunk,
  OnboardingSectionType,
} from '../types/rag';
import { openAIService } from './openai.service';

export class DocumentProcessorService {
  private readonly chunkSize: number = 800; // Larger chunks, fewer API calls
  private readonly chunkOverlap: number = 50; // Minimal overlap

  /**
   * Process a document by generating embeddings and creating chunks
   */
  async processDocument(document: Document): Promise<ProcessedDocument> {
    const startTime = Date.now();
    console.log(`[DEBUG] Starting to process document: ${document.id}`);
    
    try {
      // Generate embedding for the full document
      const embeddingStart = Date.now();
      console.log(`[DEBUG] Generating embedding for document: ${document.id}`);
      
      const documentEmbedding = await openAIService().generateEmbeddings(
        `${document.title}\n\n${document.content}`
      );
      
      const embeddingTime = Date.now() - embeddingStart;
      console.log(`[DEBUG] Document embedding completed for ${document.id} in ${embeddingTime}ms`);

      // Create chunks from the document content
      const chunksStart = Date.now();
      console.log(`[DEBUG] Creating chunks for document: ${document.id}`);
      
      const chunks = await this.createDocumentChunks(document);
      
      const chunksTime = Date.now() - chunksStart;
      console.log(`[DEBUG] Created ${chunks.length} chunks for ${document.id} in ${chunksTime}ms`);

      const processedDocument: ProcessedDocument = {
        ...document,
        embedding: documentEmbedding,
        chunks: chunks,
      };

      const totalTime = Date.now() - startTime;
      console.log(`[DEBUG] Completed processing document ${document.id} in ${totalTime}ms`);

      return processedDocument;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`[DEBUG] Failed to process document ${document.id} after ${totalTime}ms:`, error);
      throw new Error(
        `Failed to process document ${document.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Process multiple documents in batch with concurrency limit
   */
  async processDocuments(documents: Document[]): Promise<ProcessedDocument[]> {
    const processedDocuments: ProcessedDocument[] = [];
    const concurrencyLimit = 3; // Process 3 documents at a time to avoid rate limits

    for (let i = 0; i < documents.length; i += concurrencyLimit) {
      const batch = documents.slice(i, i + concurrencyLimit);
      const batchPromises = batch.map(async (document) => {
        try {
          console.log(`Processing document: ${document.id}`);
          const processed = await this.processDocument(document);
          console.log(`Successfully processed: ${document.id}`);
          return processed;
        } catch (error) {
          console.error(`Failed to process document ${document.id}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Add successful results to the array
      for (const result of batchResults) {
        if (result) {
          processedDocuments.push(result);
        }
      }
    }

    return processedDocuments;
  }

  /**
   * Create chunks from document content with overlapping windows
   */
  private async createDocumentChunks(
    document: Document
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    const content = document.content;

    console.log(`[DEBUG] Document ${document.id} content length: ${content.length} chars`);

    if (content.length <= this.chunkSize) {
      // Document is small enough to be a single chunk
      console.log(`[DEBUG] Document ${document.id} is small, creating single chunk`);
      const chunkStart = Date.now();
      
      const embedding = await openAIService().generateEmbeddings(content);
      
      const chunkTime = Date.now() - chunkStart;
      console.log(`[DEBUG] Single chunk embedding for ${document.id} took ${chunkTime}ms`);
      
      chunks.push({
        id: `${document.id}_chunk_0`,
        content: content,
        embedding: embedding,
        documentId: document.id,
        startIndex: 0,
        endIndex: content.length,
      });
      return chunks;
    }

    let startIndex = 0;
    let chunkIndex = 0;
    const chunkPromises: Promise<DocumentChunk>[] = [];

    console.log(`[DEBUG] Document ${document.id} needs chunking, chunk size: ${this.chunkSize}`);

    while (startIndex < content.length) {
      const endIndex = Math.min(startIndex + this.chunkSize, content.length);
      let chunkContent = content.slice(startIndex, endIndex);

      // Try to break at sentence boundaries to avoid cutting sentences
      if (endIndex < content.length) {
        const lastSentenceEnd = chunkContent.lastIndexOf('.');
        const lastNewline = chunkContent.lastIndexOf('\n');
        const breakPoint = Math.max(lastSentenceEnd, lastNewline);

        if (breakPoint > startIndex + this.chunkSize * 0.5) {
          chunkContent = content.slice(startIndex, startIndex + breakPoint + 1);
        }
      }

      // Create chunk processing promise
      const currentChunkIndex = chunkIndex;
      const currentStartIndex = startIndex;
      
      const chunkPromise = (async () => {
        const chunkStart = Date.now();
        console.log(`[DEBUG] Processing chunk ${currentChunkIndex} for ${document.id}`);
        
        const embedding = await openAIService().generateEmbeddings(chunkContent);
        
        const chunkTime = Date.now() - chunkStart;
        console.log(`[DEBUG] Chunk ${currentChunkIndex} for ${document.id} took ${chunkTime}ms`);

        return {
          id: `${document.id}_chunk_${currentChunkIndex}`,
          content: chunkContent.trim(),
          embedding: embedding,
          documentId: document.id,
          startIndex: currentStartIndex,
          endIndex: currentStartIndex + chunkContent.length,
        };
      })();

      chunkPromises.push(chunkPromise);

      // Move to next chunk with overlap
      const nextStartIndex =
        startIndex + chunkContent.length - this.chunkOverlap;
      // Ensure we always make progress to avoid infinite loops
      startIndex = Math.max(nextStartIndex, startIndex + 1);
      chunkIndex++;
    }

    console.log(`[DEBUG] Processing ${chunkPromises.length} chunks for ${document.id} in parallel`);
    const chunksStart = Date.now();
    
    // Process chunks in batches to avoid overwhelming the API
    const batchSize = 2;
    for (let i = 0; i < chunkPromises.length; i += batchSize) {
      const batch = chunkPromises.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch);
      chunks.push(...batchResults);
    }
    
    const chunksTime = Date.now() - chunksStart;
    console.log(`[DEBUG] All chunks for ${document.id} processed in ${chunksTime}ms`);

    return chunks;
  }



  /**
   * Validate document structure and content
   */
  validateDocument(document: Document): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!document.id || document.id.trim() === '') {
      errors.push('Document ID is required');
    }

    if (!document.title || document.title.trim() === '') {
      errors.push('Document title is required');
    }

    if (!document.content || document.content.trim() === '') {
      errors.push('Document content is required');
    }

    if (!Object.values(OnboardingSectionType).includes(document.section)) {
      errors.push('Invalid onboarding section type');
    }

    if (document.content && document.content.length > 50000) {
      errors.push(
        'Document content exceeds maximum length of 50,000 characters'
      );
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Preprocess document content by cleaning and normalizing text
   */
  preprocessContent(content: string): string {
    return content
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines
      .replace(/[ \t]+/g, ' ') // Normalize spaces and tabs (but preserve newlines)
      .trim();
  }
}

// Export singleton instance
let _documentProcessorService: DocumentProcessorService | null = null;
export const documentProcessorService = (): DocumentProcessorService => {
  if (!_documentProcessorService) {
    _documentProcessorService = new DocumentProcessorService();
  }
  return _documentProcessorService;
};
