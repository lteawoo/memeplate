import React from 'react';
import MainHeader from '../components/layout/MainHeader';
import MainFooter from '../components/layout/MainFooter';
import PageContainer from '../components/layout/PageContainer';

const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-app-surface">
      <MainHeader />
      <PageContainer className="py-10">
        <section className="mx-auto max-w-3xl rounded-2xl bg-card p-8">
          <h1 className="text-3xl font-bold text-foreground">Terms</h1>

          <h2 className="mt-6 text-lg font-semibold text-foreground">1. 목적 및 적용</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            이 약관은 Memeplate(이하 "서비스")가 제공하는 밈플릿 생성, 리믹스, 공유 기능의 이용과 관련하여
            운영자와 이용자 간의 권리, 의무 및 책임사항을 정함을 목적으로 합니다.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-foreground">2. 계정 및 인증</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            이용자는 서비스가 제공하는 소셜 로그인 또는 외부 인증 제공자(이하 "OAuth 제공자")를 통해
            계정을 생성하고 로그인할 수 있습니다. OAuth 제공자의 종류는 서비스 정책에 따라 추가 또는 변경될 수 있습니다.
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            이용자는 본인 계정의 접근 권한을 직접 관리할 책임이 있으며, OAuth 제공자 계정 접근 권한 상실 또는
            연동 해제 시 서비스 이용이 제한될 수 있습니다.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-foreground">3. 콘텐츠 공개 및 공유</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            이용자가 콘텐츠를 공개 상태로 설정한 경우, 공유 링크(URL)를 아는 사람은 누구나 해당 콘텐츠를
            열람할 수 있습니다. 공개 콘텐츠는 서비스 내 목록, 추천 영역 또는 커뮤니티 영역에 노출될 수 있습니다.
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            비공개 콘텐츠는 공개 목록 및 추천 영역에 노출되지 않으며, 외부 링크 접근이 제한됩니다.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-foreground">4. 리믹스 정책 및 삭제 제한</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            이용자는 공개된 밈플릿을 기반으로 리믹스를 생성할 수 있습니다. 리믹스가 하나 이상 생성된 밈플릿은
            서비스 무결성 유지를 위해 비공개 전환 또는 삭제가 제한될 수 있습니다.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-foreground">5. 이용자 콘텐츠 권리</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            이용자가 업로드하거나 작성한 콘텐츠의 권리는 원칙적으로 이용자에게 있습니다. 다만 운영자는 서비스 제공,
            저장, 표시, 썸네일 생성, 전송, 운영 개선을 위해 필요한 범위에서 해당 콘텐츠를 이용할 수 있습니다.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-foreground">6. 금지 행위</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            이용자는 관련 법령 위반, 타인의 권리 침해, 불법·유해 콘텐츠 게시, 서비스 장애 유발 행위,
            비정상적 트래픽 유발 및 기타 부정 사용을 해서는 안 됩니다.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-foreground">7. 서비스 제한 및 변경</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            운영자는 운영상 필요에 따라 서비스의 전부 또는 일부를 변경, 중단할 수 있으며, 이용약관의 내용도
            법령 및 정책에 따라 개정할 수 있습니다. 중요한 변경이 있는 경우 사전에 서비스 내 공지로 안내합니다.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-foreground">8. 책임의 제한</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            운영자는 천재지변, 외부 서비스 장애, 이용자 귀책 사유로 인한 손해에 대해 관련 법령이 허용하는 범위에서
            책임을 제한할 수 있습니다.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-foreground">9. 문의</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            이용약관 관련 문의는 서비스 내 문의 채널 또는 운영자 연락처를 통해 접수할 수 있습니다.
          </p>
        </section>
      </PageContainer>
      <MainFooter />
    </div>
  );
};

export default TermsPage;
