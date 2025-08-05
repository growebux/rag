"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// Create Pino logger with appropriate log levels
const isTest = process.env['NODE_ENV'] === 'test';
const logger = (0, pino_1.default)({
    level: isTest ? 'silent' : process.env['LOG_LEVEL'] || 'info',
    ...(isTest
        ? {}
        : {
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                },
            },
        }),
});
// Create Express app
const app = (0, express_1.default)();
const port = process.env['PORT'] || 3001;
// Configure middleware
app.use((0, pino_http_1.default)({ logger }));
app.use((0, cors_1.default)({
    origin: process.env['FRONTEND_URL'] || 'http://localhost:5173',
    credentials: true,
}));
app.use((0, compression_1.default)());
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Health check endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env['NODE_ENV'] || 'development',
    });
});
// Import routes
const sections_1 = __importDefault(require("./routes/sections"));
const help_1 = __importDefault(require("./routes/help"));
const chat_1 = __importDefault(require("./routes/chat"));
// API routes
app.get('/api', (_req, res) => {
    res.json({
        message: 'Onboarding Wizard API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});
// Mount routes
app.use('/api/sections', sections_1.default);
app.use('/api/help', help_1.default);
app.use('/api/chat', chat_1.default);
// Error handling middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, _req, res, _next) => {
    logger.error(err, 'Unhandled error');
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
    });
});
// 404 handler
app.use('*', (_req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        timestamp: new Date().toISOString(),
    });
});
// Start server only if this file is run directly
if (require.main === module) {
    const server = app.listen(port, async () => {
        logger.info(`Server running on port ${port}`);
        logger.info(`Health check available at http://localhost:${port}/health`);
        // Initialize the RAG system on startup
        try {
            const { onboardingDataService } = await Promise.resolve().then(() => __importStar(require('./services/onboarding-data.service')));
            logger.info('Initializing RAG system...');
            await onboardingDataService().loadOnboardingDocumentation();
            logger.info('RAG system initialized successfully');
        }
        catch (error) {
            logger.error(error, 'Failed to initialize RAG system on startup');
            // Don't crash the server, just log the error
        }
    });
    // Graceful shutdown
    process.on('SIGTERM', () => {
        logger.info('SIGTERM received, shutting down gracefully');
        server.close(() => {
            logger.info('Process terminated');
            process.exit(0);
        });
    });
    process.on('SIGINT', () => {
        logger.info('SIGINT received, shutting down gracefully');
        server.close(() => {
            logger.info('Process terminated');
            process.exit(0);
        });
    });
}
exports.default = app;
//# sourceMappingURL=index.js.map