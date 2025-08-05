# Vercel Deployment Guide

## Deployment Options

You have two main options for deploying your monorepo to Vercel:

### Option 1: Single Monorepo Deployment (Recommended)

Deploy both frontend and backend from the same repository with the root `vercel.json` configuration.

**Steps:**
1. Use the root `vercel.json` and `package.json` files I created
2. Set up environment variables in Vercel dashboard
3. Deploy from the root directory

**Pros:**
- Single deployment
- Shared environment variables
- Easier to manage

**Cons:**
- More complex configuration
- Both services redeploy together

### Option 2: Separate Project Deployments (Simpler)

Deploy frontend and backend as separate Vercel projects.

**Steps:**
1. Create two separate Vercel projects
2. Deploy frontend from `/frontend` directory
3. Deploy backend from `/backend` directory
4. Configure environment variables separately

**Pros:**
- Simpler configuration
- Independent deployments
- Better for different teams

**Cons:**
- Need to manage CORS between different domains
- Two separate projects to maintain

## Recommended Approach: Option 2 (Separate Projects)

For your current setup, I recommend Option 2. Here's how to do it:

### Step 1: Deploy Backend

1. **Create a new Vercel project for backend:**
   ```bash
   cd backend
   vercel --prod
   ```

2. **Set environment variables in Vercel dashboard:**
   ```
   OPENAI_API_KEY=your_openai_api_key
   OPENAI_CHAT_MODEL=gpt-3.5-turbo
   OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
   OPENAI_TEMPERATURE=0.7
   OPENAI_MAX_TOKENS=1000
   NODE_ENV=production
   LOG_LEVEL=info
   FRONTEND_URL=https://your-frontend-domain.vercel.app
   ```

3. **Note the backend URL** (e.g., `https://your-backend.vercel.app`)

### Step 2: Deploy Frontend

1. **Update API base URL in frontend:**
   
   Edit `frontend/src/services/api.ts`:
   ```typescript
   const api: AxiosInstance = axios.create({
     baseURL: process.env.NODE_ENV === 'production' 
       ? 'https://your-backend.vercel.app/api'
       : '/api',
     timeout: 60000,
   });
   ```

2. **Create environment file for frontend:**
   
   Create `frontend/.env.production`:
   ```
   VITE_API_BASE_URL=https://your-backend.vercel.app/api
   ```

3. **Update API service to use environment variable:**
   
   Edit `frontend/src/services/api.ts`:
   ```typescript
   const api: AxiosInstance = axios.create({
     baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
     timeout: 60000,
   });
   ```

4. **Deploy frontend:**
   ```bash
   cd frontend
   vercel --prod
   ```

### Step 3: Update CORS Configuration

Update your backend's CORS configuration to allow your frontend domain:

In `backend/src/index.ts`:
```typescript
app.use(
  cors({
    origin: [
      process.env['FRONTEND_URL'] || 'http://localhost:5173',
      'https://your-frontend-domain.vercel.app' // Add your actual frontend URL
    ],
    credentials: true,
  })
);
```

## Alternative: Monorepo Deployment

If you prefer to deploy as a monorepo, use the root `vercel.json` I created:

### Steps:

1. **Install root dependencies:**
   ```bash
   npm install
   ```

2. **Set environment variables in Vercel dashboard:**
   ```
   OPENAI_API_KEY=your_openai_api_key
   OPENAI_CHAT_MODEL=gpt-3.5-turbo
   OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
   OPENAI_TEMPERATURE=0.7
   OPENAI_MAX_TOKENS=1000
   NODE_ENV=production
   LOG_LEVEL=info
   FRONTEND_URL=https://your-domain.vercel.app
   ```

3. **Deploy from root:**
   ```bash
   vercel --prod
   ```

## Environment Variables Setup

### Required Backend Environment Variables:
```
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_CHAT_MODEL=gpt-3.5-turbo
OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=1000
NODE_ENV=production
LOG_LEVEL=info
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### Optional Frontend Environment Variables:
```
VITE_API_BASE_URL=https://your-backend-domain.vercel.app/api
```

## Build Commands

### For Monorepo (if using Option 1):
- **Build Command:** `npm run build`
- **Output Directory:** `frontend/dist`
- **Install Command:** `npm install`

### For Separate Projects:

**Frontend:**
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

**Backend:**
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

## Troubleshooting

### Common Issues:

1. **"vite: command not found"**
   - Make sure you're deploying from the correct directory
   - Ensure `vite` is in devDependencies
   - Use the correct build command

2. **CORS Errors**
   - Update FRONTEND_URL environment variable
   - Check CORS configuration in backend

3. **OpenAI API Errors**
   - Verify OPENAI_API_KEY is set correctly
   - Check API key permissions and billing

4. **Build Timeouts**
   - Increase function timeout in vercel.json
   - Optimize build process

### Debug Steps:

1. **Check build logs** in Vercel dashboard
2. **Verify environment variables** are set
3. **Test API endpoints** directly
4. **Check function logs** for runtime errors

## Recommended Configuration

For your current project, I recommend:

1. **Use separate deployments** (Option 2)
2. **Deploy backend first** and note the URL
3. **Update frontend API configuration** with backend URL
4. **Deploy frontend** with updated configuration
5. **Test the integration** thoroughly

This approach gives you the most flexibility and is easier to debug and maintain.