# Onboarding Wizard

An intelligent documentation-based guidance system for the ToursByLocals onboarding process.

## Project Structure

```
├── backend/          # Node.js/Express API with TypeScript
├── frontend/         # React/TypeScript application
└── .kiro/           # Kiro specifications and configuration
```

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Available Scripts

### Backend

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

### Frontend

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests with Vitest
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

## Technology Stack

### Backend
- Node.js with TypeScript
- Express.js
- OpenAI SDK
- Pino (logging)
- Jest (testing)

### Frontend
- React 18 with TypeScript
- Vite (build tool)
- Vitest (testing)
- React Testing Library

## Code Quality

Both projects are configured with:
- TypeScript strict mode
- ESLint for code linting
- Prettier for code formatting
- Jest/Vitest for testing
- High test coverage requirements (80%+)# rag
