import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { Button } from './components/ui/button';
import HomePage from './pages/HomePage';

const EditorPage = lazy(() => import('./pages/EditorPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'));
const TemplateShareDetailPage = lazy(() => import('./pages/TemplateShareDetailPage'));
const ImageShareDetailPage = lazy(() => import('./pages/ImageShareDetailPage'));
const MyTemplatesPage = lazy(() => import('./pages/MyTemplatesPage'));
const MyPage = lazy(() => import('./pages/MyPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));

const RouteFallback: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-app-surface">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-foreground/60" />
  </div>
);

type RouteErrorBoundaryProps = {
  children: React.ReactNode;
};

type RouteErrorBoundaryState = {
  hasError: boolean;
};

class RouteErrorBoundary extends React.Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Route chunk loading failed', error);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-app-surface px-6 text-center">
        <p className="text-base font-semibold text-foreground">페이지를 불러오지 못했습니다.</p>
        <p className="max-w-sm text-sm text-muted-foreground">네트워크 상태를 확인한 뒤 다시 시도해 주세요.</p>
        <div className="flex items-center gap-2">
          <Button onClick={this.handleReload}>새로고침</Button>
          <Button asChild variant="outline">
            <Link to="/">홈으로 이동</Link>
          </Button>
        </div>
      </div>
    );
  }
}

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <RouteErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<EditorPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/memeplates" element={<TemplatesPage />} />
            <Route path="/memeplates/s/:shareSlug" element={<TemplateShareDetailPage />} />
            <Route path="/remixes/s/:shareSlug" element={<ImageShareDetailPage />} />
            <Route path="/my" element={<MyPage />} />
            <Route path="/my/memeplates" element={<MyTemplatesPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/terms" element={<TermsPage />} />
          </Routes>
        </Suspense>
      </RouteErrorBoundary>
    </BrowserRouter>
  );
};

export default App;
