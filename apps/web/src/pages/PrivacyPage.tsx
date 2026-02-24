import React from 'react';
import MainHeader from '../components/layout/MainHeader';
import MainFooter from '../components/layout/MainFooter';
import PageContainer from '../components/layout/PageContainer';

const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-app-surface">
      <MainHeader />
      <PageContainer className="py-10">
        <section className="mx-auto max-w-3xl rounded-2xl bg-card p-8">
          <h1 className="text-3xl font-bold text-foreground">Memeplate Privacy</h1>

          <h2 className="mt-6 text-lg font-semibold text-foreground">Memeplate / Remix</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            밈플릿/리믹스로 만든 모든 콘텐츠는 공개로 설정하면 누구나 볼 수 있습니다. 공개 상태의 콘텐츠는
            공유 링크(URL)로 접근할 수 있으며, 링크를 아는 사람은 로그인 없이도 볼 수 있습니다.
            커뮤니티 섹션에 별도로 노출되지 않더라도, 링크가 외부에서 공유되면 조회수가 빠르게 늘어날 수 있습니다.
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            비공개로 설정한 콘텐츠는 공개 목록이나 추천 영역에 노출되지 않으며, 링크를 통한 외부 접근도 제한됩니다.
            다만 서비스 무결성을 위해 리믹스가 이미 생성된 밈플릿은 비공개 전환이 제한될 수 있습니다.
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            로그인한 사용자는 본인이 만든 밈플릿/리믹스를 언제든 직접 수정하거나 삭제할 수 있습니다.
            삭제된 콘텐츠는 즉시 일반 사용자에게 보이지 않게 처리됩니다. 다만 리믹스가 이미 생성된
            밈플릿은 삭제가 제한될 수 있습니다.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-foreground">쿠키</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Memeplate는 로그인 상태 유지, 보안 검증, 웹사이트 UI 환경 설정과 같은 기능 제공을 위해
            소수의 자사 쿠키를 사용합니다. 
            이러한 쿠키는 브라우저 설정에서 언제든지 삭제할 수 있으며, 시크릿 모드 또는 개인 정보 보호 모드를
            사용하면 쿠키 저장이 제한될 수 있습니다. 이 경우 로그인 유지, 자동 세션 갱신 등 일부 기능이 정상
            동작하지 않을 수 있습니다. 또한 Google 로그인 등 제3자 서비스 이용 과정에서 해당 서비스가 별도의
            쿠키를 사용할 수 있으며, 자세한 내용은 각 서비스의 정책 페이지에서 확인할 수 있습니다.
          </p>
        </section>
      </PageContainer>
      <MainFooter />
    </div>
  );
};

export default PrivacyPage;
