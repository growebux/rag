import express from 'express';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import pinoHttp from 'pino-http';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Pino logger with appropriate log levels
const isTest = process.env['NODE_ENV'] === 'test';
const logger = pino({
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
const app = express();
const port = process.env['PORT'] || 3001;

// Configure middleware
app.use(pinoHttp({ logger }));
app.use(
  cors({
    origin: process.env['FRONTEND_URL'] || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
import sectionsRouter from './routes/sections';
import helpRouter from './routes/help';
import chatRouter from './routes/chat';

// API routes
app.get('/api', (_req, res) => {
  res.json({
    message: 'Onboarding Wizard API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.use('/api/sections', sectionsRouter);
app.use('/api/help', helpRouter);
app.use('/api/chat', chatRouter);

// Error handling middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error(err, 'Unhandled error');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
);

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
      const { onboardingDataService } = await import('./services/onboarding-data.service');
      logger.info('Initializing RAG system...');
      await onboardingDataService().loadOnboardingDocumentation();
      logger.info('RAG system initialized successfully');
    } catch (error) {
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

export default app;
