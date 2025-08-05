import { OpenAIServiceImpl } from './openai.service';

describe('OpenAIService', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    process.env['OPENAI_API_KEY'] = 'test-api-key';
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should initialize with API key from environment', () => {
      expect(() => new OpenAIServiceImpl()).not.toThrow();
    });

    it('should throw error when API key is missing', () => {
      delete process.env['OPENAI_API_KEY'];
      expect(() => new OpenAIServiceImpl()).toThrow(
        'OPENAI_API_KEY environment variable is required'
      );
    });
  });

  describe('getAvailableModels', () => {
    it('should return available models from config service', () => {
      const service = new OpenAIServiceImpl();
      const models = service.getAvailableModels();

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain('gpt-3.5-turbo');
      expect(models).toContain('text-embedding-ada-002');
    });
  });

  describe('error handling', () => {
    it('should handle 401 errors correctly', () => {
      const service = new OpenAIServiceImpl();
      const error = new Error('401 Unauthorized');

      expect(() => {
        // Access the private method for testing
        (service as any).handleOpenAIError(error);
      }).toThrow('Invalid OpenAI API key');
    });

    it('should handle 429 errors correctly', () => {
      const service = new OpenAIServiceImpl();
      const error = new Error('429 Too Many Requests');

      expect(() => {
        (service as any).handleOpenAIError(error);
      }).toThrow('OpenAI API rate limit exceeded. Please try again later.');
    });

    it('should handle 500 errors correctly', () => {
      const service = new OpenAIServiceImpl();
      const error = new Error('500 Internal Server Error');

      expect(() => {
        (service as any).handleOpenAIError(error);
      }).toThrow('OpenAI API server error. Please try again later.');
    });

    it('should handle timeout errors correctly', () => {
      const service = new OpenAIServiceImpl();
      const error = new Error('Request timeout');

      expect(() => {
        (service as any).handleOpenAIError(error);
      }).toThrow('OpenAI API request timed out. Please try again.');
    });

    it('should handle unknown errors correctly', () => {
      const service = new OpenAIServiceImpl();
      const error = new Error('Unknown error');

      expect(() => {
        (service as any).handleOpenAIError(error);
      }).toThrow('OpenAI API error: Unknown error');
    });
  });
});
