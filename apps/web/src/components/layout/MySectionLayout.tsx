import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import MainHeader from './MainHeader';

interface MySectionLayoutProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}

const menuItems = [
  { key: '/my', label: '내 프로필' },
  { key: '/my/templates', label: '내 밈플릿' }
];

const MySectionLayout: React.FC<MySectionLayoutProps> = ({
  title,
  description,
  action,
  children
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedKey = location.pathname.startsWith('/my/templates')
    ? '/my/templates'
    : '/my';

  return (
    <div className="min-h-screen bg-app-surface">
      <MainHeader />
      <div className="flex w-full bg-app-surface-elevated">
        <aside
          className="hidden w-[220px] border-r border-border bg-app-surface-elevated md:block"
        >
          <div className="px-4 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">My</div>
          <nav className="flex flex-col gap-1 px-2 pb-4">
            {menuItems.map((item) => (
              <Button
                key={item.key}
                type="button"
                variant={selectedKey === item.key ? 'secondary' : 'ghost'}
                className="justify-start"
                onClick={() => navigate(item.key)}
              >
                {item.label}
              </Button>
            ))}
          </nav>
        </aside>
        <main className="w-full bg-app-surface-elevated">
          <div className="py-8">
            <div className="mb-6 flex items-end justify-between gap-3 px-6 md:px-8">
              <div>
                <h1 className="mb-1 text-3xl font-bold text-foreground">{title}</h1>
                {description ? <p className="m-0 text-sm text-muted-foreground">{description}</p> : null}
              </div>
              {action}
            </div>
            <div className="px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MySectionLayout;
