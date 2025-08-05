// Core onboarding types based on the design document

export enum OnboardingSectionType {
  // eslint-disable-next-line no-unused-vars
  PROFILE = 'profile',
  // eslint-disable-next-line no-unused-vars
  PERSONAL_INFO = 'personal_info',
  // eslint-disable-next-line no-unused-vars
  PAYMENT = 'payment',
  // eslint-disable-next-line no-unused-vars
  TOURS = 'tours',
  // eslint-disable-next-line no-unused-vars
  CALENDAR = 'calendar',
  // eslint-disable-next-line no-unused-vars
  QUIZ = 'quiz',
}

export interface OnboardingSection {
  id: OnboardingSectionType;
  title: string;
  description: string;
  requirements: string[];
  order: number;
  estimatedTime: string;
  status: 'available' | 'current' | 'completed';
  dependencies: string[];
}

export interface HelpContent {
  title: string;
  content: string;
  examples?: string[];
  commonIssues?: string[];
}

export interface OnboardingContext {
  currentSection?: OnboardingSectionType;
  userQuery?: string;
  sessionId: string;
  sectionTitle?: string;
  sectionDescription?: string;
  userProgress?: {
    completedSections: OnboardingSectionType[];
    currentStep: number;
    totalSteps: number;
  };
}

export interface DocumentSource {
  id: string;
  title: string;
  excerpt: string;
  section: OnboardingSectionType;
  relevanceScore: number;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface SectionGuidanceResponse {
  section: OnboardingSection;
  guidance: HelpContent;
  relatedSections: OnboardingSection[];
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  sources?: DocumentSource[];
}

export interface ChatResponse {
  message: string;
  sources: DocumentSource[];
  suggestions: string[];
  sessionId: string;
}
