import React, { useEffect, useState } from 'react';
import { Layout, Button, Drawer, Dropdown } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '@mdi/react';
import { mdiMenu, mdiChevronDown, mdiWeatherNight, mdiWhiteBalanceSunny } from '@mdi/js';
import { useAuthStore } from '../../stores/authStore';
import { useThemeMode } from '../../theme/useThemeMode';

const { Header } = Layout;

const MainHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const authUser = useAuthStore((state) => state.user);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const initialized = useAuthStore((state) => state.initialized);
  const syncSession = useAuthStore((state) => state.syncSession);
  const logout = useAuthStore((state) => state.logout);
  const { mode, toggleMode } = useThemeMode();

  const navLinks = [
    { to: '/', label: '홈' },
    { to: '/create', label: '밈플릿 생성' },
    { to: '/templates', label: '밈플릿 목록' },
  ];
  const isLinkActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  useEffect(() => {
    if (!initialized) {
      void syncSession();
    }
  }, [initialized, syncSession]);

  const handleLogin = () => {
    navigate('/login');
  };

  const handleLogout = async () => {
    await logout();
    setIsDrawerOpen(false);
  };

  const authDisplayName = authUser?.displayName || authUser?.email || '로그인 사용자';
  const themeLabel = mode === 'light' ? '다크 모드' : '라이트 모드';
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
      className="border-b border-slate-200 z-30 relative"
      style={{ height: 64, background: 'var(--app-surface-elevated)', padding: 0, lineHeight: 'normal' }}
    >
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2 md:gap-10">
          <div className="flex h-8 items-center md:hidden">
            <Button
              type="text"
              className="inline-flex h-8 w-8 min-w-8 items-center justify-center p-0 leading-none"
              icon={<Icon path={mdiMenu} size={1.1} style={{ display: 'block' }} />}
              onClick={() => setIsDrawerOpen(true)}
              aria-label="메뉴 열기"
              style={{ lineHeight: 1 }}
            />
          </div>
          <Link to="/" className="inline-flex h-8 items-center gap-4 no-underline">
            <span className="text-[24px] font-black leading-none tracking-[-0.8px] text-slate-900">
              Memeplate
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <Link 
                key={link.to}
                to={link.to} 
                className={`text-sm font-bold no-underline transition-colors ${isLinkActive(link.to) ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="hidden md:flex items-center gap-2">
          <Button
            type="text"
            onClick={toggleMode}
            aria-label={themeLabel}
            title={themeLabel}
            className="inline-flex h-9 w-9 min-w-9 items-center justify-center p-0"
            icon={<Icon path={mode === 'light' ? mdiWeatherNight : mdiWhiteBalanceSunny} size={0.9} />}
          />
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

      </div>

      <Drawer
        title={
          <div className="flex items-center">
            <span className="text-base font-extrabold tracking-tight text-slate-900">Memeplate 메뉴</span>
          </div>
        }
        placement="left"
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        width={300}
        styles={{ body: { paddingTop: 16 } }}
      >
        <div className="flex flex-col gap-4 px-1">
          <Button
            type="default"
            onClick={toggleMode}
            className="h-11 rounded-xl font-semibold"
            icon={<Icon path={mode === 'light' ? mdiWeatherNight : mdiWhiteBalanceSunny} size={0.85} />}
          >
            {themeLabel}
          </Button>
          {navLinks.map(link => (
            <Link 
              key={link.to}
              to={link.to} 
              onClick={() => setIsDrawerOpen(false)}
              className={`flex items-center rounded-xl border px-4 py-3 text-sm font-bold no-underline transition-colors ${
                isLinkActive(link.to)
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            {isAuthLoading ? null : authUser ? (
              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold text-slate-500">계정</span>
                <span className="text-sm font-semibold text-slate-700 break-all">{authDisplayName}</span>
                <Button block onClick={() => {
                  navigate('/my');
                  setIsDrawerOpen(false);
                }}>
                  마이페이지
                </Button>
                <Button block onClick={() => {
                  navigate('/my/templates');
                  setIsDrawerOpen(false);
                }}>
                  내 밈플릿
                </Button>
                <Button block onClick={() => { void handleLogout(); }}>로그아웃</Button>
              </div>
            ) : (
              <Button type="primary" block onClick={handleLogin}>로그인</Button>
            )}
          </div>
        </div>
      </Drawer>
    </Header>
  );
};

export default MainHeader;
