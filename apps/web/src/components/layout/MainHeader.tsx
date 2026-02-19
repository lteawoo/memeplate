import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '@mdi/react';
import { mdiMenu, mdiChevronDown, mdiWeatherNight, mdiWhiteBalanceSunny } from '@mdi/js';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAuthStore } from '../../stores/authStore';
import { useThemeMode } from '../../theme/useThemeMode';

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

  return (
    <header className="relative z-30 h-16 border-b border-slate-200 bg-app-surface-elevated">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2 md:gap-10">
          <div className="flex h-8 items-center md:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="inline-flex h-8 w-8 min-w-8 items-center justify-center p-0 leading-none"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="메뉴 열기"
            >
              <Icon path={mdiMenu} size={1.1} style={{ display: 'block' }} />
            </Button>
          </div>
          <Link to="/" className="inline-flex h-8 items-center gap-4 no-underline">
            <span className="text-[24px] font-black leading-none tracking-[-0.8px] text-slate-900">
              Memeplate
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
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

        <div className="hidden items-center gap-2 md:flex">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleMode}
            aria-label={themeLabel}
            title={themeLabel}
            className="inline-flex h-9 w-9 min-w-9 items-center justify-center p-0"
          >
            <Icon path={mode === 'light' ? mdiWeatherNight : mdiWhiteBalanceSunny} size={0.9} />
          </Button>
          {isAuthLoading ? null : authUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" className="flex items-center gap-1 px-2">
                  <span className="max-w-[260px] truncate text-sm font-semibold text-slate-700" title={authDisplayName}>
                    {authDisplayName}
                  </span>
                  <Icon path={mdiChevronDown} size={0.7} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => navigate('/my')}>마이페이지</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/my/templates')}>내 밈플릿</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { void handleLogout(); }}>로그아웃</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button type="button" onClick={handleLogin}>로그인</Button>
          )}
        </div>
      </div>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent
          side="left"
          className="w-[300px] border-slate-200 bg-app-surface-elevated p-0 text-slate-900"
        >
          <SheetHeader className="border-b border-slate-200 px-5 py-4">
            <SheetTitle className="text-base font-extrabold tracking-tight text-slate-900">Memeplate 메뉴</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-5 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={toggleMode}
              className="h-11 rounded-xl font-semibold"
            >
              <Icon path={mode === 'light' ? mdiWeatherNight : mdiWhiteBalanceSunny} size={0.85} />
              {themeLabel}
            </Button>
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsDrawerOpen(false)}
                className={`flex items-center rounded-xl border px-4 py-3 text-sm font-bold no-underline transition-colors ${
                  isLinkActive(link.to)
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-100 p-4">
              {isAuthLoading ? null : authUser ? (
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-semibold text-slate-500">계정</span>
                  <span className="break-all text-sm font-semibold text-slate-700">{authDisplayName}</span>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      navigate('/my');
                      setIsDrawerOpen(false);
                    }}
                  >
                    마이페이지
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      navigate('/my/templates');
                      setIsDrawerOpen(false);
                    }}
                  >
                    내 밈플릿
                  </Button>
                  <Button type="button" className="w-full" onClick={() => { void handleLogout(); }}>로그아웃</Button>
                </div>
              ) : (
                <Button type="button" className="w-full" onClick={handleLogin}>로그인</Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
};

export default MainHeader;
