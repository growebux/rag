"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const onboarding_data_service_1 = require("../services/onboarding-data.service");
const rag_1 = require("../types/rag");
const onboarding_documentation_1 = require("../data/onboarding-documentation");
const router = express_1.default.Router();
// Define section metadata based on requirements
const sectionMetadata = {
    [rag_1.OnboardingSectionType.PROFILE]: {
        id: rag_1.OnboardingSectionType.PROFILE,
        title: 'Profile Setup',
        description: 'Create your professional guide profile with photo, bio, and expertise areas',
        order: 1,
        estimatedTime: '30-45 minutes',
        requirements: [
            'Professional photo',
            'Written bio (150-300 words)',
            'Language selection',
            'Expertise areas (up to 5)',
            'Identity verification',
        ],
        status: 'available',
    },
    [rag_1.OnboardingSectionType.PERSONAL_INFO]: {
        id: rag_1.OnboardingSectionType.PERSONAL_INFO,
        title: 'Personal Information',
        description: 'Provide required personal details for verification and account setup',
        order: 2,
        estimatedTime: '15-20 minutes',
        requirements: [
            'Government-issued ID',
            'Proof of address',
            'Contact information',
            'Identity verification',
        ],
        status: 'available',
    },
    [rag_1.OnboardingSectionType.PAYMENT]: {
        id: rag_1.OnboardingSectionType.PAYMENT,
        title: 'Payment Setup',
        description: 'Configure your payment information for receiving tour payments',
        order: 3,
        estimatedTime: '20-30 minutes',
        requirements: [
            'Bank account details',
            'Tax information',
            'Payment method verification',
        ],
        status: 'available',
    },
    [rag_1.OnboardingSectionType.TOURS]: {
        id: rag_1.OnboardingSectionType.TOURS,
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
        status: 'available',
    },
    [rag_1.OnboardingSectionType.CALENDAR]: {
        id: rag_1.OnboardingSectionType.CALENDAR,
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
        status: 'available',
    },
    [rag_1.OnboardingSectionType.QUIZ]: {
        id: rag_1.OnboardingSectionType.QUIZ,
        title: 'Knowledge Quiz',
        description: 'Complete the local knowledge quiz with 80% or higher score',
        order: 6,
        estimatedTime: '2-3 hours preparation + 1 hour quiz',
        requirements: [
            'Study local knowledge materials',
            'Pass quiz with 80% score',
            'Complete within time limit',
        ],
        status: 'available',
    },
};
// GET /api/sections - Return all onboarding sections
router.get('/', async (req, res) => {
    try {
        const sections = (0, onboarding_documentation_1.getAllSections)().map(sectionType => sectionMetadata[sectionType]);
        res.json({
            success: true,
            data: sections,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
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
        const sectionId = req.params.id;
        // Validate section ID
        if (!Object.values(rag_1.OnboardingSectionType).includes(sectionId)) {
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
        const dataService = (0, onboarding_data_service_1.onboardingDataService)();
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
                relatedSections: (0, onboarding_documentation_1.getAllSections)()
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
        const relatedDocuments = (0, onboarding_documentation_1.getDocumentsBySection)(sectionId);
        const guidance = {
            section,
            guidance: {
                title: section.title,
                content: ragResponse.answer,
                sources: ragResponse.sources,
                confidence: ragResponse.confidence,
            },
            relatedSections: (0, onboarding_documentation_1.getAllSections)()
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
    }
    catch (error) {
        req.log.error(error, `Failed to retrieve guidance for section: ${req.params.id}`);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve section guidance',
            timestamp: new Date().toISOString(),
        });
    }
});
exports.default = router;
//# sourceMappingURL=sections.js.map