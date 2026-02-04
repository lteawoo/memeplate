import React from 'react';
import { Layout } from 'antd';

interface EditorLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

const EditorLayout: React.FC<EditorLayoutProps> = ({ sidebar, children }) => {
  return (
    <Layout className="flex-1 overflow-hidden">
      {sidebar}
      {children}
    </Layout>
  );
};

export default EditorLayout;
