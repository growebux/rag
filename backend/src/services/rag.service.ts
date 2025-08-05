import {
  Document,
  ProcessedDocument,
  RAGResponse,
  RAGService,
  DocumentSource,
  OnboardingSectionType,
} from '../types/rag';
import { documentProcessorService } from './document-processor.service';
import { vectorStore } from './vector-store.service';
import { openAIService } from './openai.service';

export class RAGServiceImpl implements RAGService {
  private isInitialized: boolean = false;
  private readonly maxSources: number = 5;
  private readonly similarityThreshold: number = 0.3;

  /**
   * Initialize the RAG system with documents
   */
  async initialize(documents: Document[]): Promise<void> {
    const startTime = Date.now();
    console.log(
      `[DEBUG] RAG initialization started with ${documents.length} documents`
    );

    try {
      // Clear existing documents
      const clearStart = Date.now();
      await vectorStore().clear();
      console.log(
        `[DEBUG] Vector store cleared in ${Date.now() - clearStart}ms`
      );

      // Process and add documents
      const processStart = Date.now();
      console.log(`[DEBUG] Starting document processing...`);

      const processedDocuments =
        await documentProcessorService().processDocuments(documents);

      const processTime = Date.now() - processStart;
      console.log(`[DEBUG] Document processing completed in ${processTime}ms`);

      const storeStart = Date.now();
      console.log(
        `[DEBUG] Adding ${processedDocuments.length} documents to vector store...`
      );

      for (const processedDoc of processedDocuments) {
        await vectorStore().addDocument(processedDoc);
      }

      const storeTime = Date.now() - storeStart;
      console.log(
        `[DEBUG] Vector store population completed in ${storeTime}ms`
      );

      this.isInitialized = true;
      const totalTime = Date.now() - startTime;
      console.log(
        `[DEBUG] RAG system initialized with ${processedDocuments.length} documents in ${totalTime}ms`
      );
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(
        `[DEBUG] RAG initialization failed after ${totalTime}ms:`,
        error
      );
      throw new Error(
        `Failed to initialize RAG system: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Query the RAG system for contextual answers
   */
  async query(question: string, context?: string): Promise<RAGResponse> {
    if (!this.isInitialized) {
      throw new Error('RAG system not initialized. Call initialize() first.');
    }

    try {
      // Generate embedding for the query
      const queryText = context ? `${context}\n\n${question}` : question;
      const queryEmbedding =
        await openAIService().generateEmbeddings(queryText);

      // Find similar documents/chunks
      const similarResults = await vectorStore().findSimilar(
        queryEmbedding,
        this.maxSources * 2
      );

      // Filter by similarity threshold and convert to sources
      const relevantSources = similarResults
        .filter(result => result.similarity >= this.similarityThreshold)
        .slice(0, this.maxSources)
        .map(result =>
          this.createDocumentSource(
            result.document,
            result.chunk,
            result.similarity
          )
        );

      if (relevantSources.length === 0) {
        return {
          answer:
            "I don't have enough relevant information to answer that question. Could you please rephrase or ask about a specific onboarding section?",
          sources: [],
          confidence: 0,
        };
      }

      // Generate contextual answer using OpenAI
      const answer = await this.generateContextualAnswer(
        question,
        relevantSources,
        context
      );

      // Calculate confidence based on source relevance
      const confidence = this.calculateConfidence(relevantSources);

      return {
        answer,
        sources: relevantSources,
        confidence,
      };
    } catch (error) {
      throw new Error(
        `Failed to process RAG query: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update documents in the RAG system
   */
  async updateDocuments(documents: Document[]): Promise<void> {
    await this.initialize(documents);
  }

  /**
   * Add a single document to the RAG system
   */
  async addDocument(document: Document): Promise<void> {
    try {
      const processedDocument =
        await documentProcessorService().processDocument(document);
      await vectorStore().addDocument(processedDocument);

      if (!this.isInitialized) {
        this.isInitialized = true;
      }
    } catch (error) {
      throw new Error(
        `Failed to add document: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Remove a document from the RAG system
   */
  async removeDocument(documentId: string): Promise<void> {
    try {
      await vectorStore().removeDocument(documentId);
    } catch (error) {
      throw new Error(
        `Failed to remove document: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all processed documents
   */
  getDocuments(): ProcessedDocument[] {
    return vectorStore().getAllDocuments();
  }

  /**
   * Generate a contextual answer using OpenAI
   */
  private async generateContextualAnswer(
    question: string,
    sources: DocumentSource[],
    context?: string
  ): Promise<string> {
    const contextualInfo = sources
      .map(
        source => `From ${source.title} (${source.section}): ${source.excerpt}`
      )
      .join('\n\n');

    const systemPrompt = `You are a helpful assistant for the ToursByLocals onboarding process. 

CRITICAL GROUNDING INSTRUCTIONS:
- You MUST ONLY use the context from documentation provided below
- DO NOT use any information from your training data that is not explicitly provided in the context
- If the provided context doesn't contain enough information to answer the question completely, say so explicitly
- Always cite the specific document sources when providing information
- Be specific and actionable in your responses
- If information is missing or unclear in the context, state what additional documentation would be needed

FORMATTING REQUIREMENTS:
- Use PLAIN TEXT ONLY - absolutely NO markdown formatting
- Do NOT use headers, bold text, italic text, or any special formatting
- Write in simple, clear paragraphs using normal sentences
- Use numbered lists for steps but without special formatting
- Use simple dashes for bullet points if needed
- Keep responses conversational and easy to read

PROVIDED DOCUMENTATION CONTEXT:
${contextualInfo}

${context ? `Additional context: ${context}` : ''}

USER QUESTION: ${question}

Based ONLY on the documentation context provided above, please provide a clear, well-structured, and helpful answer using PLAIN TEXT ONLY. Organize your response with simple paragraphs and lists. If the context doesn't contain sufficient information to fully answer the question, explicitly state what information is missing and suggest what additional documentation sections might be helpful.`;

    try {
      const answer = await openAIService().generateResponse(systemPrompt, []);

      // Clean up the response and ensure proper formatting
      const cleanedAnswer = this.formatResponseForFrontend(answer);
      return cleanedAnswer;
    } catch (error) {
      console.error('Error generating contextual answer:', error);
      return "I'm having trouble generating a response right now. Please try again or contact support for assistance with your onboarding question.";
    }
  }

  /**
   * Format the response for better frontend consumption
   */
  private formatResponseForFrontend(rawResponse: string): string {
    // Remove all markdown formatting and clean up the response
    let formatted = rawResponse
      // Remove markdown headers (##, ###, ####, etc.)
      .replace(/^#{1,6}\s+(.*)$/gm, '$1')
      // Remove markdown bold (**text** or __text__)
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      // Remove markdown italic (*text* or _text_)
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      // Remove markdown code blocks (```text```)
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code (`text`)
      .replace(/`([^`]+)`/g, '$1')
      // Remove markdown links [text](url)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove markdown horizontal rules (---, ***, ___)
      .replace(/^[-*_]{3,}$/gm, '')
      // Clean up excessive newlines (3+ newlines become 2)
      .replace(/\n{3,}/g, '\n\n')
      // Ensure proper spacing around numbered lists
      .replace(/(\n)(\d+\.)/g, '\n\n$2')
      // Ensure proper spacing around bullet points
      .replace(/(\n)(-\s)/g, '\n\n$2')
      // Clean up extra spaces and tabs
      .replace(/[ \t]+/g, ' ')
      // Remove leading/trailing whitespace
      .trim();

    // Ensure proper sentence endings
    if (formatted && !formatted.match(/[.!?]$/)) {
      formatted += '.';
    }

    // Final cleanup - remove any remaining markdown artifacts
    formatted = formatted
      // Remove any remaining markdown formatting that might have been missed
      .replace(/[*_#`]/g, '')
      // Clean up double spaces
      .replace(/  +/g, ' ')
      // Ensure clean line breaks
      .replace(/\n\s*\n/g, '\n\n');

    return formatted;
  }

  /**
   * Create a DocumentSource from similarity results
   */
  private createDocumentSource(
    document: ProcessedDocument,
    chunk: any,
    similarity: number
  ): DocumentSource {
    const content = chunk ? chunk.content : document.content;
    const excerpt = this.createExcerpt(content, 200);

    return {
      id: chunk ? chunk.id : document.id,
      title: document.title,
      excerpt,
      section: document.section,
      relevanceScore: similarity,
    };
  }

  /**
   * Create an excerpt from content
   */
  private createExcerpt(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }

    const truncated = content.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
  }

  /**
   * Calculate confidence score based on source relevance
   */
  private calculateConfidence(sources: DocumentSource[]): number {
    if (sources.length === 0) {
      return 0;
    }

    // Average relevance score, weighted by position (first sources are more important)
    let weightedSum = 0;
    let totalWeight = 0;

    sources.forEach((source, index) => {
      const weight = 1 / (index + 1); // Decreasing weight for later sources
      weightedSum += source.relevanceScore * weight;
      totalWeight += weight;
    });

    const averageRelevance = weightedSum / totalWeight;

    // Normalize to 0-1 range and apply some adjustments
    let confidence = Math.min(averageRelevance * 1.2, 1.0);

    // Boost confidence if we have multiple relevant sources
    if (sources.length >= 3) {
      confidence = Math.min(confidence * 1.1, 1.0);
    }

    return Math.round(confidence * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get system status and statistics
   */
  getStatus(): {
    initialized: boolean;
    documentCount: number;
    sections: OnboardingSectionType[];
  } {
    const documents = this.getDocuments();
    const sections = [...new Set(documents.map(doc => doc.section))];

    return {
      initialized: this.isInitialized,
      documentCount: documents.length,
      sections,
    };
  }
}

// Export singleton instance
let _ragService: RAGServiceImpl | null = null;
export const ragService = (): RAGServiceImpl => {
  if (!_ragService) {
    _ragService = new RAGServiceImpl();
  }
  return _ragService;
};
