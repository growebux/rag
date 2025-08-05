"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AVAILABLE_EMBEDDING_MODELS = exports.AVAILABLE_CHAT_MODELS = exports.DEFAULT_MODEL_CONFIG = void 0;
exports.DEFAULT_MODEL_CONFIG = {
    chatModel: 'gpt-3.5-turbo',
    embeddingModel: 'text-embedding-ada-002',
    temperature: 0.7,
    maxTokens: 1000,
};
exports.AVAILABLE_CHAT_MODELS = [
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-16k',
    'gpt-4',
    'gpt-4-turbo-preview',
    'gpt-4o',
    'gpt-4o-mini',
];
exports.AVAILABLE_EMBEDDING_MODELS = [
    'text-embedding-ada-002',
    'text-embedding-3-small',
    'text-embedding-3-large',
];
//# sourceMappingURL=config.js.map