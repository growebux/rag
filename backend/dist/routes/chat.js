"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const onboarding_data_service_1 = require("../services/onboarding-data.service");
const openai_service_1 = require("../services/openai.service");
const rag_1 = require("../types/rag");
const { body, param, validationResult } = require('express-validator');
const router = express_1.default.Router();
const chatSessions = new Map();
// Validation middleware for chat requests
const validateChatMessage = [
    body('message')
        .isString()
        .trim()
        .isLength({ min: 1, max: 2000 })
        .withMessage('Message must be a string between 1 and 2000 characters'),
    body('sessionId')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Session ID must be a string with maximum 100 characters'),
    body('context')
        .optional()
        .isObject()
        .withMessage('Context must be an object'),
    body('context.section')
        .optional()
        .isIn(Object.values(rag_1.OnboardingSectionType))
        .withMessage('Section must be a valid onboarding section type'),
];
const validateSessionId = [
    param('sessionId')
        .isString()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Session ID must be a string with maximum 100 characters'),
];
// POST /api/chat - Send a message and get AI response
router.post('/', validateChatMessage, async (req, res) => {
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
        const { message, sessionId, context } = req.body;
        // Generate session ID if not provided
        const actualSessionId = sessionId || generateSessionId();
        // Get or create chat session
        let session = chatSessions.get(actualSessionId);
        if (!session) {
            session = {
                id: actualSessionId,
                messages: [],
                context: context || {},
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            chatSessions.set(actualSessionId, session);
        }
        // Update session context if provided
        if (context) {
            session.context = { ...session.context, ...context };
        }
        // Add user message to session
        const userMessage = {
            id: generateMessageId(),
            content: message,
            sender: 'user',
            timestamp: new Date(),
        };
        session.messages.push(userMessage);
        // Initialize services if needed
        const dataService = (0, onboarding_data_service_1.onboardingDataService)();
        if (!dataService.isDocumentationLoaded()) {
            await dataService.loadOnboardingDocumentation();
        }
        // Build context for AI response
        const conversationHistory = session.messages
            .slice(-6) // Last 6 messages for context
            .map(msg => `${msg.sender}: ${msg.content}`)
            .join('\n');
        // Try to get relevant information from RAG system first
        let ragResponse;
        let sources = [];
        let hasRelevantDocumentation = false;
        try {
            ragResponse = await dataService.queryWithContext(message, session.context?.section);
            sources = ragResponse.sources || [];
            hasRelevantDocumentation =
                sources.length > 0 && ragResponse.confidence > 0.3;
        }
        catch (error) {
            req.log.warn(error, 'RAG query failed, falling back to OpenAI only');
        }
        // Generate AI response using OpenAI, but ONLY based on retrieved documentation
        const aiService = (0, openai_service_1.openAIService)();
        let aiResponse;
        if (hasRelevantDocumentation && ragResponse) {
            // We have relevant documentation - generate response based on it
            let systemContext = `You are a helpful assistant for the ToursByLocals onboarding process. 

CRITICAL INSTRUCTIONS:
- You MUST ONLY use the provided documentation below to answer questions
- DO NOT use any information from your training data that is not in the provided documentation
- If the provided documentation doesn't contain enough information to answer the question, explicitly say so
- Always provide clear, actionable guidance
- Use PLAIN TEXT ONLY - absolutely NO markdown formatting
- Do NOT use headers, bold text, italic text, or any special formatting
- Write in a conversational, helpful tone using simple paragraphs
- Use numbered lists when showing steps (1., 2., 3.)
- Use simple bullet points with dashes when listing items
- Keep responses clear and easy to read

`;
            if (session.context?.section) {
                const sectionNames = {
                    [rag_1.OnboardingSectionType.PROFILE]: 'profile setup',
                    [rag_1.OnboardingSectionType.PERSONAL_INFO]: 'personal information',
                    [rag_1.OnboardingSectionType.PAYMENT]: 'payment setup',
                    [rag_1.OnboardingSectionType.TOURS]: 'tour creation',
                    [rag_1.OnboardingSectionType.CALENDAR]: 'calendar management',
                    [rag_1.OnboardingSectionType.QUIZ]: 'knowledge quiz',
                };
                systemContext += `The user is currently working on the ${sectionNames[session.context.section]} section. `;
            }
            systemContext += `

RELEVANT DOCUMENTATION:
${ragResponse.answer}

CONVERSATION HISTORY:
${conversationHistory}

USER QUESTION: ${message}

Please provide a helpful, clear response based ONLY on the documentation provided above. Use PLAIN TEXT formatting only - no markdown, no headers, no bold text. Write in simple, clear paragraphs that are easy to read. If the documentation doesn't contain enough information to fully answer the question, clearly state what information is missing and suggest where they might find more details.`;
            const rawResponse = await aiService.generateResponse(systemContext, []);
            aiResponse = formatChatResponse(rawResponse);
        }
        else {
            // No relevant documentation found - be explicit about this
            aiResponse = generateFallbackResponse(message);
        }
        // Add assistant message to session
        const assistantMessage = {
            id: generateMessageId(),
            content: aiResponse,
            sender: 'assistant',
            timestamp: new Date(),
            ...(sources.length > 0 && { sources }),
        };
        session.messages.push(assistantMessage);
        session.updatedAt = new Date();
        // Generate suggestions for follow-up questions
        const suggestions = generateChatSuggestions(message, session.context?.section);
        // Prepare response
        const chatResponse = {
            sessionId: actualSessionId,
            message: {
                id: assistantMessage.id,
                content: assistantMessage.content,
                timestamp: assistantMessage.timestamp,
                sources: assistantMessage.sources || [],
            },
            suggestions,
            context: session.context,
        };
        return res.json({
            success: true,
            data: chatResponse,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        req.log.error(error, 'Failed to process chat message');
        return res.status(500).json({
            success: false,
            error: 'Failed to process chat message',
            timestamp: new Date().toISOString(),
        });
    }
});
// GET /api/chat/:sessionId/history - Get conversation history
router.get('/:sessionId/history', validateSessionId, async (req, res) => {
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
        const sessionId = req.params['sessionId'];
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Session ID is required',
                timestamp: new Date().toISOString(),
            });
        }
        const session = chatSessions.get(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Chat session not found',
                timestamp: new Date().toISOString(),
            });
        }
        const historyResponse = {
            sessionId: session.id,
            messages: session.messages.map(msg => ({
                id: msg.id,
                content: msg.content,
                sender: msg.sender,
                timestamp: msg.timestamp,
                sources: msg.sources || [],
            })),
            context: session.context,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
        };
        return res.json({
            success: true,
            data: historyResponse,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        req.log.error(error, `Failed to retrieve chat history for session: ${req.params['sessionId']}`);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve chat history',
            timestamp: new Date().toISOString(),
        });
    }
});
// Helper functions
function generateSessionId() {
    return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
function generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
function generateChatSuggestions(lastMessage, section) {
    const generalSuggestions = [
        'What should I do next?',
        'Are there any common mistakes to avoid?',
        'How long does this typically take?',
        'Do you have any tips for this step?',
    ];
    const sectionSpecificSuggestions = {
        [rag_1.OnboardingSectionType.PROFILE]: [
            'What makes a professional profile photo?',
            'How long should my bio be?',
            'Which expertise areas should I select?',
            'What languages should I list?',
            'How do I highlight my unique experiences?',
        ],
        [rag_1.OnboardingSectionType.PERSONAL_INFO]: [
            'What documents do I need for verification?',
            'How secure is my personal information?',
            'What if I need to update my address later?',
            'Do I need to provide a phone number?',
            'What about emergency contact information?',
        ],
        [rag_1.OnboardingSectionType.PAYMENT]: [
            'Which payment method is fastest?',
            'What tax documents do I need?',
            'When will I receive my first payment?',
            'Are there any fees I should know about?',
            'How do I update my banking information?',
        ],
        [rag_1.OnboardingSectionType.TOURS]: [
            'How should I price my tours?',
            'What photos work best for tour listings?',
            'How do I write compelling tour descriptions?',
            'How many tours should I create initially?',
            'What makes a tour stand out?',
        ],
        [rag_1.OnboardingSectionType.CALENDAR]: [
            'How do I handle booking conflicts?',
            'Should I offer tours every day?',
            'What about different time zones?',
            'How far in advance should I set availability?',
            'Can I block out personal time?',
        ],
        [rag_1.OnboardingSectionType.QUIZ]: [
            'How can I prepare for the quiz?',
            "What happens if I don't pass?",
            'Can I see my quiz results?',
            'How many attempts do I get?',
            'What topics should I study?',
        ],
    };
    // Get section-specific suggestions
    let suggestions = [];
    if (section && sectionSpecificSuggestions[section]) {
        suggestions = [...sectionSpecificSuggestions[section]];
    }
    else {
        suggestions = [...generalSuggestions];
    }
    // Filter suggestions based on the last message to avoid repetition
    const lastMessageLower = lastMessage.toLowerCase();
    const filteredSuggestions = suggestions.filter(suggestion => {
        const suggestionWords = suggestion.toLowerCase().split(' ');
        const messageWords = lastMessageLower.split(' ');
        // Check if suggestion contains similar keywords to avoid repetition
        const hasCommonWords = suggestionWords.some(word => word.length > 3 && messageWords.includes(word));
        return !hasCommonWords;
    });
    // Return up to 3 suggestions, prioritizing filtered ones
    const finalSuggestions = filteredSuggestions.length >= 3
        ? filteredSuggestions.slice(0, 3)
        : [
            ...filteredSuggestions,
            ...suggestions.filter(s => !filteredSuggestions.includes(s)),
        ].slice(0, 3);
    return finalSuggestions;
}
// Helper method to format chat responses for better frontend consumption
function formatChatResponse(rawResponse) {
    // Aggressively remove all markdown formatting and clean up the response
    let formatted = rawResponse
        // Remove markdown headers (##, ###, ####, etc.) and keep just the text
        .replace(/^#{1,6}\s+(.*)$/gm, '$1')
        // Remove markdown bold (**text** or __text__)
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        // Remove markdown italic (*text* or _text_)
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/_(.*?)_/g, '$1')
        // Remove markdown code blocks (```text```)
        .replace(/```[\s\S]*?```/g, '')
        // Remove inline code (`text`)
        .replace(/`([^`]+)`/g, '$1')
        // Remove markdown links [text](url) and keep just the text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove markdown horizontal rules (---, ***, ___)
        .replace(/^[-*_]{3,}$/gm, '')
        // Clean up excessive newlines (3+ newlines become 2)
        .replace(/\n{3,}/g, '\n\n')
        // Ensure proper spacing around numbered lists
        .replace(/(\n)(\d+\.)/g, '\n\n$2')
        // Ensure proper spacing around bullet points
        .replace(/(\n)(-\s)/g, '\n\n$2')
        // Clean up extra spaces and tabs
        .replace(/[ \t]+/g, ' ')
        // Remove leading/trailing whitespace
        .trim();
    // Ensure proper sentence endings
    if (formatted && !formatted.match(/[.!?]$/)) {
        formatted += '.';
    }
    // Final aggressive cleanup - remove any remaining markdown artifacts
    formatted = formatted
        // Remove any remaining markdown symbols
        .replace(/[*_#`]/g, '')
        // Clean up double spaces
        .replace(/  +/g, ' ')
        // Ensure clean line breaks
        .replace(/\n\s*\n/g, '\n\n')
        // Remove any remaining backslashes used for escaping
        .replace(/\\/g, '');
    return formatted;
}
// Helper method to generate fallback responses when no documentation is found
function generateFallbackResponse(message) {
    return `I don't have specific information about "${message}" in the current onboarding documentation.

To get the most accurate and up-to-date information, I recommend:

1. Check the specific onboarding section you're working on for detailed requirements
2. Contact your Guide Acquisition Specialist for personalized assistance  
3. Review the complete onboarding checklist to see if your question relates to a different step

If you can rephrase your question or ask about a specific onboarding step (Profile, Personal Info, Payment, Tours, Calendar, or Quiz), I might be able to provide more targeted guidance from the available documentation.`;
}
exports.default = router;
//# sourceMappingURL=chat.js.map