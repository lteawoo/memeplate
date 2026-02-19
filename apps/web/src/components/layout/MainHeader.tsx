import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '@mdi/react';
import {
  mdiMenu,
  mdiChevronDown,
  mdiWeatherNight,
  mdiWhiteBalanceSunny,
  mdiAccountCircleOutline,
  mdiPlus,
  mdiHomeOutline,
  mdiViewGridOutline,
  mdiChevronRight,
} from '@mdi/js';
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
  const drawerNavLinks = [
    { to: '/create', label: '밈플릿 생성', icon: mdiPlus },
    { to: '/', label: '홈', icon: mdiHomeOutline },
    { to: '/templates', label: '밈플릿 목록', icon: mdiViewGridOutline },
  ];

  return (
    <header className="relative z-30 h-16">
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
            <span className="text-[24px] font-black leading-none tracking-[-0.8px] text-foreground">
              Memeplate
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-bold no-underline transition-colors ${isLinkActive(link.to) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {isAuthLoading ? (
            <div className="h-8 w-8 rounded-full bg-muted" />
          ) : authUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full border border-border bg-muted text-foreground"
                  aria-label="계정 메뉴"
                >
                  <Icon path={mdiAccountCircleOutline} size={0.95} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => navigate('/my')}>마이페이지</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/my/templates')}>내 밈플릿</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { void handleLogout(); }}>로그아웃</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button type="button" variant="outline" size="sm" className="h-9 px-3" onClick={handleLogin}>
              로그인
            </Button>
          )}
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
                  <span className="max-w-[260px] truncate text-sm font-semibold text-foreground" title={authDisplayName}>
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
          className="w-[82vw] max-w-[320px] border-border bg-app-surface-elevated p-0 text-foreground"
        >
          <SheetHeader className="h-14 justify-center border-b border-border px-4 py-0 text-left">
            <SheetTitle className="text-base font-extrabold tracking-tight text-foreground">Memeplate 메뉴</SheetTitle>
          </SheetHeader>

          <div className="px-3 py-3">
            <nav className="space-y-1">
              {drawerNavLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsDrawerOpen(false)}
                  className={`group relative flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-semibold no-underline transition-colors ${
                    isLinkActive(link.to)
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {isLinkActive(link.to) ? <span className="absolute left-0 top-2 h-8 w-0.5 rounded-full bg-primary" /> : null}
                  <Icon
                    path={link.icon}
                    size={0.85}
                    className={isLinkActive(link.to) ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}
                  />
                  <span>{link.label}</span>
                  {!isLinkActive(link.to) ? <Icon path={mdiChevronRight} size={0.7} className="ml-auto text-muted-foreground/80" /> : null}
                </Link>
              ))}
            </nav>

            <div className="my-3 h-px bg-border" />

            <Button
              type="button"
              variant="ghost"
              onClick={toggleMode}
              className="h-11 w-full justify-start gap-3 rounded-lg px-3 font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Icon path={mode === 'light' ? mdiWeatherNight : mdiWhiteBalanceSunny} size={0.85} />
              {themeLabel}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
};

export default MainHeader;
