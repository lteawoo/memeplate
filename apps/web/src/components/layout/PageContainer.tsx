import React from 'react';
import { Layout } from 'antd';

const { Content } = Layout;

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

const PageContainer: React.FC<PageContainerProps> = ({ children, className }) => {
  const classes = ['mx-auto w-full max-w-6xl px-6', className].filter(Boolean).join(' ');
  return <Content className={classes}>{children}</Content>;
};

export default PageContainer;
