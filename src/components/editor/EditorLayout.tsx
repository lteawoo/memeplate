import React from 'react';
import { Layout } from 'antd';

interface EditorLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

const EditorLayout: React.FC<EditorLayoutProps> = ({ sidebar, children }) => {
  return (
    <Layout className="flex-1 overflow-hidden flex flex-col md:flex-row bg-white">
      {/* 
         Mobile: Sidebar(Toolbar) is at the bottom, Panel is above it. 
         Desktop: Sidebar is at the left.
         We will handle the order via CSS/Flex
      */}
      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden">
        {children}
        {sidebar}
      </div>
    </Layout>
  );
};

export default EditorLayout;