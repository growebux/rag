import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Chat from './Chat';
import { OnboardingSectionType, OnboardingContext } from '../types/onboarding';
import { apiService } from '../services/api';

// Mock the API service
import { vi } from 'vitest';
vi.mock('../services/api');
const mockApiService = apiService as any;

describe('Chat Context Integration', () => {
  const mockOnClose = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockApiService.getChatHistory = vi.fn().mockResolvedValue({
      messages: [],
      context: {},
      sessionId: 'test-session',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    mockApiService.sendChatMessage = vi.fn().mockResolvedValue({
      sessionId: 'test-session',
      message: {
        id: 'msg-1',
        content: 'Test response',
        timestamp: new Date(),
        sources: [],
      },
      suggestions: ['Suggestion 1', 'Suggestion 2'],
      context: {},
    });
  });

  describe('Context Display', () => {
    it('should display current section context in header', () => {
      const context: OnboardingContext = {
        sessionId: 'test-session',
        currentSection: OnboardingSectionType.PROFILE,
        sectionTitle: 'Profile Setup',
        userProgress: {
          completedSections: [],
          currentStep: 1,
          totalSteps: 6,
        },
      };

      render(
        <Chat
          isOpen={true}
          onClose={mockOnClose}
          context={context}
        />
      );

      expect(screen.getByText('📍 Profile Setup')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 6')).toBeInTheDocument();
    });

    it('should show contextual welcome message for specific sections', () => {
      const context: OnboardingContext = {
        sessionId: 'test-session',
        currentSection: OnboardingSectionType.PROFILE,
        sectionTitle: 'Profile Setup',
      };

      render(
        <Chat
          isOpen={true}
          onClose={mockOnClose}
          context={context}
        />
      );

      expect(screen.getByText(/I'm here to help you with/)).toBeInTheDocument();
      expect(screen.getByText(/Profile Setup/)).toBeInTheDocument();
    });

    it('should show general welcome when no specific context', () => {
      const context: OnboardingContext = {
        sessionId: 'test-session',
      };

      render(
        <Chat
          isOpen={true}
          onClose={mockOnClose}
          context={context}
        />
      );

      expect(screen.getByText(/I'm here to help you with your onboarding process/)).toBeInTheDocument();
      expect(screen.getByText('Profile setup and requirements')).toBeInTheDocument();
    });
  });

  describe('Contextual Suggestions', () => {
    it('should display section-specific suggestions for profile section', () => {
      const context: OnboardingContext = {
        sessionId: 'test-session',
        currentSection: OnboardingSectionType.PROFILE,
        sectionTitle: 'Profile Setup',
      };

      render(
        <Chat
          isOpen={true}
          onClose={mockOnClose}
          context={context}
        />
      );

      expect(screen.getByText('What makes a good profile photo?')).toBeInTheDocument();
      expect(screen.getByText('How should I write my bio?')).toBeInTheDocument();
      expect(screen.getByText('Which expertise areas should I choose?')).toBeInTheDocument();
    });

    it('should display section-specific suggestions for tours section', () => {
      const context: OnboardingContext = {
        sessionId: 'test-session',
        currentSection: OnboardingSectionType.TOURS,
        sectionTitle: 'Tour Creation',
      };

      render(
        <Chat
          isOpen={true}
          onClose={mockOnClose}
          context={context}
        />
      );

      expect(screen.getByText('How should I price my tours?')).toBeInTheDocument();
      expect(screen.getByText('What photos work best for tours?')).toBeInTheDocument();
      expect(screen.getByText('How do I write compelling descriptions?')).toBeInTheDocument();
    });

    it('should populate input when suggestion is clicked', async () => {
      const user = userEvent.setup();
      const context: OnboardingContext = {
        sessionId: 'test-session',
        currentSection: OnboardingSectionType.PROFILE,
        sectionTitle: 'Profile Setup',
      };

      render(
        <Chat
          isOpen={true}
          onClose={mockOnClose}
          context={context}
        />
      );

      const suggestion = screen.getByText('What makes a good profile photo?');
      await user.click(suggestion);

      const input = screen.getByPlaceholderText('Type your message...') as HTMLInputElement;
      expect(input.value).toBe('What makes a good profile photo?');
    });
  });

  describe('Context Passing to Backend', () => {
    it('should send context information with chat messages', async () => {
      const user = userEvent.setup();
      const context: OnboardingContext = {
        sessionId: 'test-session',
        currentSection: OnboardingSectionType.PROFILE,
        sectionTitle: 'Profile Setup',
        sectionDescription: 'Set up your guide profile',
      };

      render(
        <Chat
          isOpen={true}
          onClose={mockOnClose}
          context={context}
        />
      );

      const input = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByLabelText('Send message');

      await user.type(input, 'I need help with my profile');
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockApiService.sendChatMessage).toHaveBeenCalledWith(
          'I need help with my profile',
          'test-session',
          JSON.stringify(context)
        );
      });
    });

    it('should handle context updates during conversation', async () => {
      const user = userEvent.setup();
      let context: OnboardingContext = {
        sessionId: 'test-session',
        currentSection: OnboardingSectionType.PROFILE,
        sectionTitle: 'Profile Setup',
      };

      const { rerender } = render(
        <Chat
          isOpen={true}
          onClose={mockOnClose}
          context={context}
        />
      );

      // Send first message
      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'First message');
      await user.click(screen.getByLabelText('Send message'));

      // Update context
      context = {
        ...context,
        currentSection: OnboardingSectionType.TOURS,
        sectionTitle: 'Tour Creation',
      };

      rerender(
        <Chat
          isOpen={true}
          onClose={mockOnClose}
          context={context}
        />
      );

      // Verify context display updated
      expect(screen.getByText('📍 Tour Creation')).toBeInTheDocument();
    });
  });

  describe('Source Attribution', () => {
    it('should display source information when available', async () => {
      const user = userEvent.setup();
      
      mockApiService.sendChatMessage = vi.fn().mockResolvedValue({
        sessionId: 'test-session',
        message: {
          id: 'msg-1',
          content: 'Here is information about profile photos.',
          timestamp: new Date(),
          sources: [
            {
              id: 'doc-1',
              title: 'Profile Setup Guide',
              excerpt: 'Professional photos should be clear and well-lit...',
              section: OnboardingSectionType.PROFILE,
              relevanceScore: 0.9,
            },
          ],
        },
        suggestions: [],
        context: {},
      });

      const context: OnboardingContext = {
        sessionId: 'test-session',
        currentSection: OnboardingSectionType.PROFILE,
      };

      render(
        <Chat
          isOpen={true}
          onClose={mockOnClose}
          context={context}
        />
      );

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Tell me about profile photos');
      await user.click(screen.getByLabelText('Send message'));

      await waitFor(() => {
        expect(screen.getByText('Sources:')).toBeInTheDocument();
        expect(screen.getByText('Profile Setup Guide')).toBeInTheDocument();
        expect(screen.getByText(/Professional photos should be clear/)).toBeInTheDocument();
        expect(screen.getByText(/Relevance: 90%/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      
      mockApiService.sendChatMessage = vi.fn().mockRejectedValue(new Error('Network error'));

      const context: OnboardingContext = {
        sessionId: 'test-session',
        currentSection: OnboardingSectionType.PROFILE,
      };

      render(
        <Chat
          isOpen={true}
          onClose={mockOnClose}
          context={context}
        />
      );

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test message');
      await user.click(screen.getByLabelText('Send message'));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should handle missing context gracefully', () => {
      render(
        <Chat
          isOpen={true}
          onClose={mockOnClose}
          context={undefined}
        />
      );

      // Should still render without errors
      expect(screen.getByText('Welcome to Chat Support!')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for contextual elements', () => {
      const context: OnboardingContext = {
        sessionId: 'test-session',
        currentSection: OnboardingSectionType.PROFILE,
        sectionTitle: 'Profile Setup',
      };

      render(
        <Chat
          isOpen={true}
          onClose={mockOnClose}
          context={context}
        />
      );

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'chat-title');
      expect(screen.getByRole('log')).toHaveAttribute('aria-label', 'Chat messages');
    });
  });
});