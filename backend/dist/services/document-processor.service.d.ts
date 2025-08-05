import { Document, ProcessedDocument } from '../types/rag';
export declare class DocumentProcessorService {
    private readonly chunkSize;
    private readonly chunkOverlap;
    /**
     * Process a document by generating embeddings and creating chunks
     */
    processDocument(document: Document): Promise<ProcessedDocument>;
    /**
     * Process multiple documents in batch with concurrency limit
     */
    processDocuments(documents: Document[]): Promise<ProcessedDocument[]>;
    /**
     * Create chunks from document content with overlapping windows
     */
    private createDocumentChunks;
    /**
     * Validate document structure and content
     */
    validateDocument(document: Document): {
        isValid: boolean;
        errors: string[];
    };
    /**
     * Preprocess document content by cleaning and normalizing text
     */
    preprocessContent(content: string): string;
}
export declare const documentProcessorService: () => DocumentProcessorService;
//# sourceMappingURL=document-processor.service.d.ts.map