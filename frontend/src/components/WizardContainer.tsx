import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { OnboardingSection, OnboardingContext } from '../types/onboarding';
import { apiService } from '../services/api';
import HelpSystem from './HelpSystem';
import './WizardContainer.css';

interface WizardContainerProps {
  // eslint-disable-next-line no-unused-vars
  onSectionSelect?: (section: OnboardingSection) => void;
  currentSection?: OnboardingSection;
  // eslint-disable-next-line no-unused-vars
  onChatOpen?: (context?: Partial<OnboardingContext>) => void;
  // eslint-disable-next-line no-unused-vars
  onContextUpdate?: (context: Partial<OnboardingContext>) => void;
}

const WizardContainer: React.FC<WizardContainerProps> = ({
  onSectionSelect,
  currentSection,
  onChatOpen,
  onContextUpdate,
}) => {
  const [sections, setSections] = useState<OnboardingSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [helpSection, setHelpSection] = useState<OnboardingSection | null>(
    null
  );
  const [showHelpOverlay, setShowHelpOverlay] = useState(false);
  const navigate = useNavigate();
  const { sectionId } = useParams<{ sectionId: string }>();

  useEffect(() => {
    const fetchSections = async () => {
      try {
        setLoading(true);
        const fetchedSections = await apiService.getSections();
        setSections(fetchedSections);
        setError(null);
        
        // Update chat context with overall progress
        if (onContextUpdate) {
          onContextUpdate({
            userProgress: {
              completedSections: [], // TODO: Track actual completion
              currentStep: sectionId ? fetchedSections.findIndex(s => s.id.toString() === sectionId) + 1 : 0,
              totalSteps: fetchedSections.length,
            },
          });
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load sections'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSections();
  }, [sectionId, onContextUpdate]);

  const handleSectionClick = (section: OnboardingSection) => {
    navigate(`/wizard/section/${section.id}`);
    onSectionSelect?.(section);
    
    // Update chat context when section is selected
    if (onContextUpdate) {
      onContextUpdate({
        currentSection: section.id,
        sectionTitle: section.title,
        sectionDescription: section.description,
      });
    }
  };

  const handleHelpClick = (
    section: OnboardingSection,
    event: React.MouseEvent
  ) => {
    event.stopPropagation(); // Prevent section navigation
    setHelpSection(section);
    setShowHelpOverlay(true);
  };

  const handleCloseHelp = () => {
    setShowHelpOverlay(false);
    setHelpSection(null);
  };

  const getStepNumber = (sectionOrder: number): number => {
    return sectionOrder;
  };

  const getSectionStatus = (section: OnboardingSection): string => {
    if (
      currentSection?.id === section.id ||
      sectionId === section.id.toString()
    ) {
      return 'current';
    }
    // For now, all sections are available since we're not tracking completion
    return 'available';
  };

  if (loading) {
    return (
      <div className="wizard-container">
        <div className="wizard-loading">
          <div className="loading-spinner"></div>
          <p>Loading onboarding sections...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wizard-container">
        <div className="wizard-error">
          <h2>Error Loading Sections</h2>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-container" data-testid="wizard-container">
      <header className="wizard-header">
        <h1>ToursByLocals Onboarding</h1>
        <p>Complete your guide application step by step</p>
      </header>

      <div className="wizard-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${
                sectionId
                  ? ((sections.findIndex(s => s.id.toString() === sectionId) +
                      1) /
                      sections.length) *
                    100
                  : 0
              }%`,
            }}
          ></div>
        </div>
        <span className="progress-text">
          {sectionId
            ? `Step ${sections.findIndex(s => s.id.toString() === sectionId) + 1} of ${
                sections.length
              }`
            : `${sections.length} steps to complete`}
        </span>
      </div>

      <nav className="wizard-navigation">
        <div className="section-list">
          {sections
            .sort((a, b) => a.order - b.order)
            .map(section => {
              const status = getSectionStatus(section);
              const stepNumber = getStepNumber(section.order);

              return (
                <div
                  key={section.id}
                  className={`section-item ${status}`}
                  data-testid={`section-${section.id}`}
                  onClick={() => handleSectionClick(section)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSectionClick(section);
                    }
                  }}
                >
                  <div className="section-number">
                    <span className="step-number">{stepNumber}</span>
                  </div>
                  <div className="section-content">
                    <h3 className="section-title">{section.title}</h3>
                    <p className="section-description">{section.description}</p>
                    <div className="section-meta">
                      <span className="estimated-time">
                        ⏱️ {section.estimatedTime}
                      </span>
                      {section.requirements.length > 0 && (
                        <span className="requirements-count">
                          📋 {section.requirements.length} requirements
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="section-actions">
                    <button
                      className="help-trigger-button"
                      onClick={e => handleHelpClick(section, e)}
                      aria-label={`Get help with ${section.title}`}
                      title={`Get help with ${section.title}`}
                    >
                      ❓
                    </button>
                  </div>
                  <div className="section-status">
                    {status === 'current' && (
                      <span className="status-indicator current">
                        In Progress
                      </span>
                    )}
                    {status === 'completed' && (
                      <span className="status-indicator completed">✓</span>
                    )}
                    {status === 'available' && (
                      <span className="status-indicator available">→</span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </nav>

      {!sectionId && (
        <div className="wizard-welcome">
          <div className="welcome-content">
            <h2>Welcome to Your Onboarding Journey</h2>
            <p>
              Follow these steps to complete your ToursByLocals guide
              application. Each section will guide you through the requirements
              and provide helpful information along the way.
            </p>
            <div className="welcome-actions">
              <button
                onClick={() => {
                  const firstSection = sections.sort(
                    (a, b) => a.order - b.order
                  )[0];
                  if (firstSection) {
                    handleSectionClick(firstSection);
                  }
                }}
                className="start-button"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Overlay */}
      {showHelpOverlay && helpSection && (
        <div className="help-overlay">
          <div className="help-overlay-backdrop" onClick={handleCloseHelp} />
          <div className="help-overlay-content">
            <div className="help-overlay-header">
              <h2>Help: {helpSection.title}</h2>
              <button
                className="help-overlay-close"
                onClick={handleCloseHelp}
                aria-label="Close help"
              >
                ×
              </button>
            </div>
            <div className="help-overlay-body">
              <HelpSystem
                section={helpSection}
                onChatOpen={() => {
                  if (onChatOpen) {
                    onChatOpen({
                      currentSection: helpSection.id,
                      sectionTitle: helpSection.title,
                      sectionDescription: helpSection.description,
                      userQuery: `I need help with ${helpSection.title}`,
                    });
                  }
                  handleCloseHelp();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Button */}
      {onChatOpen && (
        <button
          className="floating-chat-button"
          data-testid="open-chat"
          onClick={() => {
            const currentSectionId = sectionId ? sections.find(s => s.id.toString() === sectionId)?.id : undefined;
            if (currentSectionId) {
              onChatOpen({
                currentSection: currentSectionId,
                userQuery: `I need help with the current section`,
              });
            } else {
              onChatOpen({
                userQuery: 'I need help with onboarding',
              });
            }
          }}
          aria-label="Open chat support"
          title="Get help with chat"
        >
          💬
        </button>
      )}
    </div>
  );
};

export default WizardContainer;
