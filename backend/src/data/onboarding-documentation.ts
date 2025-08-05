// Import types from the RAG module for consistency
import { Document as RAGDocument, OnboardingSectionType } from '../types/rag';

// types/rag.ts or a similar definitions file might be needed for these types
// For the purpose of this file, we define them here.

export enum OnboardingStepStatus {
  LOCKED = 'locked',
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  REWORK_REQUIRED = 'rework_required',
  APPROVED = 'approved',
}

// Local document interface for the step structure
interface StepDocument {
  id: string;
  title: string;
  content: string;
  section: string; // This will be mapped to OnboardingSectionType later
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

// Main data structure for V3.0 Onboarding Process
export const onboardingSteps: OnboardingStep[] = [
  // Step 0: Pre-onboarding (Acquisition Phase)
  {
    id: 'acquisition',
    title: 'Guide Acquisition Process',
    status: OnboardingStepStatus.PENDING, // This is the first active step for a new applicant
    completionCriteria: [
      'ID Verification is approved',
      'Interview with Guide Acquisition Specialist is approved',
    ],
    documents: [
      {
        id: 'acquisition-process',
        title: 'Application and Interview Process',
        content: `# Guide Acquisition process

## Process for Guides

- User applies using Become a Guide form (front end)
- New record is created as Guide-Applicant in the DB
- User can access the account to check the steps of their application
- User will find the first step to be sending the ID Verification
- Once ID Verification is approved, the next step to the user will be to have an interview with a Guide Acquisition Specialist (internal staff)
- Once the interview was approved, users would have access to the onboarding process (create tours, profile, photos, accounting)

## Process for Guide Acquisition Specialist

- While hunting for new guides, users would send the link to Become a Guide in order to get new applicants
- Users would access the Guide-Applicant View, which would contain the following filters:
  - City
  - Country
  - Name
  - Email
  - Experience
  - Licensed
  - Transportation
- Users would have the option to accept or reject each Guide-Applicant
- If accepted, Guide would move from Guide-Applicant to Guide to be onboarded and the onboarding process would start.
- If rejected, Guide would not have access to re-apply for 1 year.
- The Guide-Applicant would disappear from the Guide-Applicant View if accepted/rejected`,
        section: 'acquisition',
        metadata: {
          priority: 'critical',
          estimatedTime: '1-3 business days',
          requirements: ['ID Verification', 'Interview'],
        },
      },
    ],
  },

  // Step 1: Profile
  {
    id: 'profile',
    title: 'Settings - Profile',
    status: OnboardingStepStatus.LOCKED,
    completionCriteria: [
      'Profile Picture',
      'Bio (700 ch)',
      'Areas of Expertise (1 selected)',
      'Languages (1 selected)',
    ],
    documents: [
      {
        id: 'profile-setup-v3',
        title: 'Profile Requirements',
        content: `# Settings - Profile (Step 1)

### Completed Criteria:
- Profile Picture
- Bio (700 ch) 
- Areas of Expertise (1 selected) → Non-existent, would be great to have it
- Languages (1 selected)`,
        section: 'profile',
        metadata: {
          priority: 'high',
          estimatedTime: '15-20 minutes',
          requirements: ['Profile Picture', 'Bio', 'Expertise', 'Languages'],
        },
      },
    ],
  },

  // Step 2: Personal & Payment Info
  {
    id: 'personal-info',
    title: 'Settings - Personal & Payment',
    status: OnboardingStepStatus.LOCKED,
    completionCriteria: [
      'First Name',
      'Last Name',
      'Email Address',
      'Address',
      'Home Phone',
      'Mobile Phone',
      'Emergency Contact',
      'Payment method - Type and all fields',
      'If USA Guide - Social security number & W9 provided',
      'If Canada Guide - Social security number',
    ],
    documents: [
      {
        id: 'personal-payment-v3',
        title: 'Personal and Payment Requirements',
        content: `# Settings - Personal information (Step 2)

### Completed Criteria: 
- First Name
- Last Name
- Date of birth - no longer in V3
- Email Address
- Address 
- Home Phone
- Mobile Phone
- Emergency Contact

# Settings - Personal information - How you'll get paid - View/Edit (Payment)

### Adyen
Adyen active or direct deposit. It would be:
\`(preferred_payout_method = 'Adyen' AND ayden_account_status = 'Active') OR (preferred_payout_method LIKE 'Direct Deposit')\`
THEN grab 'dbt_valid_from' AS construction_finance_complete_date

**Note:** In V2 W9 status changed to PROVIDED when G send an email to accounting@toursbylocals.com and accounting approved the W9. Currently there is nowhere in the system that requests the form or ALLOWS the guide to UPLOAD the document directly. ACS request personally the W9 (sensible information) and sends it to accounting without validation. 

### Non-Adyen 

- Currency
- How would you like to get paid
- PayPal: Email for payment
- Wire Transfer:
  - Banking Information
    - Beneficiary Name
    - Beneficiary bank: SWIFT
    - Beneficiary bank: IBAN
  - Beneficiary address
    - Street address
    - State/province/territory/country/region
    - City

### Payment method - Type and all fields
- If USA Guide - Social security number & W9 provided
- In V2 W9 status changed to PROVIDED when G send an email to accounting@toursbylocals.com and accounting approved the W9. Currently there is nowhere in the system that requests the form or ALLOWS the guide to UPLOAD the document directly. ACS request personally the W9 (sensible information) and sends it to accounting without validation.  
- If Canada Guide - Social security number`,
        section: 'personal-info',
        metadata: {
          priority: 'high',
          estimatedTime: '20-30 minutes',
          requirements: [
            'Personal Details',
            'Payment Method',
            'Tax Information',
          ],
        },
      },
    ],
  },

  // Step 3: Tours
  {
    id: 'tours',
    title: 'Tours',
    status: OnboardingStepStatus.LOCKED,
    completionCriteria: [
      'Tour 1 - published',
      'Tour 2 - published',
      'Tour 3 - published',
      'Customized Tour - created',
    ],
    documents: [
      {
        id: 'tours-creation-v3',
        title: 'Tour Creation Requirements',
        content: `# Tours

### Completed Criteria: 
- Tour 1 - published
- Tour 2 - published 
- Tour 3 - published 
- Customized Tour - created`,
        section: 'tours',
        metadata: {
          priority: 'high',
          estimatedTime: '2-4 hours',
          requirements: ['3 Published Tours', '1 Customized Tour'],
        },
      },
    ],
  },

  // Step 4: Calendar
  {
    id: 'calendar',
    title: 'Booking Management - Calendar',
    status: OnboardingStepStatus.LOCKED,
    completionCriteria: ['Set personal events if applicable'],
    documents: [
      {
        id: 'calendar-management-v3',
        title: 'Calendar Setup',
        content: `# Booking Management > CALENDAR

- Set personal events if applicable`,
        section: 'calendar',
        metadata: {
          priority: 'medium',
          estimatedTime: '5-10 minutes',
          requirements: ['Set availability'],
        },
      },
    ],
  },

  // Step 5: Quiz
  {
    id: 'quiz',
    title: 'Quiz',
    status: OnboardingStepStatus.LOCKED,
    completionCriteria: ['Solved'],
    documents: [
      {
        id: 'knowledge-quiz-v3',
        title: 'Quiz Requirement',
        content: `# Quiz

### Completed Criteria:
- Solved`,
        section: 'quiz',
        metadata: {
          priority: 'high',
          estimatedTime: '1 hour',
          requirements: ['Pass the quiz'],
        },
      },
    ],
  },
];

// Convert new step-based structure to legacy flat document structure for RAG compatibility
export const onboardingDocuments: RAGDocument[] = onboardingSteps.flatMap(
  step =>
    step.documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      metadata: doc.metadata,
      // Map new section IDs to legacy enum values for compatibility
      section: (() => {
        const sectionMap: Record<string, OnboardingSectionType> = {
          acquisition: OnboardingSectionType.PROFILE, // Map acquisition to profile for now
          profile: OnboardingSectionType.PROFILE,
          'personal-info': OnboardingSectionType.PERSONAL_INFO,
          tours: OnboardingSectionType.TOURS,
          calendar: OnboardingSectionType.CALENDAR,
          quiz: OnboardingSectionType.QUIZ,
        };
        return sectionMap[doc.section] || OnboardingSectionType.PROFILE;
      })(),
    }))
);

// Helper function to get documents by section
export function getDocumentsBySection(
  section: OnboardingSectionType
): RAGDocument[] {
  return onboardingDocuments.filter(doc => doc.section === section);
}

// Helper function to get all section types
export function getAllSections(): OnboardingSectionType[] {
  return Object.values(OnboardingSectionType);
}

// Helper function to get document by ID
export function getDocumentById(id: string): RAGDocument | undefined {
  return onboardingDocuments.find(doc => doc.id === id);
}
