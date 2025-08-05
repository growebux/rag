export interface ModelConfig {
    chatModel: string;
    embeddingModel: string;
    temperature: number;
    maxTokens: number;
}
export interface ConfigService {
    getModelConfiguration(): ModelConfig;
    updateModelConfiguration(_config: ModelConfig): Promise<void>;
    validateModel(_model: string): Promise<boolean>;
    getAvailableModels(): string[];
}
export declare const DEFAULT_MODEL_CONFIG: ModelConfig;
export declare const AVAILABLE_CHAT_MODELS: readonly ["gpt-3.5-turbo", "gpt-3.5-turbo-16k", "gpt-4", "gpt-4-turbo-preview", "gpt-4o", "gpt-4o-mini"];
export declare const AVAILABLE_EMBEDDING_MODELS: readonly ["text-embedding-ada-002", "text-embedding-3-small", "text-embedding-3-large"];
export type ChatModel = (typeof AVAILABLE_CHAT_MODELS)[number];
export type EmbeddingModel = (typeof AVAILABLE_EMBEDDING_MODELS)[number];
export interface OpenAIService {
    generateResponse(_prompt: string, _context: string[]): Promise<string>;
    generateEmbeddings(_text: string): Promise<number[]>;
    setModel(_model: string): void;
    getAvailableModels(): string[];
}
//# sourceMappingURL=config.d.ts.map