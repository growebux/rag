import express from 'express';
import { onboardingDataService } from '../services/onboarding-data.service';
import { OnboardingSectionType } from '../types/rag';

const { body, validationResult } = require('express-validator');

const router = express.Router();

// Validation middleware for help requests
const validateHelpRequest = [
  body('question')
    .isString()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Question must be a string between 1 and 1000 characters'),
  body('context')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Context must be a string with maximum 500 characters'),
  body('section')
    .optional()
    .isIn(Object.values(OnboardingSectionType))
    .withMessage('Section must be a valid onboarding section type'),
];

// POST /api/help - Get contextual help using RAG
router.post(
  '/',
  validateHelpRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        });
      }

      const { question, context, section } = req.body;

      // Initialize onboarding data service if needed
      const dataService = onboardingDataService();
      if (!dataService.isDocumentationLoaded()) {
        await dataService.loadOnboardingDocumentation();
      }

      // Query the RAG system with section context
      const ragResponse = await dataService.queryWithContext(
        question,
        section as OnboardingSectionType
      );

      // Format the response
      const helpResponse = {
        question,
        answer: ragResponse.answer,
        sources: ragResponse.sources.map((source: any) => ({
          id: source.id,
          title: source.title,
          excerpt: source.excerpt,
          section: source.section,
          relevanceScore: source.relevanceScore,
        })),
        confidence: ragResponse.confidence,
        context: {
          section: section || null,
          userContext: context || null,
        },
        suggestions: generateSuggestions(
          question,
          section as OnboardingSectionType
        ),
      };

      return res.json({
        success: true,
        data: helpResponse,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      req.log.error(error, 'Failed to process help request');
      return res.status(500).json({
        success: false,
        error: 'Failed to process help request',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// Helper function to generate contextual suggestions
function generateSuggestions(
  question: string,
  section?: OnboardingSectionType
): string[] {
  const commonSuggestions = [
    'What are the requirements for this section?',
    'How long does this step typically take?',
    'What documents do I need to prepare?',
    'Are there any common mistakes to avoid?',
  ];

  const sectionSpecificSuggestions: Record<OnboardingSectionType, string[]> = {
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

  // Return section-specific suggestions if available, otherwise common ones
  if (section && sectionSpecificSuggestions[section]) {
    return sectionSpecificSuggestions[section]!.slice(0, 3);
  }

  // Filter common suggestions based on question content
  const questionLower = question.toLowerCase();
  const relevantSuggestions = commonSuggestions.filter(
    suggestion =>
      !questionLower.includes(suggestion.toLowerCase().split(' ')[1] || '')
  );

  return relevantSuggestions.slice(0, 3);
}

export default router;
