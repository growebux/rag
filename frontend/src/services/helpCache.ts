// Help content caching service for better performance
import { OnboardingSectionType } from '../types/onboarding';

interface CachedHelpResponse {
  question: string;
  answer: string;
  sources: any[];
  confidence: number;
  context: {
    section: OnboardingSectionType | null;
    userContext: string | null;
  };
  suggestions: string[];
  timestamp: number;
  expiresAt: number;
}

class HelpCacheService {
  private cache = new Map<string, CachedHelpResponse>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;

  private generateCacheKey(
    question: string,
    section?: OnboardingSectionType,
    context?: string
  ): string {
    const normalizedQuestion = question.toLowerCase().trim();
    const sectionKey = section || 'general';
    const contextKey = context ? context.toLowerCase().trim() : '';
    return `${sectionKey}:${normalizedQuestion}:${contextKey}`;
  }

  private isExpired(item: CachedHelpResponse): boolean {
    return Date.now() > item.expiresAt;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  private evictOldest(): void {
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entries (simple LRU-like behavior)
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      // Remove oldest 20% of entries
      const toRemove = Math.floor(entries.length * 0.2);
      for (let i = 0; i < toRemove; i++) {
        const entry = entries[i];
        if (entry) {
          this.cache.delete(entry[0]);
        }
      }
    }
  }

  get(
    question: string,
    section?: OnboardingSectionType,
    context?: string
  ): CachedHelpResponse | null {
    this.evictExpired();

    const key = this.generateCacheKey(question, section, context);
    const item = this.cache.get(key);

    if (item && !this.isExpired(item)) {
      // Update timestamp for LRU behavior
      item.timestamp = Date.now();
      return item;
    }

    if (item) {
      this.cache.delete(key);
    }

    return null;
  }

  set(
    question: string,
    response: Omit<CachedHelpResponse, 'timestamp' | 'expiresAt'>,
    section?: OnboardingSectionType,
    context?: string
  ): void {
    this.evictExpired();
    this.evictOldest();

    const key = this.generateCacheKey(question, section, context);
    const now = Date.now();

    const cachedResponse: CachedHelpResponse = {
      ...response,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION,
    };

    this.cache.set(key, cachedResponse);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
    };
  }

  // Method to preload common questions for a section
  async preloadCommonQuestions(section: OnboardingSectionType): Promise<void> {
    const commonQuestions = this.getCommonQuestionsForSection(section);

    // This would typically make API calls to preload responses
    // For now, we'll just log the intent
    console.log(
      `Preloading ${commonQuestions.length} common questions for section: ${section}`
    );
  }

  private getCommonQuestionsForSection(
    section: OnboardingSectionType
  ): string[] {
    const commonQuestions: Record<OnboardingSectionType, string[]> = {
      [OnboardingSectionType.PROFILE]: [
        'What makes a good profile photo?',
        'How should I write my bio?',
        'What expertise areas should I choose?',
        'How do I verify my identity?',
      ],
      [OnboardingSectionType.PERSONAL_INFO]: [
        'What personal documents are required?',
        'How is my information kept secure?',
        'What if my address changes?',
        'How long does verification take?',
      ],
      [OnboardingSectionType.PAYMENT]: [
        'What payment methods are supported?',
        'How do I set up international payments?',
        'What tax information is needed?',
        'When will I receive my first payment?',
      ],
      [OnboardingSectionType.TOURS]: [
        'How many tours do I need to create?',
        'What makes a good tour description?',
        'How should I price my tours?',
        'What photos should I include?',
      ],
      [OnboardingSectionType.CALENDAR]: [
        'How do I set my availability?',
        'Can I block out specific dates?',
        'How do I handle booking conflicts?',
        'What about different time zones?',
      ],
      [OnboardingSectionType.QUIZ]: [
        'What topics are covered in the quiz?',
        'How can I prepare for the quiz?',
        "What happens if I don't pass?",
        'Can I retake the quiz?',
      ],
    };

    return commonQuestions[section] || [];
  }
}

// Export singleton instance
export const helpCache = new HelpCacheService();
export default helpCache;
