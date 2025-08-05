import { Document as RAGDocument, OnboardingSectionType } from '../types/rag';
export declare enum OnboardingStepStatus {
    LOCKED = "locked",
    PENDING = "pending",
    IN_REVIEW = "in_review",
    REWORK_REQUIRED = "rework_required",
    APPROVED = "approved"
}
interface StepDocument {
    id: string;
    title: string;
    content: string;
    section: string;
    metadata: {
        priority: 'critical' | 'high' | 'medium' | 'low';
        estimatedTime: string;
        requirements: string[];
    };
}
export interface OnboardingStep {
    id: string;
    title: string;
    status: OnboardingStepStatus;
    documents: StepDocument[];
    completionCriteria: string[];
}
export declare const onboardingSteps: OnboardingStep[];
export declare const onboardingDocuments: RAGDocument[];
export declare function getDocumentsBySection(section: OnboardingSectionType): RAGDocument[];
export declare function getAllSections(): OnboardingSectionType[];
export declare function getDocumentById(id: string): RAGDocument | undefined;
export {};
//# sourceMappingURL=onboarding-documentation.d.ts.map