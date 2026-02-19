import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import LoginPage from './pages/LoginPage';
import TemplatesPage from './pages/TemplatesPage';
import TemplateShareDetailPage from './pages/TemplateShareDetailPage';
import ImageShareDetailPage from './pages/ImageShareDetailPage';
import MyTemplatesPage from './pages/MyTemplatesPage';
import MyPage from './pages/MyPage';
import { getAntThemeTokens } from './theme/theme';
import { useThemeMode } from './theme/useThemeMode';

const App: React.FC = () => {
  const { mode } = useThemeMode();

  return (
    <ConfigProvider
      theme={{
        token: getAntThemeTokens(mode)
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<EditorPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/templates/s/:shareSlug" element={<TemplateShareDetailPage />} />
          <Route path="/images/s/:shareSlug" element={<ImageShareDetailPage />} />
          <Route path="/my" element={<MyPage />} />
          <Route path="/my/templates" element={<MyTemplatesPage />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
