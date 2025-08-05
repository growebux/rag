"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configService = exports.ConfigServiceImpl = void 0;
const config_1 = require("../types/config");
class ConfigServiceImpl {
    currentConfig;
    constructor() {
        this.currentConfig = this.loadConfigFromEnv();
    }
    loadConfigFromEnv() {
        return {
            chatModel: process.env['OPENAI_CHAT_MODEL'] || config_1.DEFAULT_MODEL_CONFIG.chatModel,
            embeddingModel: process.env['OPENAI_EMBEDDING_MODEL'] ||
                config_1.DEFAULT_MODEL_CONFIG.embeddingModel,
            temperature: process.env['OPENAI_TEMPERATURE']
                ? parseFloat(process.env['OPENAI_TEMPERATURE'])
                : config_1.DEFAULT_MODEL_CONFIG.temperature,
            maxTokens: process.env['OPENAI_MAX_TOKENS']
                ? parseInt(process.env['OPENAI_MAX_TOKENS'], 10)
                : config_1.DEFAULT_MODEL_CONFIG.maxTokens,
        };
    }
    getModelConfiguration() {
        return { ...this.currentConfig };
    }
    async updateModelConfiguration(config) {
        // Validate the configuration
        this.validateConfiguration(config);
        // Validate that the models are available
        const chatModelValid = await this.validateModel(config.chatModel);
        const embeddingModelValid = await this.validateModel(config.embeddingModel);
        if (!chatModelValid) {
            throw new Error(`Invalid chat model: ${config.chatModel}`);
        }
        if (!embeddingModelValid) {
            throw new Error(`Invalid embedding model: ${config.embeddingModel}`);
        }
        // Update the current configuration
        this.currentConfig = { ...config };
    }
    async validateModel(model) {
        // Check if the model is in our list of available models
        const isValidChatModel = config_1.AVAILABLE_CHAT_MODELS.includes(model);
        const isValidEmbeddingModel = config_1.AVAILABLE_EMBEDDING_MODELS.includes(model);
        if (!isValidChatModel && !isValidEmbeddingModel) {
            return false;
        }
        // In a real implementation, you might want to make an actual API call
        // to verify the model is accessible with the current API key
        // For now, we'll just check if the API key is present
        const apiKey = process.env['OPENAI_API_KEY'];
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY environment variable is required');
        }
        return true;
    }
    getAvailableModels() {
        return [...config_1.AVAILABLE_CHAT_MODELS, ...config_1.AVAILABLE_EMBEDDING_MODELS];
    }
    validateConfiguration(config) {
        if (!config.chatModel || typeof config.chatModel !== 'string') {
            throw new Error('Chat model must be a non-empty string');
        }
        if (!config.embeddingModel || typeof config.embeddingModel !== 'string') {
            throw new Error('Embedding model must be a non-empty string');
        }
        if (typeof config.temperature !== 'number' ||
            config.temperature < 0 ||
            config.temperature > 2) {
            throw new Error('Temperature must be a number between 0 and 2');
        }
        if (typeof config.maxTokens !== 'number' ||
            config.maxTokens < 1 ||
            config.maxTokens > 4096) {
            throw new Error('Max tokens must be a number between 1 and 4096');
        }
    }
}
exports.ConfigServiceImpl = ConfigServiceImpl;
// Export a singleton instance
exports.configService = new ConfigServiceImpl();
//# sourceMappingURL=config.service.js.map