import React, { useState } from 'react';
import { Layout, Typography, Button, Drawer } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import Icon from '@mdi/react';
import { mdiMenu } from '@mdi/js';

const { Header } = Layout;
const { Title } = Typography;

const MainHeader: React.FC = () => {
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const navLinks = [
    { to: '/', label: '홈' },
    { to: '/create', label: 'Memeplate 생성' },
  ];

  return (
    <Header 
      className="flex items-center justify-between px-4 md:px-6 border-b border-slate-200 z-30 relative"
      style={{ height: 64, background: '#ffffff', lineHeight: '64px', padding: '0 24px' }}
    >
      <div className="flex items-center gap-10">
        <Link to="/" className="flex items-center gap-4 no-underline">
          <Title level={4} style={{ margin: 0, fontWeight: 900, letterSpacing: '-0.8px', color: '#0f172a' }}>
            Memeplate
          </Title>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map(link => (
            <Link 
              key={link.to}
              to={link.to} 
              className={`text-sm font-bold no-underline transition-colors ${location.pathname === link.to ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      
      <div className="flex items-center gap-4 md:hidden">
        {/* Mobile Hamburger Menu */}
        <Button 
          type="text" 
          className="flex items-center justify-center p-0" 
          icon={<Icon path={mdiMenu} size={1.2} />} 
          onClick={() => setIsDrawerOpen(true)}
        />
      </div>

      <Drawer
        title="메뉴"
        placement="right"
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        styles={{ wrapper: { width: 280 } }}
      >
        <div className="flex flex-col gap-6 pt-8 px-2">
          {navLinks.map(link => (
            <Link 
              key={link.to}
              to={link.to} 
              onClick={() => setIsDrawerOpen(false)}
              className={`text-xl font-black no-underline transition-colors ${location.pathname === link.to ? 'text-blue-600' : 'text-slate-800 hover:text-blue-500'}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </Drawer>
    </Header>
  );
};

export default MainHeader;