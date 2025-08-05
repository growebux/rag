import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  APIResponse,
  OnboardingSection,
  SectionGuidanceResponse,
  OnboardingSectionType,
  DocumentSource,
} from '../types/onboarding';

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 60000, // Increased to 60 seconds for OpenAI processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  config => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  error => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Response Error:', error);

    // Handle different error types
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.error || 'Server error occurred';
      throw new Error(message);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('Network error - please check your connection');
    } else {
      // Something else happened
      throw new Error('An unexpected error occurred');
    }
  }
);

// API service functions
export const apiService = {
  // Get all onboarding sections
  getSections: async (): Promise<OnboardingSection[]> => {
    const response: AxiosResponse<APIResponse<OnboardingSection[]>> =
      await api.get('/sections');

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch sections');
    }

    return response.data.data;
  },

  // Get guidance for a specific section
  getSectionGuidance: async (
    sectionId: OnboardingSectionType
  ): Promise<SectionGuidanceResponse> => {
    const response: AxiosResponse<APIResponse<SectionGuidanceResponse>> =
      await api.get(`/sections/${sectionId}/guidance`);

    if (!response.data.success || !response.data.data) {
      throw new Error(
        response.data.error || 'Failed to fetch section guidance'
      );
    }

    return response.data.data;
  },

  // Get contextual help
  getHelp: async (
    question: string,
    section?: OnboardingSectionType,
    context?: string
  ): Promise<{
    question: string;
    answer: string;
    sources: DocumentSource[];
    confidence: number;
    context: {
      section: OnboardingSectionType | null;
      userContext: string | null;
    };
    suggestions: string[];
  }> => {
    const response: AxiosResponse<
      APIResponse<{
        question: string;
        answer: string;
        sources: DocumentSource[];
        confidence: number;
        context: {
          section: OnboardingSectionType | null;
          userContext: string | null;
        };
        suggestions: string[];
      }>
    > = await api.post('/help', { question, section, context });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get help');
    }

    return response.data.data;
  },

  // Send chat message
  sendChatMessage: async (
    message: string,
    sessionId: string,
    context?: string
  ): Promise<{
    sessionId: string;
    message: {
      id: string;
      content: string;
      timestamp: Date;
      sources: DocumentSource[];
    };
    suggestions: string[];
    context: any;
  }> => {
    const requestBody: any = { message, sessionId };
    
    // Parse context if it's a string
    if (context) {
      try {
        requestBody.context = JSON.parse(context);
      } catch {
        // If parsing fails, treat as plain context
        requestBody.context = { userContext: context };
      }
    }

    const response: AxiosResponse<APIResponse<{
      sessionId: string;
      message: {
        id: string;
        content: string;
        timestamp: Date;
        sources: DocumentSource[];
      };
      suggestions: string[];
      context: any;
    }>> = await api.post('/chat', requestBody);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to send chat message');
    }

    return response.data.data;
  },

  // Get chat history
  getChatHistory: async (sessionId: string): Promise<{
    sessionId: string;
    messages: {
      id: string;
      content: string;
      sender: 'user' | 'assistant';
      timestamp: Date;
      sources: DocumentSource[];
    }[];
    context: any;
    createdAt: Date;
    updatedAt: Date;
  }> => {
    const response: AxiosResponse<APIResponse<{
      sessionId: string;
      messages: {
        id: string;
        content: string;
        sender: 'user' | 'assistant';
        timestamp: Date;
        sources: DocumentSource[];
      }[];
      context: any;
      createdAt: Date;
      updatedAt: Date;
    }>> = await api.get(`/chat/${sessionId}/history`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch chat history');
    }

    return response.data.data;
  },
};

export default api;
