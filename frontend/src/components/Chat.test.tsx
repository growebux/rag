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
    getSections: vi.fn(),
    getSectionGuidance: vi.fn(),
    getHelp: vi.fn(),
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

describe('Chat Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  const mockContext = {
    currentSection: OnboardingSectionType.PROFILE,
    sessionId: 'test-session-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiService.getChatHistory.mockResolvedValue({
      sessionId: 'test-session-123',
      messages: [],
      context: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockApiService.sendChatMessage.mockResolvedValue({
      sessionId: 'test-session-123',
      message: {
        id: 'msg-123',
        content: 'Test response',
        timestamp: new Date(),
        sources: [],
      },
      suggestions: [],
      context: {},
    });
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<Chat {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<Chat {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Chat Assistant')).toBeInTheDocument();
    });

    it('should display context information when provided', () => {
      render(<Chat {...defaultProps} context={mockContext} />);
      expect(screen.getByText('Context: profile')).toBeInTheDocument();
    });

    it('should display welcome message when no messages exist', async () => {
      render(<Chat {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Welcome to Chat Support!')).toBeInTheDocument();
      });
      
      expect(
        screen.getByText(/I'm here to help you with your onboarding process/)
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<Chat {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'chat-title');
      expect(dialog).toHaveAttribute('aria-modal', 'true');

      expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite');
      expect(screen.getByRole('log')).toHaveAttribute(
        'aria-label',
        'Chat messages'
      );
    });

    it('should focus input when chat opens', async () => {
      const { rerender } = render(<Chat {...defaultProps} isOpen={false} />);

      rerender(<Chat {...defaultProps} isOpen={true} />);

      await waitFor(() => {
        const input = screen.getByLabelText('Type your message');
        expect(input).toHaveFocus();
      });
    });

    it('should have proper button labels', () => {
      render(<Chat {...defaultProps} />);

      expect(screen.getByLabelText('Close chat')).toBeInTheDocument();
      expect(screen.getByLabelText('Send message')).toBeInTheDocument();
      expect(screen.getByLabelText('Type your message')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<Chat {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByLabelText('Close chat');
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<Chat {...defaultProps} onClose={onClose} />);

      const backdrop = document.querySelector('.chat-backdrop');
      expect(backdrop).toBeInTheDocument();

      await user.click(backdrop!);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should update input value when typing', async () => {
      const user = userEvent.setup();

      render(<Chat {...defaultProps} />);

      const input = screen.getByLabelText('Type your message');
      await user.type(input, 'Hello world');

      expect(input).toHaveValue('Hello world');
    });

    it('should show character count', async () => {
      const user = userEvent.setup();

      render(<Chat {...defaultProps} />);

      const input = screen.getByLabelText('Type your message');
      await user.type(input, 'Hello');

      expect(screen.getByText('5/500')).toBeInTheDocument();
    });

    it('should enforce maximum character limit', async () => {
      render(<Chat {...defaultProps} />);

      const input = screen.getByLabelText(
        'Type your message'
      ) as HTMLInputElement;
      expect(input.maxLength).toBe(500);
    });

    it('should enable send button when input has text', async () => {
      const user = userEvent.setup();

      render(<Chat {...defaultProps} />);

      const input = screen.getByLabelText('Type your message');
      const sendButton = screen.getByLabelText('Send message');

      // Initially disabled (no text)
      expect(sendButton).toBeDisabled();

      // Should be enabled after typing
      await user.type(input, 'Hello');
      expect(sendButton).not.toBeDisabled();
    });
  });

  describe('Message Sending', () => {
    it('should send message when send button is clicked', async () => {
      const user = userEvent.setup();

      render(<Chat {...defaultProps} />);

      const input = screen.getByLabelText('Type your message');
      const sendButton = screen.getByLabelText('Send message');

      await user.type(input, 'Test message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockApiService.sendChatMessage).toHaveBeenCalledWith(
          'Test message',
          expect.any(String),
          undefined
        );
      });
    });

    it('should send message when Enter key is pressed', async () => {
      const user = userEvent.setup();

      render(<Chat {...defaultProps} />);

      const input = screen.getByLabelText('Type your message');

      await user.type(input, 'Test message');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockApiService.sendChatMessage).toHaveBeenCalledWith(
          'Test message',
          expect.any(String),
          undefined
        );
      });
    });

    it('should not send empty messages', async () => {
      const user = userEvent.setup();

      render(<Chat {...defaultProps} />);

      const sendButton = screen.getByLabelText('Send message');
      expect(sendButton).toBeDisabled();

      await user.click(sendButton);
      expect(mockApiService.sendChatMessage).not.toHaveBeenCalled();
    });

    it('should not send messages with only whitespace', async () => {
      const user = userEvent.setup();

      render(<Chat {...defaultProps} />);

      const input = screen.getByLabelText('Type your message');
      const sendButton = screen.getByLabelText('Send message');

      await user.type(input, '   ');
      expect(sendButton).toBeDisabled();
    });

    it('should clear input after sending message', async () => {
      const user = userEvent.setup();

      render(<Chat {...defaultProps} />);

      const input = screen.getByLabelText('Type your message');

      await user.type(input, 'Test message');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('should include context when sending message', async () => {
      const user = userEvent.setup();

      render(<Chat {...defaultProps} context={mockContext} />);

      const input = screen.getByLabelText('Type your message');

      await user.type(input, 'Test message');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockApiService.sendChatMessage).toHaveBeenCalledWith(
          'Test message',
          expect.any(String),
          JSON.stringify(mockContext)
        );
      });
    });
  });

  describe('Message Display', () => {
    it('should display messages after sending', async () => {
      const user = userEvent.setup();

      render(<Chat {...defaultProps} />);

      const input = screen.getByLabelText('Type your message');

      await user.type(input, 'Hello');
      await user.keyboard('{Enter}');

      // Wait for user message to appear
      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
      });

      // Wait for assistant response
      await waitFor(() => {
        expect(screen.getByText('Test response')).toBeInTheDocument();
      });
    });
  });

  describe('Component State', () => {
    it('should load chat history on mount', async () => {
      render(<Chat {...defaultProps} />);

      await waitFor(() => {
        expect(mockApiService.getChatHistory).toHaveBeenCalledWith(
          expect.any(String)
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();

      mockApiService.sendChatMessage.mockRejectedValue(
        new Error('Network error')
      );

      render(<Chat {...defaultProps} />);

      const input = screen.getByLabelText('Type your message');

      await user.type(input, 'Test message');
      await user.keyboard('{Enter}');

      // Wait for the API call to complete
      await waitFor(() => {
        expect(mockApiService.sendChatMessage).toHaveBeenCalled();
      });

      // The error should be handled (component shouldn't crash)
      expect(screen.getByLabelText('Type your message')).toBeInTheDocument();
    });

    it('should handle chat history loading errors gracefully', async () => {
      mockApiService.getChatHistory.mockRejectedValue(
        new Error('Failed to load history')
      );

      render(<Chat {...defaultProps} />);

      // Component should still render despite history loading error
      await waitFor(() => {
        expect(screen.getByText('Chat Assistant')).toBeInTheDocument();
      });
    });
  });

  describe('Chat History', () => {
    it('should load chat history with previous messages', async () => {
      const mockHistory = {
        sessionId: 'test-session-123',
        messages: [
          {
            id: 'msg-1',
            content: 'Previous user message',
            sender: 'user' as const,
            timestamp: new Date(),
            sources: [],
          },
          {
            id: 'msg-2',
            content: 'Previous assistant response',
            sender: 'assistant' as const,
            timestamp: new Date(),
            sources: [],
          },
        ],
        context: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockApiService.getChatHistory.mockResolvedValue(mockHistory);

      render(<Chat {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Previous user message')).toBeInTheDocument();
        expect(screen.getByText('Previous assistant response')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should not send message when Shift+Enter is pressed', async () => {
      const user = userEvent.setup();

      render(<Chat {...defaultProps} />);

      const input = screen.getByLabelText('Type your message');

      await user.type(input, 'Test message');
      await user.keyboard('{Shift>}{Enter}{/Shift}');

      expect(mockApiService.sendChatMessage).not.toHaveBeenCalled();
    });
  });

  describe('Session Management', () => {
    it('should generate unique session ID', () => {
      const { unmount } = render(<Chat {...defaultProps} />);

      // Get the first session ID by checking API calls
      expect(mockApiService.getChatHistory).toHaveBeenCalledWith(
        expect.stringMatching(/^chat-\d+-[a-z0-9]+$/)
      );

      const firstSessionId = mockApiService.getChatHistory.mock.calls[0][0];

      // Unmount and create new instance
      unmount();
      vi.clearAllMocks();

      render(<Chat {...defaultProps} />);

      const secondSessionId = mockApiService.getChatHistory.mock.calls[0][0];

      expect(firstSessionId).not.toBe(secondSessionId);
    });
  });
});