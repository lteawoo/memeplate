import React from 'react';
import { Layout } from 'antd';

interface EditorLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

const EditorLayout: React.FC<EditorLayoutProps> = ({ sidebar, children }) => {
  return (
    <Layout className="flex-1 flex flex-col md:flex-row bg-white overflow-y-auto md:overflow-hidden">
      {/* 
         Desktop: Sidebar is at the left.
         Mobile: Stacked vertically.
      */}
      <div className="flex-1 relative flex flex-col md:flex-row">
        {sidebar}
        {children}
      </div>
    </Layout>
  );
};

export default EditorLayout;