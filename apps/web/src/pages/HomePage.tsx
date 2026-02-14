import React from 'react';
import { Button, Typography, Layout } from 'antd';
import { useNavigate } from 'react-router-dom';
import MainHeader from '../components/layout/MainHeader';
import Icon from '@mdi/react';
import { mdiPlus } from '@mdi/js';

const { Content } = Layout;
const { Title } = Typography;

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout className="h-screen bg-white">
      <MainHeader />
      <Content className="flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-2xl">
          <Title level={1} className="!text-6xl !font-black tracking-tighter mb-6">
            Hello World!
          </Title>
          <Title level={3} className="text-slate-500 mb-8 font-medium">
            쉽고 빠르게 나만의 Memeplate를 만들어보세요.
          </Title>
          
          <Button 
            type="primary" 
            size="large" 
            icon={<Icon path={mdiPlus} size={1} />}
            onClick={() => navigate('/create')}
            className="h-16 px-10 text-xl font-bold rounded-2xl shadow-xl shadow-blue-500/20 flex items-center gap-3 mx-auto"
          >
            Memeplate 생성
          </Button>
        </div>
      </Content>
    </Layout>
  );
};

export default HomePage;
