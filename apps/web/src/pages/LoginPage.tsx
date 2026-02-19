import React from 'react';
import Icon from '@mdi/react';
import { mdiGoogle } from '@mdi/js';
import { Button } from '@/components/ui/button';

const LoginPage: React.FC = () => {
  const handleGoogleLogin = () => {
    window.location.href = '/api/v1/auth/google/start';
  };

  return (
    <div className="h-screen bg-app-bg">
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
