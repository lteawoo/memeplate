import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import LoginPage from './pages/LoginPage';
import TemplatesPage from './pages/TemplatesPage';
import TemplateShareDetailPage from './pages/TemplateShareDetailPage';
import ImageShareDetailPage from './pages/ImageShareDetailPage';
import MyTemplatesPage from './pages/MyTemplatesPage';
import MyPage from './pages/MyPage';
import PrivacyPage from './pages/PrivacyPage';
import AboutPage from './pages/AboutPage';
import TermsPage from './pages/TermsPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
};

export default App;
