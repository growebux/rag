import {
  ConfigService,
  ModelConfig,
  DEFAULT_MODEL_CONFIG,
  AVAILABLE_CHAT_MODELS,
  AVAILABLE_EMBEDDING_MODELS,
} from '../types/config';

export class ConfigServiceImpl implements ConfigService {
  private currentConfig: ModelConfig;

  constructor() {
    this.currentConfig = this.loadConfigFromEnv();
  }

  private loadConfigFromEnv(): ModelConfig {
    return {
      chatModel:
        process.env['OPENAI_CHAT_MODEL'] || DEFAULT_MODEL_CONFIG.chatModel,
      embeddingModel:
        process.env['OPENAI_EMBEDDING_MODEL'] ||
        DEFAULT_MODEL_CONFIG.embeddingModel,
      temperature: process.env['OPENAI_TEMPERATURE']
        ? parseFloat(process.env['OPENAI_TEMPERATURE'])
        : DEFAULT_MODEL_CONFIG.temperature,
      maxTokens: process.env['OPENAI_MAX_TOKENS']
        ? parseInt(process.env['OPENAI_MAX_TOKENS'], 10)
        : DEFAULT_MODEL_CONFIG.maxTokens,
    };
  }

  getModelConfiguration(): ModelConfig {
    return { ...this.currentConfig };
  }

  async updateModelConfiguration(config: ModelConfig): Promise<void> {
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

  async validateModel(model: string): Promise<boolean> {
    // Check if the model is in our list of available models
    const isValidChatModel = AVAILABLE_CHAT_MODELS.includes(
      model as (typeof AVAILABLE_CHAT_MODELS)[number]
    );
    const isValidEmbeddingModel = AVAILABLE_EMBEDDING_MODELS.includes(
      model as (typeof AVAILABLE_EMBEDDING_MODELS)[number]
    );

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

  getAvailableModels(): string[] {
    return [...AVAILABLE_CHAT_MODELS, ...AVAILABLE_EMBEDDING_MODELS];
  }

  private validateConfiguration(config: ModelConfig): void {
    if (!config.chatModel || typeof config.chatModel !== 'string') {
      throw new Error('Chat model must be a non-empty string');
    }

    if (!config.embeddingModel || typeof config.embeddingModel !== 'string') {
      throw new Error('Embedding model must be a non-empty string');
    }

    if (
      typeof config.temperature !== 'number' ||
      config.temperature < 0 ||
      config.temperature > 2
    ) {
      throw new Error('Temperature must be a number between 0 and 2');
    }

    if (
      typeof config.maxTokens !== 'number' ||
      config.maxTokens < 1 ||
      config.maxTokens > 4096
    ) {
      throw new Error('Max tokens must be a number between 1 and 4096');
    }
  }
}

// Export a singleton instance
export const configService = new ConfigServiceImpl();
