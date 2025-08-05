import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChatMessage,
  OnboardingContext,
  DocumentSource,
  OnboardingSectionType,
} from '../types/onboarding';
import { apiService } from '../services/api';
import './Chat.css';

interface ChatProps {
  isOpen: boolean;
  onClose: () => void;
  context?: OnboardingContext;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  inputValue: string;
  sessionId: string;
}

// Helper function to get contextual suggestions based on current section
const getContextualSuggestions = (section: OnboardingSectionType): string[] => {
  const suggestions: Record<OnboardingSectionType, string[]> = {
    [OnboardingSectionType.PROFILE]: [
      'What makes a good profile photo?',
      'How should I write my bio?',
      'Which expertise areas should I choose?',
    ],
    [OnboardingSectionType.PERSONAL_INFO]: [
      'What documents do I need for verification?',
      'How is my personal information protected?',
      'What if I need to update my address?',
    ],
    [OnboardingSectionType.PAYMENT]: [
      'Which payment method should I choose?',
      'What tax information do I need?',
      'When will I receive payments?',
    ],
    [OnboardingSectionType.TOURS]: [
      'How should I price my tours?',
      'What photos work best for tours?',
      'How do I write compelling descriptions?',
    ],
    [OnboardingSectionType.CALENDAR]: [
      'How do I set my availability?',
      'What about different time zones?',
      'How do I handle booking conflicts?',
    ],
    [OnboardingSectionType.QUIZ]: [
      'How can I prepare for the quiz?',
      'What topics are covered?',
      "What happens if I don't pass?",
    ],
  };

  return (
    suggestions[section] || [
      'What should I do next?',
      'Are there any common mistakes to avoid?',
      'How long does this typically take?',
    ]
  );
};

const Chat: React.FC<ChatProps> = ({ isOpen, onClose, context }) => {
  const [sessionId] = useState(
    () => `chat-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  );
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
    inputValue: '',
    sessionId,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [state.messages, scrollToBottom]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Load chat history when component mounts or sessionId changes
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!isOpen) return;

      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const historyResponse = await apiService.getChatHistory(sessionId);

        // Convert the backend response to ChatMessage[]
        const messages: ChatMessage[] = (historyResponse.messages || []).map(
          msg => ({
            id: msg.id,
            content: msg.content,
            sender: msg.sender,
            timestamp: new Date(msg.timestamp),
            sources: msg.sources || [],
          })
        );

        setState(prev => ({
          ...prev,
          messages,
          isLoading: false,
        }));
      } catch (error) {
        console.error('Failed to load chat history:', error);
        // Always reset loading state, but only show error if it's not a "session not found" error
        setState(prev => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error && !error.message.includes('not found')
              ? error.message
              : null,
        }));
      }
    };

    loadChatHistory();
  }, [isOpen, sessionId]);

  const handleSendMessage = async () => {
    const message = state.inputValue.trim();
    if (!message || state.isLoading) return;

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: message,
      sender: 'user',
      timestamp: new Date(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      inputValue: '',
      isLoading: true,
      error: null,
    }));

    try {
      // Send message to backend
      const contextString = context ? JSON.stringify(context) : undefined;
      const response = await apiService.sendChatMessage(
        message,
        sessionId,
        contextString
      );

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: response.message.id,
        content: response.message.content,
        sender: 'assistant',
        timestamp: new Date(response.message.timestamp),
        sources: response.message.sources || [],
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to send message:', error);
      setState(prev => ({
        ...prev,
        error:
          error instanceof Error ? error.message : 'Failed to send message',
        isLoading: false,
      }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, inputValue: e.target.value }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatAssistantMessage = (content: string) => {
    // Split content into paragraphs and format for display
    return content
      .split('\n')
      .map((paragraph, index) => {
        if (paragraph.trim() === '') return null;

        // Check if it's a numbered list item
        if (/^\d+\.\s/.test(paragraph.trim())) {
          return (
            <div key={index} className="list-item numbered">
              {paragraph.trim()}
            </div>
          );
        }

        // Check if it's a bullet point
        if (/^-\s/.test(paragraph.trim())) {
          return (
            <div key={index} className="list-item bullet">
              {paragraph.trim()}
            </div>
          );
        }

        // Regular paragraph
        return (
          <div key={index} className="message-paragraph">
            {paragraph.trim()}
          </div>
        );
      })
      .filter(Boolean);
  };

  const handleClose = () => {
    onClose();
  };

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderSources = (sources?: DocumentSource[]) => {
    if (!sources || sources.length === 0) return null;

    return (
      <div className="message-sources">
        <div className="sources-header">Sources:</div>
        <div className="sources-list">
          {sources.map((source, index) => (
            <div key={source.id || index} className="source-item">
              <div className="source-title">{source.title}</div>
              <div className="source-excerpt">{source.excerpt}</div>
              <div className="source-meta">
                Section: {source.section} • Relevance:{' '}
                {Math.round(source.relevanceScore * 100)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="chat-overlay"
      data-testid="chat-interface"
      role="dialog"
      aria-labelledby="chat-title"
      aria-modal="true"
    >
      <div className="chat-backdrop" onClick={handleClose} />
      <div className="chat-container" ref={chatContainerRef}>
        <div className="chat-header">
          <h2 id="chat-title">Chat Assistant</h2>
          {context?.currentSection && (
            <div className="chat-context">
              <div className="context-section">
                📍{' '}
                {context.sectionTitle ||
                  context.currentSection.replace('_', ' ')}
              </div>
              {context.userProgress && (
                <div className="context-progress">
                  Step {context.userProgress.currentStep} of{' '}
                  {context.userProgress.totalSteps}
                </div>
              )}
            </div>
          )}
          <button
            className="chat-close-button"
            data-testid="close-chat"
            onClick={handleClose}
            aria-label="Close chat"
            type="button"
          >
            ×
          </button>
        </div>

        <div
          className="chat-messages"
          data-testid="chat-messages"
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
        >
          {state.messages.length === 0 && !state.isLoading && (
            <div className="chat-welcome">
              <div className="welcome-message">
                <h3>Welcome to Chat Support!</h3>
                {context?.currentSection ? (
                  <div className="contextual-welcome">
                    <p>
                      I&apos;m here to help you with{' '}
                      <strong>
                        {context.sectionTitle ||
                          context.currentSection.replace('_', ' ')}
                      </strong>
                      .
                    </p>
                    <p>You can ask me about:</p>
                    <div className="context-suggestions">
                      {getContextualSuggestions(context.currentSection).map(
                        (suggestion, index) => (
                          <button
                            key={index}
                            className="suggestion-button"
                            onClick={() =>
                              setState(prev => ({
                                ...prev,
                                inputValue: suggestion,
                              }))
                            }
                          >
                            {suggestion}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="general-welcome">
                    <p>
                      I&apos;m here to help you with your onboarding process.
                      Ask me anything about:
                    </p>
                    <ul>
                      <li>Profile setup and requirements</li>
                      <li>Personal information and payment details</li>
                      <li>Creating and publishing tours</li>
                      <li>Calendar management</li>
                      <li>Quiz preparation</li>
                    </ul>
                  </div>
                )}
                <p>How can I assist you today?</p>
              </div>
            </div>
          )}

          {state.messages.map(message => (
            <div
              key={message.id}
              className={`message ${message.sender}`}
              data-testid={`${message.sender}-message`}
              role="article"
              aria-label={`${message.sender} message`}
            >
              <div className="message-content">
                <div className="message-text">
                  {message.sender === 'assistant' ? (
                    <div className="assistant-message">
                      {formatAssistantMessage(message.content)}
                    </div>
                  ) : (
                    <div className="user-message">{message.content}</div>
                  )}
                </div>
                {renderSources(message.sources)}
              </div>
              <div className="message-meta">
                <span className="message-time">
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>
            </div>
          ))}

          {state.isLoading && (
            <div
              className="message assistant loading"
              data-testid="chat-loading"
              role="status"
              aria-label="Assistant is typing"
            >
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {state.error && (
          <div className="chat-error" data-testid="chat-error" role="alert">
            <div className="error-content">
              <span className="error-message">{state.error}</span>
              <button
                className="error-dismiss"
                onClick={clearError}
                aria-label="Dismiss error"
                type="button"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              className="chat-input"
              data-testid="chat-input"
              placeholder="Type your message..."
              value={state.inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={state.isLoading}
              aria-label="Type your message"
              maxLength={500}
            />
            <button
              className="chat-send-button"
              data-testid="send-message"
              onClick={handleSendMessage}
              disabled={!state.inputValue.trim() || state.isLoading}
              aria-label="Send message"
              type="button"
            >
              {state.isLoading ? (
                <span className="send-loading">⏳</span>
              ) : (
                <span className="send-icon">➤</span>
              )}
            </button>
          </div>
          <div className="input-meta">
            <span className="character-count">
              {state.inputValue.length}/500
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
