import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainHeader from '../components/layout/MainHeader';
import Icon from '@mdi/react';
import { mdiPlus } from '@mdi/js';
import { Button } from '@/components/ui/button';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-app-bg">
      <MainHeader />
      <main className="flex flex-col items-center justify-center p-6">
        <div className="max-w-2xl text-center">
          <h1 className="mb-6 text-6xl font-black tracking-tighter text-slate-900">
            Hello World!
          </h1>
          <h2 className="mb-8 text-2xl font-medium text-slate-500">
            쉽고 빠르게 나만의 Memeplate를 만들어보세요.
          </h2>

          <Button
            type="button"
            size="lg"
            onClick={() => navigate('/create')}
            className="mx-auto flex h-16 items-center gap-3 rounded-2xl px-10 text-xl font-bold"
          >
            <Icon path={mdiPlus} size={1} />
            밈플릿 생성
          </Button>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
