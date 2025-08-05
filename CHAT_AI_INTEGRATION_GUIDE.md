# Chat and AI Integration Guide

This document provides a comprehensive guide for integrating the chat and AI functionality from this onboarding wizard project into your application.

## Overview

The system consists of:
- **Backend API** with OpenAI integration and RAG (Retrieval-Augmented Generation) system
- **Frontend Chat Components** with React/TypeScript
- **Vector-based document search** for contextual responses
- **Session management** for conversation history

## Architecture

```
Frontend (React/TypeScript)
├── Chat Component
├── HelpSystem Component
└── API Service Layer

Backend (Node.js/Express/TypeScript)
├── Chat Routes (/api/chat)
├── Help Routes (/api/help)
├── OpenAI Service
├── RAG Service
├── Vector Store Service
└── Document Processor Service
```

## Required Files to Copy

### Backend Files

#### Core Services
```
backend/src/services/
├── openai.service.ts          # OpenAI API integration
├── rag.service.ts             # RAG system implementation
├── vector-store.service.ts    # Vector similarity search
├── document-processor.service.ts  # Document chunking and processing
├── onboarding-data.service.ts # Data management service
└── config.service.ts          # Configuration management
```

#### API Routes
```
backend/src/routes/
├── chat.ts                    # Chat endpoint with session management
└── help.ts                    # Help/Q&A endpoint
```

#### Type Definitions
```
backend/src/types/
├── rag.ts                     # RAG system types
└── config.ts                  # Configuration types
```

#### Data
```
backend/src/data/
└── onboarding-documentation.ts  # Sample documentation data
```

#### Main Application
```
backend/src/
└── index.ts                   # Express server setup with middleware
```

#### Configuration
```
backend/
├── .env.example               # Environment variables template
├── package.json               # Dependencies
└── tsconfig.json              # TypeScript configuration
```

### Frontend Files

#### Core Components
```
frontend/src/components/
├── Chat.tsx                   # Main chat interface
├── Chat.css                   # Chat component styles
├── HelpSystem.tsx             # Contextual help component
└── HelpSystem.css             # Help system styles
```

#### Services
```
frontend/src/services/
├── api.ts                     # API client with axios
└── helpCache.ts               # Client-side caching
```

#### Types
```
frontend/src/types/
└── onboarding.ts              # Frontend type definitions
```

#### Configuration
```
frontend/
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript configuration
└── vite.config.ts             # Vite build configuration
```

## Dependencies

### Backend Dependencies

Add to your `package.json`:

```json
{
  "dependencies": {
    "@ai-sdk/openai": "^0.0.42",
    "ai": "^3.3.4",
    "compression": "^1.7.4",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-validator": "^7.2.1",
    "openai": "^4.104.0",
    "pino": "^8.16.1",
    "pino-http": "^8.5.0"
  },
  "devDependencies": {
    "@types/compression": "^1.7.5",
    "@types/cookie-parser": "^1.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.8.10",
    "typescript": "^5.2.2",
    "ts-node-dev": "^2.0.0"
  }
}
```

### Frontend Dependencies

Add to your `package.json`:

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.37",
    "@types/react-dom": "^18.2.15",
    "typescript": "^5.2.2",
    "@vitejs/plugin-react": "^4.1.1",
    "vite": "^4.5.0"
  }
}
```

## Environment Configuration

Create a `.env` file in your backend directory:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_CHAT_MODEL=gpt-3.5-turbo
OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=1000

# Server Configuration
PORT=3001
NODE_ENV=development
LOG_LEVEL=info

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

## Integration Steps

### 1. Backend Integration

1. **Copy the service files** to your backend project
2. **Install dependencies** using `npm install`
3. **Set up environment variables** in `.env` file
4. **Add routes to your Express app**:

```typescript
// In your main server file
import chatRouter from './routes/chat';
import helpRouter from './routes/help';

app.use('/api/chat', chatRouter);
app.use('/api/help', helpRouter);
```

5. **Initialize the RAG system** on server startup:

```typescript
// Add to your server startup
const server = app.listen(port, async () => {
  try {
    const { onboardingDataService } = await import('./services/onboarding-data.service');
    await onboardingDataService().loadOnboardingDocumentation();
    console.log('RAG system initialized');
  } catch (error) {
    console.error('Failed to initialize RAG system:', error);
  }
});
```

### 2. Frontend Integration

1. **Copy the component files** to your React project
2. **Install dependencies** using `npm install`
3. **Add the Chat component** to your main App component:

```typescript
import Chat from './components/Chat';
import { OnboardingContext } from './types/onboarding';

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState<OnboardingContext>({
    sessionId: `app-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
  });

  return (
    <div className="app">
      {/* Your existing app content */}
      
      {/* Add chat button */}
      <button onClick={() => setIsChatOpen(true)}>
        Open Chat
      </button>
      
      {/* Chat component */}
      <Chat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        context={chatContext}
      />
    </div>
  );
}
```

4. **Configure API base URL** in your API service if needed:

```typescript
// In frontend/src/services/api.ts
const api: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3001/api', // Adjust to your backend URL
  timeout: 60000,
});
```

### 3. Customization

#### Adding Your Own Documentation

Replace the content in `backend/src/data/onboarding-documentation.ts` with your own documentation:

```typescript
export const onboardingDocumentation: Document[] = [
  {
    id: 'your-doc-1',
    title: 'Your Documentation Title',
    content: 'Your documentation content here...',
    section: OnboardingSectionType.PROFILE, // Adjust section as needed
    metadata: {
      category: 'setup',
      priority: 'high',
    },
  },
  // Add more documents...
];
```

#### Customizing Chat Context

Modify the `OnboardingContext` interface in `frontend/src/types/onboarding.ts`:

```typescript
export interface OnboardingContext {
  currentSection?: YourSectionType;
  userQuery?: string;
  sessionId: string;
  // Add your custom context fields
  userId?: string;
  userRole?: string;
  customData?: any;
}
```

#### Styling Customization

The chat components use CSS modules. Customize the styles in:
- `frontend/src/components/Chat.css`
- `frontend/src/components/HelpSystem.css`

## API Endpoints

### Chat Endpoints

#### POST /api/chat
Send a chat message and get AI response.

**Request:**
```json
{
  "message": "How do I set up my profile?",
  "sessionId": "optional-session-id",
  "context": {
    "section": "profile",
    "userInfo": "additional context"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "chat_1234567890_abcdef",
    "message": {
      "id": "msg_1234567890_abcdef",
      "content": "To set up your profile...",
      "timestamp": "2024-01-01T12:00:00.000Z",
      "sources": [...]
    },
    "suggestions": ["What about profile photos?", "..."],
    "context": {...}
  }
}
```

#### GET /api/chat/:sessionId/history
Get conversation history for a session.

### Help Endpoints

#### POST /api/help
Get contextual help for specific questions.

**Request:**
```json
{
  "question": "What documents do I need?",
  "section": "personal_info",
  "context": "optional additional context"
}
```

## Features

### Chat System Features
- **Session Management**: Persistent conversation history
- **Context Awareness**: Understands current section/page context
- **Source Citations**: Shows relevant documentation sources
- **Suggestions**: Provides follow-up question suggestions
- **Real-time Typing**: Loading indicators and smooth UX

### RAG System Features
- **Vector Search**: Semantic similarity search through documentation
- **Document Chunking**: Intelligent text segmentation
- **Confidence Scoring**: Relevance scoring for responses
- **Caching**: Performance optimization with embedding caching
- **Fallback Handling**: Graceful degradation when no relevant docs found

### Help System Features
- **Contextual Help**: Section-specific assistance
- **Quick Questions**: Pre-defined common questions
- **Source Display**: Shows documentation sources with relevance scores
- **Performance Caching**: Client-side response caching

## Performance Considerations

1. **Embedding Caching**: The system caches OpenAI embeddings to reduce API calls
2. **Response Caching**: Frontend caches help responses for better UX
3. **Chunking Strategy**: Documents are intelligently chunked for better retrieval
4. **Timeout Handling**: Proper timeout handling for OpenAI API calls

## Security Considerations

1. **API Key Protection**: Store OpenAI API key in environment variables
2. **Input Validation**: All user inputs are validated and sanitized
3. **Rate Limiting**: Consider implementing rate limiting for production
4. **CORS Configuration**: Properly configure CORS for your domain

## Testing

The project includes comprehensive tests:
- **Backend**: Jest tests for services and routes
- **Frontend**: Vitest tests for components
- **E2E**: Playwright tests for full user flows

Run tests with:
```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test

# E2E tests
cd frontend && npm run test:e2e
```

## Deployment

### Backend Deployment
1. Build the TypeScript: `npm run build`
2. Set production environment variables
3. Start with: `npm start`

### Frontend Deployment
1. Build for production: `npm run build`
2. Serve the `dist` directory
3. Configure API base URL for production

## Troubleshooting

### Common Issues

1. **OpenAI API Errors**: Check API key and rate limits
2. **CORS Issues**: Verify FRONTEND_URL environment variable
3. **Memory Issues**: Monitor vector store memory usage with large document sets
4. **Timeout Issues**: Adjust timeout values for slower networks

### Debug Logging

Enable debug logging by setting `LOG_LEVEL=debug` in your environment variables.

## Support

For questions or issues with integration:
1. Check the test files for usage examples
2. Review the API documentation above
3. Examine the existing implementation in the source files

This integration provides a complete AI-powered chat and help system that can be adapted to any application requiring intelligent document-based assistance.