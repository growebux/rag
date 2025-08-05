export declare enum OnboardingSectionType {
    PROFILE = "PROFILE",
    PERSONAL_INFO = "PERSONAL_INFO",
    PAYMENT = "PAYMENT",
    TOURS = "TOURS",
    CALENDAR = "CALENDAR",
    QUIZ = "QUIZ"
}
export interface Document {
    id: string;
    title: string;
    content: string;
    section: OnboardingSectionType;
    metadata: Record<string, any>;
}
export interface DocumentSource {
    id: string;
    title: string;
    excerpt: string;
    section: OnboardingSectionType;
    relevanceScore: number;
}
export interface RAGResponse {
    answer: string;
    sources: DocumentSource[];
    confidence: number;
}
export interface ProcessedDocument extends Document {
    embedding: number[];
    chunks: DocumentChunk[];
}
export interface DocumentChunk {
    id: string;
    content: string;
    embedding: number[];
    documentId: string;
    startIndex: number;
    endIndex: number;
}
export interface SimilarityResult {
    document: ProcessedDocument;
    chunk?: DocumentChunk;
    similarity: number;
}
export interface RAGService {
    initialize(_documents: Document[]): Promise<void>;
    query(_question: string, _context?: string): Promise<RAGResponse>;
    updateDocuments(_documents: Document[]): Promise<void>;
    addDocument(_document: Document): Promise<void>;
    removeDocument(_documentId: string): Promise<void>;
    getDocuments(): ProcessedDocument[];
}
export interface VectorStore {
    addDocument(_document: ProcessedDocument): Promise<void>;
    removeDocument(_documentId: string): Promise<void>;
    findSimilar(_queryEmbedding: number[], _topK?: number): Promise<SimilarityResult[]>;
    clear(): Promise<void>;
    getDocumentCount(): number;
}
//# sourceMappingURL=rag.d.ts.map