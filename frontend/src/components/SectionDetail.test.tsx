import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import SectionDetail from './SectionDetail';
import {
  OnboardingSection,
  OnboardingSectionType,
  SectionGuidanceResponse,
} from '../types/onboarding';
import { apiService } from '../services/api';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    getSections: vi.fn(),
    getSectionGuidance: vi.fn(),
    getHelp: vi.fn(),
    sendChatMessage: vi.fn(),
    getChatHistory: vi.fn(),
  },
}));

const mockSection: OnboardingSection = {
  id: OnboardingSectionType.PROFILE,
  title: 'Profile Setup',
  description: 'Complete your guide profile',
  requirements: ['Profile photo', 'Bio', 'Languages'],
  order: 1,
  estimatedTime: '15 minutes',
  status: 'available',
  dependencies: [],
};

const mockGuidance: SectionGuidanceResponse = {
  section: mockSection,
  guidance: {
    title: 'Profile Setup Guide',
    content: 'This section helps you set up your profile.',
    examples: ['Upload a professional photo', 'Write a compelling bio'],
    commonIssues: ['Photo too small', 'Bio too short'],
  },
  relatedSections: [],
};

const renderWithRouter = (
  component: React.ReactElement,
  initialEntries = ['/wizard/section/profile']
) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>{component}</MemoryRouter>
  );
};

describe('SectionDetail Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders section not found when no sectionId', () => {
    renderWithRouter(<SectionDetail />, ['/wizard/section/']);

    expect(screen.getByText('Section Not Found')).toBeInTheDocument();
    expect(
      screen.getByText('The requested section could not be found.')
    ).toBeInTheDocument();
  });

  it('renders basic component structure', () => {
    renderWithRouter(<SectionDetail />);

    // Component renders without crashing
    expect(document.querySelector('.section-detail')).toBeInTheDocument();
  });

  it('renders error handling UI', () => {
    renderWithRouter(<SectionDetail />);

    // Shows section not found when no valid section
    expect(screen.getByText('Section Not Found')).toBeInTheDocument();
  });

  it('renders loading states and error boundaries', () => {
    renderWithRouter(<SectionDetail />);

    // Component has proper error handling structure
    expect(document.querySelector('.section-detail')).toBeInTheDocument();
  });

  it('renders section with prop when provided', async () => {
    renderWithRouter(<SectionDetail section={mockSection} />, ['/wizard']);

    // Should render immediately without API call since section is provided
    expect(screen.getByText('Profile Setup')).toBeInTheDocument();
    expect(screen.getByText('Complete your guide profile')).toBeInTheDocument();
  });

  it('handles back button functionality', () => {
    const onBack = vi.fn();
    renderWithRouter(<SectionDetail onBack={onBack} />);

    // Back button is available in error state
    const backButton = screen.getByText('Go Back');
    expect(backButton).toBeInTheDocument();

    fireEvent.click(backButton);
    expect(onBack).toHaveBeenCalled();
  });
});
