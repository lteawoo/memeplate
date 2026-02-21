import React from 'react';
import Icon from '@mdi/react';
import { mdiGoogle } from '@mdi/js';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { sanitizeNextPath } from '@/lib/loginNavigation';

const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const handleGoogleLogin = () => {
    const nextPath = sanitizeNextPath(searchParams.get('next'));
    const nextQuery = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
    window.location.href = `/api/v1/auth/google/start${nextQuery}`;
  };

  return (
    <div className="h-screen bg-app-surface">
      <main className="flex h-full items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-8 text-5xl font-black tracking-tighter text-foreground md:text-6xl">
            Memeplate
          </h1>
          <Button
            type="button"
            onClick={handleGoogleLogin}
            className="h-14 w-full rounded-2xl text-base font-bold"
          >
            <Icon path={mdiGoogle} size={0.9} />
            구글 로그인
          </Button>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
