import React, { Component, ErrorInfo, ReactNode, useMemo, useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { SurveyModal } from './components/SurveyModal';
import { ResponsesDashboard } from './components/ResponsesDashboard';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application error boundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <h1 className="font-display text-xl font-semibold text-slate-900">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-slate-600">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-lg bg-[#0B1120] px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 cursor-pointer"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const initialIsSurveyRoute = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return (
      params.get('survey') === '1' ||
      window.location.hash === '#survey' ||
      window.location.pathname === '/survey'
    );
  }, []);

  const [isStandaloneSurvey, setIsStandaloneSurvey] = useState(initialIsSurveyRoute);
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [isResponsesOpen, setIsResponsesOpen] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '?survey=1';
    const url = new URL(window.location.href);
    url.pathname = '/';
    url.search = '?survey=1';
    url.hash = '';
    return url.toString();
  }, []);

  const handleCloseSurvey = () => {
    setIsSurveyModalOpen(false);
    if (isStandaloneSurvey && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.pathname === '/survey') {
        url.pathname = '/';
      }
      url.searchParams.delete('survey');
      url.hash = '';
      window.history.replaceState({}, '', url.toString());
      setIsStandaloneSurvey(false);
    }
  };

  return (
    <AppErrorBoundary>
      {isStandaloneSurvey ? (
        <SurveyModal
          isOpen={true}
          isStandaloneRoute={true}
          onClose={handleCloseSurvey}
          shareUrl={shareUrl}
        />
      ) : (
        <>
          <LandingPage
            onOpenSurvey={() => setIsSurveyModalOpen(true)}
            onOpenResponses={() => setIsResponsesOpen(true)}
            shareUrl={shareUrl}
          />
          <SurveyModal
            isOpen={isSurveyModalOpen}
            isStandaloneRoute={false}
            onClose={handleCloseSurvey}
            shareUrl={shareUrl}
          />
          <ResponsesDashboard
            isOpen={isResponsesOpen}
            onClose={() => setIsResponsesOpen(false)}
            onOpenSurvey={() => setIsSurveyModalOpen(true)}
          />
        </>
      )}
    </AppErrorBoundary>
  );
}
