import express from 'express';
import { onboardingDataService } from '../services/onboarding-data.service';
import { OnboardingSectionType } from '../types/rag';
import {
  getAllSections,
  getDocumentsBySection,
} from '../data/onboarding-documentation';

const router = express.Router();

// Define section metadata based on requirements
const sectionMetadata = {
  [OnboardingSectionType.PROFILE]: {
    id: OnboardingSectionType.PROFILE,
    title: 'Profile Setup',
    description:
      'Create your professional guide profile with photo, bio, and expertise areas',
    order: 1,
    estimatedTime: '30-45 minutes',
    requirements: [
      'Professional photo',
      'Written bio (150-300 words)',
      'Language selection',
      'Expertise areas (up to 5)',
      'Identity verification',
    ],
    status: 'available' as const,
  },
  [OnboardingSectionType.PERSONAL_INFO]: {
    id: OnboardingSectionType.PERSONAL_INFO,
    title: 'Personal Information',
    description:
      'Provide required personal details for verification and account setup',
    order: 2,
    estimatedTime: '15-20 minutes',
    requirements: [
      'Government-issued ID',
      'Proof of address',
      'Contact information',
      'Identity verification',
    ],
    status: 'available' as const,
  },
  [OnboardingSectionType.PAYMENT]: {
    id: OnboardingSectionType.PAYMENT,
    title: 'Payment Setup',
    description:
      'Configure your payment information for receiving tour payments',
    order: 3,
    estimatedTime: '20-30 minutes',
    requirements: [
      'Bank account details',
      'Tax information',
      'Payment method verification',
    ],
    status: 'available' as const,
  },
  [OnboardingSectionType.TOURS]: {
    id: OnboardingSectionType.TOURS,
    title: 'Create Tours',
    description: 'Create and publish at least 3 tours to activate your account',
    order: 4,
    estimatedTime: '2-4 hours',
    requirements: [
      'Minimum 3 published tours',
      'Professional photos (5+ per tour)',
      'Detailed descriptions (200+ words)',
      'Pricing setup',
      'Availability calendar',
    ],
    status: 'available' as const,
  },
  [OnboardingSectionType.CALENDAR]: {
    id: OnboardingSectionType.CALENDAR,
    title: 'Calendar Management',
    description: 'Set up your availability and booking calendar',
    order: 5,
    estimatedTime: '20-30 minutes',
    requirements: [
      'Availability setup',
      'Time zone configuration',
      'Booking policies',
      'Calendar integration',
    ],
    status: 'available' as const,
  },
  [OnboardingSectionType.QUIZ]: {
    id: OnboardingSectionType.QUIZ,
    title: 'Knowledge Quiz',
    description: 'Complete the local knowledge quiz with 80% or higher score',
    order: 6,
    estimatedTime: '2-3 hours preparation + 1 hour quiz',
    requirements: [
      'Study local knowledge materials',
      'Pass quiz with 80% score',
      'Complete within time limit',
    ],
    status: 'available' as const,
  },
};

// GET /api/sections - Return all onboarding sections
router.get('/', async (req, res) => {
  try {
    const sections = getAllSections().map(
      sectionType => sectionMetadata[sectionType]
    );

    res.json({
      success: true,
      data: sections,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    req.log.error(error, 'Failed to retrieve onboarding sections');
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve onboarding sections',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/sections/:id/guidance - Get section-specific guidance
router.get('/:id/guidance', async (req, res) => {
  try {
    const sectionId = req.params.id as OnboardingSectionType;

    // Validate section ID
    if (!Object.values(OnboardingSectionType).includes(sectionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid section ID',
        timestamp: new Date().toISOString(),
      });
    }

    // Get section metadata
    const section = sectionMetadata[sectionId];
    if (!section) {
      return res.status(404).json({
        success: false,
        error: 'Section not found',
        timestamp: new Date().toISOString(),
      });
    }

    // Initialize onboarding data service if needed (non-blocking)
    const dataService = onboardingDataService();
    if (!dataService.isDocumentationLoaded()) {
      // Start loading in background, don't wait
      dataService.loadOnboardingDocumentation().catch(error => {
        req.log.error(error, 'Background RAG initialization failed');
      });
      
      // Return immediate response with basic guidance
      const basicGuidance = {
        section,
        guidance: {
          title: section.title,
          content: `## ${section.title}

This section covers: ${section.description}

**Requirements:**
${section.requirements.map(req => `- ${req}`).join('\n')}

**Estimated Time:** ${section.estimatedTime}

*The AI-powered guidance system is still loading. Please refresh in a moment for more detailed guidance.*`,
          sources: [],
          confidence: 0.5,
        },
        relatedSections: getAllSections()
          .filter(s => s !== sectionId)
          .slice(0, 3)
          .map(s => sectionMetadata[s]),
        documents: [],
      };

      return res.json({
        success: true,
        data: basicGuidance,
        timestamp: new Date().toISOString(),
      });
    }

    // Get section-specific guidance using RAG
    const ragResponse = await dataService.getSectionGuidance(sectionId);

    // Get related documents for additional context
    const relatedDocuments = getDocumentsBySection(sectionId);

    const guidance = {
      section,
      guidance: {
        title: section.title,
        content: ragResponse.answer,
        sources: ragResponse.sources,
        confidence: ragResponse.confidence,
      },
      relatedSections: getAllSections()
        .filter(s => s !== sectionId)
        .slice(0, 3)
        .map(s => sectionMetadata[s]),
      documents: relatedDocuments.map(doc => ({
        id: doc.id,
        title: doc.title,
        excerpt: doc.content.substring(0, 200) + '...',
        metadata: doc.metadata,
      })),
    };

    return res.json({
      success: true,
      data: guidance,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    req.log.error(
      error,
      `Failed to retrieve guidance for section: ${req.params.id}`
    );
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve section guidance',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
