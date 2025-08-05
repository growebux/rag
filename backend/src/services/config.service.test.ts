import { ConfigServiceImpl } from './config.service';
import { ModelConfig, DEFAULT_MODEL_CONFIG } from '../types/config';

describe('ConfigService', () => {
  let configService: ConfigServiceImpl;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    // Set required API key for tests
    process.env['OPENAI_API_KEY'] = 'test-api-key';
    configService = new ConfigServiceImpl();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should load default configuration when no env vars are set', () => {
      const config = configService.getModelConfiguration();
      expect(config).toEqual(DEFAULT_MODEL_CONFIG);
    });

    it('should load configuration from environment variables', () => {
      process.env['OPENAI_CHAT_MODEL'] = 'gpt-4';
      process.env['OPENAI_EMBEDDING_MODEL'] = 'text-embedding-3-small';
      process.env['OPENAI_TEMPERATURE'] = '0.5';
      process.env['OPENAI_MAX_TOKENS'] = '2000';

      const service = new ConfigServiceImpl();
      const config = service.getModelConfiguration();

      expect(config).toEqual({
        chatModel: 'gpt-4',
        embeddingModel: 'text-embedding-3-small',
        temperature: 0.5,
        maxTokens: 2000,
      });
    });
  });

  describe('getModelConfiguration', () => {
    it('should return a copy of the current configuration', () => {
      const config1 = configService.getModelConfiguration();
      const config2 = configService.getModelConfiguration();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Should be different objects
    });
  });

  describe('updateModelConfiguration', () => {
    const validConfig: ModelConfig = {
      chatModel: 'gpt-4',
      embeddingModel: 'text-embedding-3-small',
      temperature: 0.5,
      maxTokens: 1500,
    };

    it('should update configuration with valid config', async () => {
      await configService.updateModelConfiguration(validConfig);
      const updatedConfig = configService.getModelConfiguration();
      expect(updatedConfig).toEqual(validConfig);
    });

    it('should throw error for invalid chat model', async () => {
      const invalidConfig = { ...validConfig, chatModel: 'invalid-model' };
      await expect(
        configService.updateModelConfiguration(invalidConfig)
      ).rejects.toThrow('Invalid chat model: invalid-model');
    });

    it('should throw error for invalid embedding model', async () => {
      const invalidConfig = {
        ...validConfig,
        embeddingModel: 'invalid-embedding',
      };
      await expect(
        configService.updateModelConfiguration(invalidConfig)
      ).rejects.toThrow('Invalid embedding model: invalid-embedding');
    });

    it('should throw error for invalid temperature', async () => {
      const invalidConfig = { ...validConfig, temperature: 3 };
      await expect(
        configService.updateModelConfiguration(invalidConfig)
      ).rejects.toThrow('Temperature must be a number between 0 and 2');
    });

    it('should throw error for invalid maxTokens', async () => {
      const invalidConfig = { ...validConfig, maxTokens: 5000 };
      await expect(
        configService.updateModelConfiguration(invalidConfig)
      ).rejects.toThrow('Max tokens must be a number between 1 and 4096');
    });

    it('should throw error for empty chat model', async () => {
      const invalidConfig = { ...validConfig, chatModel: '' };
      await expect(
        configService.updateModelConfiguration(invalidConfig)
      ).rejects.toThrow('Chat model must be a non-empty string');
    });

    it('should throw error for empty embedding model', async () => {
      const invalidConfig = { ...validConfig, embeddingModel: '' };
      await expect(
        configService.updateModelConfiguration(invalidConfig)
      ).rejects.toThrow('Embedding model must be a non-empty string');
    });
  });

  describe('validateModel', () => {
    it('should return true for valid chat models', async () => {
      const result = await configService.validateModel('gpt-3.5-turbo');
      expect(result).toBe(true);
    });

    it('should return true for valid embedding models', async () => {
      const result = await configService.validateModel(
        'text-embedding-ada-002'
      );
      expect(result).toBe(true);
    });

    it('should return false for invalid models', async () => {
      const result = await configService.validateModel('invalid-model');
      expect(result).toBe(false);
    });

    it('should throw error when API key is missing', async () => {
      delete process.env['OPENAI_API_KEY'];
      await expect(
        configService.validateModel('gpt-3.5-turbo')
      ).rejects.toThrow('OPENAI_API_KEY environment variable is required');
    });
  });

  describe('getAvailableModels', () => {
    it('should return all available models', () => {
      const models = configService.getAvailableModels();
      expect(models).toContain('gpt-3.5-turbo');
      expect(models).toContain('gpt-4');
      expect(models).toContain('text-embedding-ada-002');
      expect(models).toContain('text-embedding-3-small');
      expect(models.length).toBeGreaterThan(0);
    });
  });
});
