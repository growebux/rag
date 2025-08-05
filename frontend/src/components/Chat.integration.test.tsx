import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import Chat from './Chat';
import { apiService } from '../services/api';
import { OnboardingSectionType } from '../types/onboarding';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    sendChatMessage: vi.fn(),
    getChatHistory: vi.fn(),
  },
}));

const mockApiService = vi.mocked(apiService);

// Mock scrollIntoView
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: vi.fn(),
});

describe('Chat Integration Tests', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful chat history response
    mockApiService.getChatHistory.mockResolvedValue({
      sessionId: 'test-session-123',
      messages: [],
      context: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Mock successful chat message response
    mockApiService.sendChatMessage.mockResolvedValue({
      sessionId: 'test-session-123',
      message: {
        id: 'msg-123',
        content: 'Hello! I can help you with your onboarding process.',
        timestamp: new Date(),
        sources: [],
      },
      suggestions: ['What should I do first?', 'How long does onboarding take?'],
      context: {},
    });
  });

  it('should successfully integrate with backend API', async () => {
    const user = userEvent.setup();
    
    render(<Chat {...defaultProps} />);

    // Wait for component to load and history to be fetched
    await waitFor(() => {
      expect(mockApiService.getChatHistory).toHaveBeenCalled();
    });

    // Wait for loading to complete
    await waitFor(() => {
      const input = screen.getByLabelText('Type your message');
      expect(input).not.toBeDisabled();
    });

    // Type a message
    const input = screen.getByLabelText('Type your message');
    await user.type(input, 'Hello, I need help');

    // Send the message
    await user.keyboard('{Enter}');

    // Verify API was called
    await waitFor(() => {
      expect(mockApiService.sendChatMessage).toHaveBeenCalledWith(
        'Hello, I need help',
        expect.any(String),
        undefined
      );
    });

    // Verify user message appears
    await waitFor(() => {
      expect(screen.getByText('Hello, I need help')).toBeInTheDocument();
    });

    // Verify assistant response appears
    await waitFor(() => {
      expect(screen.getByText('Hello! I can help you with your onboarding process.')).toBeInTheDocument();
    });
  });

  it('should handle context correctly', async () => {
    const user = userEvent.setup();
    const context = {
      currentSection: OnboardingSectionType.PROFILE,
      sessionId: 'test-session-123',
    };
    
    render(<Chat {...defaultProps} context={context} />);

    // Wait for loading to complete
    await waitFor(() => {
      const input = screen.getByLabelText('Type your message');
      expect(input).not.toBeDisabled();
    });

    // Type and send a message
    const input = screen.getByLabelText('Type your message');
    await user.type(input, 'Help with profile');
    await user.keyboard('{Enter}');

    // Verify API was called with context
    await waitFor(() => {
      expect(mockApiService.sendChatMessage).toHaveBeenCalledWith(
        'Help with profile',
        expect.any(String),
        JSON.stringify(context)
      );
    });
  });

  it('should load and display chat history', async () => {
    // Mock chat history with existing messages
    mockApiService.getChatHistory.mockResolvedValue({
      sessionId: 'test-session-123',
      messages: [
        {
          id: 'msg-1',
          content: 'Previous user message',
          sender: 'user',
          timestamp: new Date(),
          sources: [],
        },
        {
          id: 'msg-2',
          content: 'Previous assistant response',
          sender: 'assistant',
          timestamp: new Date(),
          sources: [],
        },
      ],
      context: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    render(<Chat {...defaultProps} />);

    // Wait for history to load
    await waitFor(() => {
      expect(screen.getByText('Previous user message')).toBeInTheDocument();
      expect(screen.getByText('Previous assistant response')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock API error
    mockApiService.sendChatMessage.mockRejectedValue(new Error('Network error'));
    
    render(<Chat {...defaultProps} />);

    // Wait for loading to complete
    await waitFor(() => {
      const input = screen.getByLabelText('Type your message');
      expect(input).not.toBeDisabled();
    });

    // Type and send a message
    const input = screen.getByLabelText('Type your message');
    await user.type(input, 'Test message');
    await user.keyboard('{Enter}');

    // Verify user message still appears
    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    // Component should still be functional
    expect(screen.getByLabelText('Type your message')).toBeInTheDocument();
  });
});