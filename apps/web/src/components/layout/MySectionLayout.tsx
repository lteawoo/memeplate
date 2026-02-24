import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import MainHeader from './MainHeader';
import MainFooter from './MainFooter';
import PageContainer from './PageContainer';

interface MySectionLayoutProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}

const menuItems = [
  { key: '/my', label: '내 프로필' },
  { key: '/my/memeplates', label: '내 밈플릿' }
];

const MySectionLayout: React.FC<MySectionLayoutProps> = ({
  title,
  description,
  action,
  children
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedKey = location.pathname.startsWith('/my/memeplates')
    ? '/my/memeplates'
    : '/my';

  return (
    <div className="min-h-screen bg-app-surface">
      <MainHeader />
      <PageContainer className="py-8">
        <div className="grid gap-6 md:grid-cols-[224px_minmax(0,1fr)] md:gap-8">
          <aside className="hidden md:block">
            <div className="rounded-2xl bg-card p-3">
              <div className="px-2 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">My</div>
              <nav className="flex flex-col gap-1">
                {menuItems.map((item) => (
                  <Button
                    key={item.key}
                    type="button"
                    variant={selectedKey === item.key ? 'secondary' : 'ghost'}
                    className="h-10 justify-start px-3"
                    onClick={() => navigate(item.key)}
                  >
                    {item.label}
                  </Button>
                ))}
              </nav>
            </div>
          </aside>

          <main className="min-w-0 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-foreground md:text-3xl">{title}</h1>
                {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
              </div>
              {action ? <div className="shrink-0">{action}</div> : null}
            </div>

            <nav className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-2 md:hidden">
              {menuItems.map((item) => (
                <Button
                  key={item.key}
                  type="button"
                  variant={selectedKey === item.key ? 'secondary' : 'ghost'}
                  className="h-10 rounded-lg"
                  onClick={() => navigate(item.key)}
                >
                  {item.label}
                </Button>
              ))}
            </nav>

            <div>
              {children}
            </div>
          </main>
        </div>
      </PageContainer>
      <MainFooter />
    </div>
  );
};

export default MySectionLayout;
