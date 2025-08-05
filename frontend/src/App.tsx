import React, { useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import WizardContainer from './components/WizardContainer';
import SectionDetail from './components/SectionDetail';
import Chat from './components/Chat';
import { OnboardingContext } from './types/onboarding';
import './App.css';

const App: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState<OnboardingContext>({
    sessionId: `app-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
  });

  const handleOpenChat = useCallback((context?: Partial<OnboardingContext>) => {
    if (context) {
      setChatContext(prev => ({
        ...prev,
        ...context,
      }));
    }
    setIsChatOpen(true);
  }, []);

  const handleCloseChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  const updateChatContext = useCallback((context: Partial<OnboardingContext>) => {
    setChatContext(prev => ({
      ...prev,
      ...context,
    }));
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <div className="app">
          <Routes>
            <Route path="/" element={<Navigate to="/wizard" replace />} />
            <Route 
              path="/wizard" 
              element={
                <WizardContainer 
                  onChatOpen={handleOpenChat}
                  onContextUpdate={updateChatContext}
                />
              } 
            />
            <Route 
              path="/wizard/section/:sectionId" 
              element={
                <SectionDetail 
                  onChatOpen={handleOpenChat}
                  onContextUpdate={updateChatContext}
                />
              } 
            />
            <Route path="*" element={<Navigate to="/wizard" replace />} />
          </Routes>
          
          {/* Global Chat Component */}
          <Chat
            isOpen={isChatOpen}
            onClose={handleCloseChat}
            context={chatContext}
          />
        </div>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
