import React, { useState, useCallback, useEffect } from 'react';
import {
  OnboardingSection,
  DocumentSource,
  OnboardingSectionType,
} from '../types/onboarding';
import { helpCache } from '../services/helpCache';
import './HelpSystem.css';

interface HelpSystemProps {
  section: OnboardingSection;
  onChatOpen?: () => void;
}

interface HelpResponse {
  question: string;
  answer: string;
  sources: DocumentSource[];
  confidence: number;
  context: {
    section: OnboardingSectionType | null;
    userContext: string | null;
  };
  suggestions: string[];
}

const HelpSystem: React.FC<HelpSystemProps> = ({ section, onChatOpen }) => {
  const [helpResponse, setHelpResponse] = useState<HelpResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Preload common questions for better performance
  useEffect(() => {
    helpCache.preloadCommonQuestions(section.id);
  }, [section.id]);

  const handleHelpRequest = useCallback(
    async (question: string, context?: string) => {
      if (!question.trim()) return;

      // Check cache first
      const cachedResponse = helpCache.get(
        question.trim(),
        section.id,
        context?.trim()
      );
      if (cachedResponse) {
        setHelpResponse(cachedResponse);
        setIsExpanded(true);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/help', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: question.trim(),
            section: section.id,
            context: context?.trim(),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to get help');
        }

        if (!data.success) {
          throw new Error(data.error || 'Help request failed');
        }

        // Cache the response
        helpCache.set(question.trim(), data.data, section.id, context?.trim());

        setHelpResponse(data.data);
        setIsExpanded(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get help');
      } finally {
        setLoading(false);
      }
    },
    [section.id]
  );

  const handleQuickHelp = useCallback(
    (suggestion: string) => {
      setQuery(suggestion);
      handleHelpRequest(suggestion);
    },
    [handleHelpRequest]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        handleHelpRequest(query);
      }
    },
    [query, handleHelpRequest]
  );

  const renderSources = (sources: DocumentSource[]) => {
    if (!sources || sources.length === 0) return null;

    return (
      <div className="help-sources">
        <h4>Sources</h4>
        <div className="sources-list">
          {sources.map(source => (
            <div key={source.id} className="source-item">
              <div className="source-header">
                <span className="source-title">{source.title}</span>
                <span className="source-relevance">
                  {Math.round(source.relevanceScore * 100)}% relevant
                </span>
              </div>
              <p className="source-excerpt">{source.excerpt}</p>
              <span className="source-section">
                Section: {source.section.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSuggestions = (suggestions: string[]) => {
    if (!suggestions || suggestions.length === 0) return null;

    return (
      <div className="help-suggestions">
        <h4>Suggested Questions</h4>
        <div className="suggestions-list">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              className="suggestion-button"
              onClick={() => handleQuickHelp(suggestion)}
              disabled={loading}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="help-system" data-testid="help-system">
      <div className="help-header">
        <h3>Need Help with {section.title}?</h3>
        <button
          className="help-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse help' : 'Expand help'}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {isExpanded && (
        <div className="help-content" data-testid="help-content">
          <form onSubmit={handleSubmit} className="help-form">
            <div className="help-input-group">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Ask a question about ${section.title.toLowerCase()}...`}
                className="help-input"
                disabled={loading}
              />
              <button
                type="submit"
                className="help-submit"
                disabled={loading || !query.trim()}
              >
                {loading ? 'Asking...' : 'Ask'}
              </button>
            </div>
          </form>

          {error && (
            <div className="help-error" data-testid="help-error">
              <p>Error: {error}</p>
              <button
                onClick={() => setError(null)}
                className="error-dismiss"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          {loading && (
            <div className="help-loading">
              <div className="loading-spinner"></div>
              <p>Getting help...</p>
            </div>
          )}

          {helpResponse && !loading && (
            <div className="help-response">
              <div className="help-answer">
                <h4>Answer</h4>
                <div
                  className="answer-content"
                  dangerouslySetInnerHTML={{ __html: helpResponse.answer }}
                />
                {helpResponse.confidence && (
                  <div className="confidence-indicator">
                    <span className="confidence-label">Confidence:</span>
                    <div className="confidence-bar">
                      <div
                        className="confidence-fill"
                        style={{ width: `${helpResponse.confidence * 100}%` }}
                      />
                    </div>
                    <span className="confidence-value">
                      {Math.round(helpResponse.confidence * 100)}%
                    </span>
                  </div>
                )}
              </div>

              {renderSources(helpResponse.sources)}
              {renderSuggestions(helpResponse.suggestions)}
            </div>
          )}

          <div className="help-actions">
            {onChatOpen && (
              <button
                onClick={onChatOpen}
                className="chat-button"
                type="button"
              >
                💬 Open Chat for More Help
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpSystem;
