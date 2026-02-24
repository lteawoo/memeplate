import React from 'react';
import MainHeader from '../components/layout/MainHeader';
import MainFooter from '../components/layout/MainFooter';
import PageContainer from '../components/layout/PageContainer';

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-app-surface">
      <MainHeader />
      <PageContainer className="py-10">
        <section className="mx-auto max-w-3xl rounded-2xl bg-card p-8">
          <h1 className="text-3xl font-bold text-foreground">About</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Memeplate는 빠르고 간편하게 이미지를 만들고 공유할 수 있는 서비스입니다. 몇 번의 편집만으로
            바로 결과물을 만들고 링크로 친구들과 공유할 수 있으며, 공개로 설정하면 커뮤니티에서도 함께
            즐길 수 있습니다.
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            또한 비공개 설정을 통해 개인 작업용으로 보관할 수도 있어, 가볍게 만들고 필요할 때만 공개하는
            흐름에 맞춰져 있습니다. Memeplate는 이런 제작-공유 흐름을 밈에 맞게 최적화한 플랫폼입니다.
          </p>
        </section>
      </PageContainer>
      <MainFooter />
    </div>
  );
};

export default AboutPage;
