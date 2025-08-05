import { OpenAIService } from '../types/config';
export declare class OpenAIServiceImpl implements OpenAIService {
    private openai;
    private embeddingCache;
    constructor();
    generateResponse(prompt: string, context?: string[]): Promise<string>;
    generateEmbeddings(text: string): Promise<number[]>;
    private createCacheKey;
    setModel(model: string): void;
    getAvailableModels(): string[];
    private handleOpenAIError;
}
export declare const createOpenAIService: () => OpenAIServiceImpl;
export declare const openAIService: () => OpenAIServiceImpl;
//# sourceMappingURL=openai.service.d.ts.map