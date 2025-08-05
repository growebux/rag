import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import {
  OnboardingSection,
  SectionGuidanceResponse,
  HelpContent,
  OnboardingContext,
} from '../types/onboarding';
import { apiService } from '../services/api';
import HelpSystem from './HelpSystem';
import './SectionDetail.css';

interface SectionDetailProps {
  section?: OnboardingSection;
  onBack?: () => void;
  // eslint-disable-next-line no-unused-vars
  onChatOpen?: (context?: Partial<OnboardingContext>) => void;
  // eslint-disable-next-line no-unused-vars
  onContextUpdate?: (context: Partial<OnboardingContext>) => void;
}

const SectionDetail: React.FC<SectionDetailProps> = ({ 
  section, 
  onBack, 
  onChatOpen, 
  onContextUpdate 
}) => {
  const [guidance, setGuidance] = useState<SectionGuidanceResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGuidance = async () => {
      // If section prop is provided, use it directly
      if (section) {
        setGuidance({
          section,
          guidance: {
            title: `${section.title} Guide`,
            content: `This section helps you complete: ${section.description}`,
          },
          relatedSections: [],
        });
        setLoading(false);
        
        // Update chat context
        if (onContextUpdate) {
          onContextUpdate({
            currentSection: section.id,
            sectionTitle: section.title,
            sectionDescription: section.description,
          });
        }
        return;
      }

      // If no sectionId, we can't fetch anything
      if (!sectionId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const guidanceData = await apiService.getSectionGuidance(
          sectionId as any
        );
        setGuidance(guidanceData);
        setError(null);
        
        // Update chat context with fetched section data
        if (onContextUpdate && guidanceData.section) {
          onContextUpdate({
            currentSection: guidanceData.section.id,
            sectionTitle: guidanceData.section.title,
            sectionDescription: guidanceData.section.description,
          });
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load section guidance'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchGuidance();
  }, [sectionId, section, onContextUpdate]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/wizard');
    }
  };

  const renderHelpContent = (helpContent: HelpContent) => {
    // Parse markdown content to HTML
    const parseMarkdown = (content: string) => {
      try {
        return marked.parse(content);
      } catch (error) {
        console.error('Error parsing markdown:', error);
        // Fallback: convert basic formatting
        return content
          .replace(/\n\n/g, '</p><p>')
          .replace(/\n/g, '<br>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/^### (.*$)/gm, '<h3>$1</h3>')
          .replace(/^## (.*$)/gm, '<h2>$1</h2>')
          .replace(/^# (.*$)/gm, '<h1>$1</h1>')
          .replace(/^- (.*$)/gm, '<li>$1</li>')
          .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
      }
    };

    return (
      <div className="help-content">
        <h3>{helpContent.title}</h3>
        <div
          className="help-text"
          dangerouslySetInnerHTML={{ __html: parseMarkdown(helpContent.content) }}
        />
        {helpContent.examples && helpContent.examples.length > 0 && (
          <div className="help-examples">
            <h4>Examples:</h4>
            <ul>
              {helpContent.examples.map((example, index) => (
                <li key={index}>{example}</li>
              ))}
            </ul>
          </div>
        )}
        {helpContent.commonIssues && helpContent.commonIssues.length > 0 && (
          <div className="help-issues">
            <h4>Common Issues:</h4>
            <ul>
              {helpContent.commonIssues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="section-detail">
        <div className="section-loading">
          <div className="loading-spinner"></div>
          <p>Loading section details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section-detail">
        <div className="section-error">
          <h2>Error Loading Section</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button
              onClick={() => window.location.reload()}
              className="retry-button"
            >
              Retry
            </button>
            <button onClick={handleBack} className="back-button">
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentSection = guidance?.section || section;

  if (!currentSection) {
    return (
      <div className="section-detail">
        <div className="section-error">
          <h2>Section Not Found</h2>
          <p>The requested section could not be found.</p>
          <button onClick={handleBack} className="back-button">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="section-detail" data-testid="section-detail">
      <header className="section-header">
        <button onClick={handleBack} className="back-button" data-testid="back-to-wizard">
          ← Back to Overview
        </button>
        <div className="section-info">
          <h1>{currentSection.title}</h1>
          <p className="section-description">{currentSection.description}</p>
          <div className="section-meta">
            <span className="estimated-time">
              ⏱️ Estimated time: {currentSection.estimatedTime}
            </span>
            <span className="requirements-count">
              📋 {currentSection.requirements.length} requirements
            </span>
          </div>
        </div>
      </header>

      <div className="section-content">
        <div className="requirements-section">
          <h2>Requirements</h2>
          <div className="requirements-list">
            {currentSection.requirements.map((requirement, index) => (
              <div key={index} className="requirement-item">
                <div className="requirement-number">{index + 1}</div>
                <div className="requirement-text">{requirement}</div>
              </div>
            ))}
          </div>
        </div>

        {guidance?.guidance && (
          <div className="guidance-section">
            <h2>Guidance</h2>
            {renderHelpContent(guidance.guidance)}
          </div>
        )}

        {/* Help System Integration */}
        <HelpSystem
          section={currentSection}
          onChatOpen={() => {
            if (onChatOpen) {
              onChatOpen({
                currentSection: currentSection.id,
                sectionTitle: currentSection.title,
                sectionDescription: currentSection.description,
                userQuery: `I need help with ${currentSection.title}`,
              });
            }
          }}
        />

        {guidance?.relatedSections && guidance.relatedSections.length > 0 && (
          <div className="related-sections">
            <h2>Related Sections</h2>
            <div className="related-list">
              {guidance.relatedSections.map(relatedSection => (
                <div
                  key={relatedSection.id}
                  className="related-item"
                  onClick={() =>
                    navigate(`/wizard/section/${relatedSection.id}`)
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/wizard/section/${relatedSection.id}`);
                    }
                  }}
                >
                  <h4>{relatedSection.title}</h4>
                  <p>{relatedSection.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="section-actions">
        <button onClick={handleBack} className="secondary-button">
          Back to Overview
        </button>
        <button className="primary-button" disabled>
          Continue (Coming Soon)
        </button>
      </div>

      {/* Floating Chat Button */}
      {onChatOpen && currentSection && (
        <button
          className="floating-chat-button"
          data-testid="open-chat"
          onClick={() => onChatOpen({
            currentSection: currentSection.id,
            sectionTitle: currentSection.title,
            sectionDescription: currentSection.description,
            userQuery: `I need help with ${currentSection.title}`,
          })}
          aria-label="Open chat support"
          title="Get help with chat"
        >
          💬
        </button>
      )}
    </div>
  );
};

export default SectionDetail;
