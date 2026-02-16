import React, { useEffect, useState } from 'react';
import { Layout, Typography, Button, Drawer, Dropdown } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '@mdi/react';
import { mdiMenu, mdiChevronDown } from '@mdi/js';

const { Header } = Layout;
const { Title } = Typography;

type AuthUser = {
  id: string;
  email: string | null;
  displayName: string | null;
};

type AuthMeResponse = {
  authenticated: boolean;
  user?: AuthUser;
};

const MainHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  const navLinks = [
    { to: '/', label: '홈' },
    { to: '/create', label: 'Memeplate 생성' },
    { to: '/templates', label: '밈플릿 목록' },
  ];

  const syncAuthSession = async () => {
    try {
      setIsAuthLoading(true);
      const res = await fetch('/api/v1/auth/me', {
        credentials: 'include'
      });
      if (!res.ok) {
        setAuthUser(null);
        return;
      }
      const payload = (await res.json()) as AuthMeResponse;
      if (payload.authenticated && payload.user) {
        setAuthUser(payload.user);
      } else {
        setAuthUser(null);
      }
    } catch {
      setAuthUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    void syncAuthSession();
  }, []);

  const handleLogin = () => {
    navigate('/login');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } finally {
      await syncAuthSession();
      setIsDrawerOpen(false);
    }
  };

  const authDisplayName = authUser?.displayName || authUser?.email || '로그인 사용자';
  const userMenuItems = [
    {
      key: 'mypage',
      label: '마이페이지',
      onClick: () => navigate('/my')
    },
    {
      key: 'my-templates',
      label: '내 밈플릿',
      onClick: () => navigate('/my/templates')
    },
    {
      key: 'logout',
      label: '로그아웃',
      onClick: () => { void handleLogout(); }
    }
  ];

  return (
    <Header 
      className="flex items-center justify-between px-4 md:px-6 border-b border-slate-200 z-30 relative"
      style={{ height: 64, background: '#ffffff', lineHeight: '64px', padding: '0 24px' }}
    >
      <div className="flex items-center gap-10">
        <Link to="/" className="flex items-center gap-4 no-underline">
          <Title level={4} style={{ margin: 0, fontWeight: 900, letterSpacing: '-0.8px', color: '#0f172a' }}>
            Memeplate
          </Title>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map(link => (
            <Link 
              key={link.to}
              to={link.to} 
              className={`text-sm font-bold no-underline transition-colors ${location.pathname === link.to ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      
      <div className="hidden md:flex items-center gap-3">
        {isAuthLoading ? null : authUser ? (
          <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
            <Button type="text" className="flex items-center gap-1 px-2">
              <span className="max-w-[260px] truncate text-sm font-semibold text-slate-700" title={authDisplayName}>
                {authDisplayName}
              </span>
              <Icon path={mdiChevronDown} size={0.7} />
            </Button>
          </Dropdown>
        ) : (
          <Button type="primary" onClick={handleLogin}>로그인</Button>
        )}
      </div>

      <div className="flex items-center gap-4 md:hidden">
        {/* Mobile Hamburger Menu */}
        <Button 
          type="text" 
          className="flex items-center justify-center p-0" 
          icon={<Icon path={mdiMenu} size={1.2} />} 
          onClick={() => setIsDrawerOpen(true)}
        />
      </div>

      <Drawer
        title="메뉴"
        placement="right"
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        styles={{ wrapper: { width: 280 } }}
      >
        <div className="flex flex-col gap-6 pt-8 px-2">
          {navLinks.map(link => (
            <Link 
              key={link.to}
              to={link.to} 
              onClick={() => setIsDrawerOpen(false)}
              className={`text-xl font-black no-underline transition-colors ${location.pathname === link.to ? 'text-blue-600' : 'text-slate-800 hover:text-blue-500'}`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-6 border-t border-slate-200">
            {isAuthLoading ? null : authUser ? (
              <div className="flex flex-col gap-3">
                <span className="text-sm font-semibold text-slate-600 break-all">{authDisplayName}</span>
                <Button onClick={() => {
                  navigate('/my');
                  setIsDrawerOpen(false);
                }}>
                  마이페이지
                </Button>
                <Button onClick={() => {
                  navigate('/my/templates');
                  setIsDrawerOpen(false);
                }}>
                  내 밈플릿
                </Button>
                <Button onClick={() => { void handleLogout(); }}>로그아웃</Button>
              </div>
            ) : (
              <Button type="primary" onClick={handleLogin}>로그인</Button>
            )}
          </div>
        </div>
      </Drawer>
    </Header>
  );
};

export default MainHeader;
