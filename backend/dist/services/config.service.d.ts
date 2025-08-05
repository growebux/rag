import { ConfigService, ModelConfig } from '../types/config';
export declare class ConfigServiceImpl implements ConfigService {
    private currentConfig;
    constructor();
    private loadConfigFromEnv;
    getModelConfiguration(): ModelConfig;
    updateModelConfiguration(config: ModelConfig): Promise<void>;
    validateModel(model: string): Promise<boolean>;
    getAvailableModels(): string[];
    private validateConfiguration;
}
export declare const configService: ConfigServiceImpl;
//# sourceMappingURL=config.service.d.ts.map