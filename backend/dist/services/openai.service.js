"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openAIService = exports.createOpenAIService = exports.OpenAIServiceImpl = void 0;
const openai_1 = __importDefault(require("openai"));
const config_service_1 = require("./config.service");
class OpenAIServiceImpl {
    openai;
    embeddingCache = new Map();
    constructor() {
        const apiKey = process.env['OPENAI_API_KEY'] || '';
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY environment variable is required');
        }
        this.openai = new openai_1.default({
            apiKey: apiKey,
            timeout: 30000, // 30 second timeout
        });
    }
    async generateResponse(prompt, context = []) {
        try {
            const config = config_service_1.configService.getModelConfiguration();
            // Combine context and prompt
            const contextString = context.length > 0
                ? `Context:\n${context.join('\n\n')}\n\nQuestion: ${prompt}`
                : prompt;
            const completion = await Promise.race([
                this.openai.chat.completions.create({
                    model: config.chatModel,
                    messages: [
                        {
                            role: 'user',
                            content: contextString,
                        },
                    ],
                    temperature: config.temperature,
                    max_tokens: config.maxTokens,
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('OpenAI request timeout')), 25000))
            ]);
            return completion.choices[0]?.message?.content || 'No response generated';
        }
        catch (error) {
            this.handleOpenAIError(error);
            throw error;
        }
    }
    async generateEmbeddings(text) {
        const startTime = Date.now();
        const textLength = text.length;
        // Check cache first
        const cacheKey = this.createCacheKey(text);
        if (this.embeddingCache.has(cacheKey)) {
            console.log(`[DEBUG] Cache hit for embedding (${textLength} chars) in ${Date.now() - startTime}ms`);
            return this.embeddingCache.get(cacheKey);
        }
        console.log(`[DEBUG] Generating embedding for ${textLength} chars`);
        try {
            const config = config_service_1.configService.getModelConfiguration();
            const apiStart = Date.now();
            const response = await Promise.race([
                this.openai.embeddings.create({
                    model: config.embeddingModel,
                    input: text,
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('OpenAI embedding timeout')), 20000))
            ]);
            const apiTime = Date.now() - apiStart;
            const embedding = response.data[0]?.embedding || [];
            // Cache the result
            this.embeddingCache.set(cacheKey, embedding);
            const totalTime = Date.now() - startTime;
            console.log(`[DEBUG] Generated embedding (${textLength} chars) - API: ${apiTime}ms, Total: ${totalTime}ms`);
            return embedding;
        }
        catch (error) {
            const totalTime = Date.now() - startTime;
            console.error(`[DEBUG] Embedding failed (${textLength} chars) after ${totalTime}ms:`, error);
            this.handleOpenAIError(error);
            throw error;
        }
    }
    createCacheKey(text) {
        // Create a simple hash for caching
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }
    setModel(model) {
        // This method updates the model in the configuration service
        const currentConfig = config_service_1.configService.getModelConfiguration();
        // Determine if it's a chat model or embedding model
        const isChatModel = config_service_1.configService.getAvailableModels().includes(model) &&
            (model.includes('gpt') || model.includes('chat'));
        if (isChatModel) {
            config_service_1.configService
                .updateModelConfiguration({
                ...currentConfig,
                chatModel: model,
            })
                .catch(error => {
                throw new Error(`Failed to set chat model: ${error.message}`);
            });
        }
        else {
            config_service_1.configService
                .updateModelConfiguration({
                ...currentConfig,
                embeddingModel: model,
            })
                .catch(error => {
                throw new Error(`Failed to set embedding model: ${error.message}`);
            });
        }
    }
    getAvailableModels() {
        return config_service_1.configService.getAvailableModels();
    }
    handleOpenAIError(error) {
        if (error instanceof Error) {
            // Log the error for debugging
            console.error('OpenAI API Error:', error.message);
            // Check for common error types and provide better error messages
            if (error.message.includes('401')) {
                throw new Error('Invalid OpenAI API key');
            }
            else if (error.message.includes('429')) {
                throw new Error('OpenAI API rate limit exceeded. Please try again later.');
            }
            else if (error.message.includes('500')) {
                throw new Error('OpenAI API server error. Please try again later.');
            }
            else if (error.message.includes('timeout')) {
                throw new Error('OpenAI API request timed out. Please try again.');
            }
            else if (error.message.includes('insufficient permissions') || error.message.includes('Missing scopes')) {
                throw new Error('OpenAI API key has insufficient permissions. Please check your API key scopes and organization settings.');
            }
            // Re-throw the original error if we don't have a specific handler
            throw new Error(`OpenAI API error: ${error.message}`);
        }
        throw new Error('Unknown OpenAI API error occurred');
    }
}
exports.OpenAIServiceImpl = OpenAIServiceImpl;
// Export a function to create the service instance
const createOpenAIService = () => {
    return new OpenAIServiceImpl();
};
exports.createOpenAIService = createOpenAIService;
// Export a singleton instance (lazy initialization)
let _openAIService = null;
const openAIService = () => {
    if (!_openAIService) {
        _openAIService = new OpenAIServiceImpl();
    }
    return _openAIService;
};
exports.openAIService = openAIService;
//# sourceMappingURL=openai.service.js.map