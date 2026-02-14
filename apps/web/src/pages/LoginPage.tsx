import React from 'react';
import { Button, Layout, Typography } from 'antd';
import Icon from '@mdi/react';
import { mdiGoogle } from '@mdi/js';

const { Content } = Layout;
const { Title } = Typography;

const LoginPage: React.FC = () => {
  const handleGoogleLogin = () => {
    window.location.href = '/api/v1/auth/google/start';
  };

  return (
    <Layout className="h-screen bg-white">
      <Content className="flex h-full items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <Title level={1} className="!mb-8 !text-5xl !font-black tracking-tighter md:!text-6xl">
            Memeplate
          </Title>
          <Button
            type="primary"
            size="large"
            block
            icon={<Icon path={mdiGoogle} size={0.9} />}
            onClick={handleGoogleLogin}
            className="h-14 rounded-2xl text-base font-bold"
          >
            구글 로그인
          </Button>
        </div>
      </Content>
    </Layout>
  );
};

export default LoginPage;
