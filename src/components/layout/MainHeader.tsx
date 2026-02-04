import React from 'react';
import { Layout, Typography, Space } from 'antd';
import { Link, useLocation } from 'react-router-dom';

const { Header } = Layout;
const { Title, Text } = Typography;

const MainHeader: React.FC = () => {
  const location = useLocation();

  return (
    <Header 
      className="flex items-center justify-between px-8 border-b border-slate-200 z-20 relative"
      style={{ height: 64, background: '#ffffff', lineHeight: '64px' }}
    >
      <div className="flex items-center gap-10">
        <Link to="/" className="flex items-center gap-3 no-underline">
          <Title level={4} style={{ margin: 0, fontWeight: 900, letterSpacing: '-0.8px', color: '#0f172a' }}>
            Memeplate
          </Title>
        </Link>

        <nav className="flex items-center gap-6">
          <Link 
            to="/" 
            className={`text-sm font-bold no-underline transition-colors ${location.pathname === '/' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
          >
            홈
          </Link>
          <Link 
            to="/create" 
            className={`text-sm font-bold no-underline transition-colors ${location.pathname === '/create' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Memeplate 생성
          </Link>
        </nav>
      </div>
      
      <div className="flex items-center">
         {/* 필요한 경우 우측 메뉴 추가 (예: 로그인 등) */}
         <Text type="secondary" className="text-xs font-bold uppercase tracking-widest">v1.0.0</Text>
      </div>
    </Header>
  );
};

export default MainHeader;
