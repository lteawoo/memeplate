import React from 'react';
import { Layout, Menu } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import MainHeader from './MainHeader';

const { Content, Sider } = Layout;

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
    <Layout className="min-h-screen bg-white">
      <MainHeader />
      <Layout className="w-full bg-white">
        <Sider
          width={220}
          className="hidden md:block border-r border-slate-200 bg-white"
          style={{ background: '#fff' }}
        >
          <div className="px-4 py-5 text-xs font-bold uppercase tracking-wider text-slate-400">My</div>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            className="border-r-0"
          />
        </Sider>
        <Layout className="bg-white">
          <Content className="py-8">
            <div className="mb-6 flex items-end justify-between gap-3 px-6 md:px-8">
              <div>
                <h1 className="mb-1 text-3xl font-bold text-slate-900">{title}</h1>
                {description ? <p className="m-0 text-sm text-slate-500">{description}</p> : null}
              </div>
              {action}
            </div>
            <div className="px-6 md:px-8">
              {children}
            </div>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default MySectionLayout;
