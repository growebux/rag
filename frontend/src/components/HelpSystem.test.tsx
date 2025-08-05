import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { OnboardingSection, OnboardingSectionType } from '../types/onboarding';
import HelpSystem from './HelpSystem';
import { helpCache } from '../services/helpCache';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock section data
const mockSection: OnboardingSection = {
  id: OnboardingSectionType.PROFILE,
  title: 'Profile Setup',
  description: 'Set up your guide profile',
  requirements: ['Upload photo', 'Write bio'],
  order: 1,
  estimatedTime: '15 minutes',
  status: 'current',
  dependencies: [],
};

// Mock help response
const mockHelpResponse = {
  success: true,
  data: {
    question: 'How do I upload a photo?',
    answer:
      'To upload a photo, click the upload button and select an image file.',
    sources: [
      {
        id: 'doc-1',
        title: 'Profile Photo Guidelines',
        excerpt: 'Your profile photo should be professional and clear...',
        section: OnboardingSectionType.PROFILE,
        relevanceScore: 0.95,
      },
    ],
    confidence: 0.95,
    context: {
      section: OnboardingSectionType.PROFILE,
      userContext: null,
    },
    suggestions: [
      'What makes a good profile photo?',
      'How should I write my bio?',
      'What expertise areas should I choose?',
    ],
  },
  timestamp: new Date().toISOString(),
};

describe('HelpSystem', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    helpCache.clear(); // Clear cache before each test
  });

  it('renders with collapsed state initially', () => {
    render(<HelpSystem section={mockSection} />);

    expect(
      screen.getByText('Need Help with Profile Setup?')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /expand help/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/ask a question/i)
    ).not.toBeInTheDocument();
  });

  it('expands when toggle button is clicked', async () => {
    const user = userEvent.setup();
    render(<HelpSystem section={mockSection} />);

    const toggleButton = screen.getByRole('button', { name: /expand help/i });
    await user.click(toggleButton);

    expect(
      screen.getByPlaceholderText(/ask a question about profile setup/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /collapse help/i })
    ).toBeInTheDocument();
  });

  it('collapses when toggle button is clicked again', async () => {
    const user = userEvent.setup();
    render(<HelpSystem section={mockSection} />);

    const toggleButton = screen.getByRole('button', { name: /expand help/i });
    await user.click(toggleButton);
    await user.click(toggleButton);

    expect(
      screen.queryByPlaceholderText(/ask a question/i)
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /expand help/i })
    ).toBeInTheDocument();
  });

  it('submits help request when form is submitted', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHelpResponse,
    });

    render(<HelpSystem section={mockSection} />);

    // Expand the help system
    await user.click(screen.getByRole('button', { name: /expand help/i }));

    // Type a question
    const input = screen.getByPlaceholderText(
      /ask a question about profile setup/i
    );
    await user.type(input, 'How do I upload a photo?');

    // Submit the form
    await user.click(screen.getByRole('button', { name: /ask/i }));

    expect(mockFetch).toHaveBeenCalledWith('/api/help', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: 'How do I upload a photo?',
        section: OnboardingSectionType.PROFILE,
        context: undefined,
      }),
    });
  });

  it('displays loading state during help request', async () => {
    const user = userEvent.setup();
    mockFetch.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<HelpSystem section={mockSection} />);

    await user.click(screen.getByRole('button', { name: /expand help/i }));
    await user.type(
      screen.getByPlaceholderText(/ask a question about profile setup/i),
      'Test question'
    );
    await user.click(screen.getByRole('button', { name: /ask/i }));

    expect(screen.getByText('Getting help...')).toBeInTheDocument();
    expect(screen.getByText('Asking...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /asking/i })).toBeDisabled();
  });

  it('displays help response with answer and sources', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHelpResponse,
    });

    render(<HelpSystem section={mockSection} />);

    await user.click(screen.getByRole('button', { name: /expand help/i }));
    await user.type(
      screen.getByPlaceholderText(/ask a question about profile setup/i),
      'How do I upload a photo?'
    );
    await user.click(screen.getByRole('button', { name: /ask/i }));

    await waitFor(() => {
      expect(screen.getByText('Answer')).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        'To upload a photo, click the upload button and select an image file.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Sources')).toBeInTheDocument();
    expect(screen.getByText('Profile Photo Guidelines')).toBeInTheDocument();
    expect(screen.getByText('95% relevant')).toBeInTheDocument();
  });

  it('displays confidence indicator', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHelpResponse,
    });

    render(<HelpSystem section={mockSection} />);

    await user.click(screen.getByRole('button', { name: /expand help/i }));
    await user.type(
      screen.getByPlaceholderText(/ask a question about profile setup/i),
      'Test question'
    );
    await user.click(screen.getByRole('button', { name: /ask/i }));

    await waitFor(() => {
      expect(screen.getByText('Confidence:')).toBeInTheDocument();
    });

    expect(screen.getByText('95%')).toBeInTheDocument();
  });

  it('displays suggestions and allows clicking them', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHelpResponse,
    });

    render(<HelpSystem section={mockSection} />);

    await user.click(screen.getByRole('button', { name: /expand help/i }));
    await user.type(
      screen.getByPlaceholderText(/ask a question about profile setup/i),
      'Test question'
    );
    await user.click(screen.getByRole('button', { name: /ask/i }));

    await waitFor(() => {
      expect(screen.getByText('Suggested Questions')).toBeInTheDocument();
    });

    const suggestionButton = screen.getByRole('button', {
      name: /what makes a good profile photo/i,
    });
    expect(suggestionButton).toBeInTheDocument();

    // Mock another response for the suggestion click
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...mockHelpResponse,
        data: {
          ...mockHelpResponse.data,
          question: 'What makes a good profile photo?',
          answer:
            'A good profile photo should be professional, well-lit, and show your face clearly.',
        },
      }),
    });

    await user.click(suggestionButton);

    expect(mockFetch).toHaveBeenCalledWith('/api/help', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: 'What makes a good profile photo?',
        section: OnboardingSectionType.PROFILE,
        context: undefined,
      }),
    });
  });

  it('displays error message when help request fails', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: 'Help service unavailable',
      }),
    });

    render(<HelpSystem section={mockSection} />);

    await user.click(screen.getByRole('button', { name: /expand help/i }));
    await user.type(
      screen.getByPlaceholderText(/ask a question about profile setup/i),
      'Test question'
    );
    await user.click(screen.getByRole('button', { name: /ask/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Error: Help service unavailable')
      ).toBeInTheDocument();
    });
  });

  it('allows dismissing error messages', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: 'Test error',
      }),
    });

    render(<HelpSystem section={mockSection} />);

    await user.click(screen.getByRole('button', { name: /expand help/i }));
    await user.type(
      screen.getByPlaceholderText(/ask a question about profile setup/i),
      'Test question'
    );
    await user.click(screen.getByRole('button', { name: /ask/i }));

    await waitFor(() => {
      expect(screen.getByText('Error: Test error')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /dismiss error/i }));

    expect(screen.queryByText('Error: Test error')).not.toBeInTheDocument();
  });

  it('disables submit button when input is empty', async () => {
    const user = userEvent.setup();
    render(<HelpSystem section={mockSection} />);

    await user.click(screen.getByRole('button', { name: /expand help/i }));

    const submitButton = screen.getByRole('button', { name: /ask/i });
    expect(submitButton).toBeDisabled();

    await user.type(
      screen.getByPlaceholderText(/ask a question about profile setup/i),
      'Test question'
    );
    expect(submitButton).not.toBeDisabled();

    await user.clear(
      screen.getByPlaceholderText(/ask a question about profile setup/i)
    );
    expect(submitButton).toBeDisabled();
  });

  it('calls onChatOpen when chat button is clicked', async () => {
    const mockOnChatOpen = vi.fn();
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHelpResponse,
    });

    render(<HelpSystem section={mockSection} onChatOpen={mockOnChatOpen} />);

    await user.click(screen.getByRole('button', { name: /expand help/i }));
    await user.type(
      screen.getByPlaceholderText(/ask a question about profile setup/i),
      'Test question'
    );
    await user.click(screen.getByRole('button', { name: /ask/i }));

    await waitFor(() => {
      expect(
        screen.getByText('💬 Open Chat for More Help')
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole('button', { name: /open chat for more help/i })
    );

    expect(mockOnChatOpen).toHaveBeenCalledTimes(1);
  });

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup();
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<HelpSystem section={mockSection} />);

    await user.click(screen.getByRole('button', { name: /expand help/i }));
    await user.type(
      screen.getByPlaceholderText(/ask a question about profile setup/i),
      'Test question'
    );
    await user.click(screen.getByRole('button', { name: /ask/i }));

    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeInTheDocument();
    });
  });

  it('prevents submission of empty or whitespace-only questions', async () => {
    const user = userEvent.setup();
    render(<HelpSystem section={mockSection} />);

    await user.click(screen.getByRole('button', { name: /expand help/i }));

    // Try submitting with only whitespace
    await user.type(
      screen.getByPlaceholderText(/ask a question about profile setup/i),
      '   '
    );

    const submitButton = screen.getByRole('button', { name: /ask/i });
    expect(submitButton).toBeDisabled();
  });

  it('formats section names correctly in sources', async () => {
    const user = userEvent.setup();
    const responseWithUnderscoreSection = {
      ...mockHelpResponse,
      data: {
        ...mockHelpResponse.data,
        sources: [
          {
            ...mockHelpResponse.data.sources[0],
            section: OnboardingSectionType.PERSONAL_INFO,
          },
        ],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => responseWithUnderscoreSection,
    });

    render(<HelpSystem section={mockSection} />);

    await user.click(screen.getByRole('button', { name: /expand help/i }));
    await user.type(
      screen.getByPlaceholderText(/ask a question about profile setup/i),
      'Test question'
    );
    await user.click(screen.getByRole('button', { name: /ask/i }));

    await waitFor(() => {
      expect(screen.getByText('Section: PERSONAL INFO')).toBeInTheDocument();
    });
  });

  it('handles responses without sources gracefully', async () => {
    const user = userEvent.setup();
    const responseWithoutSources = {
      ...mockHelpResponse,
      data: {
        ...mockHelpResponse.data,
        sources: [],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => responseWithoutSources,
    });

    render(<HelpSystem section={mockSection} />);

    await user.click(screen.getByRole('button', { name: /expand help/i }));
    await user.type(
      screen.getByPlaceholderText(/ask a question about profile setup/i),
      'Test question'
    );
    await user.click(screen.getByRole('button', { name: /ask/i }));

    await waitFor(() => {
      expect(screen.getByText('Answer')).toBeInTheDocument();
    });

    expect(screen.queryByText('Sources')).not.toBeInTheDocument();
  });

  it('handles responses without suggestions gracefully', async () => {
    const user = userEvent.setup();
    const responseWithoutSuggestions = {
      ...mockHelpResponse,
      data: {
        ...mockHelpResponse.data,
        suggestions: [],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => responseWithoutSuggestions,
    });

    render(<HelpSystem section={mockSection} />);

    await user.click(screen.getByRole('button', { name: /expand help/i }));
    await user.type(
      screen.getByPlaceholderText(/ask a question about profile setup/i),
      'Test question'
    );
    await user.click(screen.getByRole('button', { name: /ask/i }));

    await waitFor(() => {
      expect(screen.getByText('Answer')).toBeInTheDocument();
    });

    expect(screen.queryByText('Suggested Questions')).not.toBeInTheDocument();
  });

  it('supports keyboard navigation for accessibility', async () => {
    const user = userEvent.setup();
    render(<HelpSystem section={mockSection} />);

    // Tab to the toggle button and activate with Enter
    await user.tab();
    expect(screen.getByRole('button', { name: /expand help/i })).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(
      screen.getByPlaceholderText(/ask a question about profile setup/i)
    ).toBeInTheDocument();
  });
});
