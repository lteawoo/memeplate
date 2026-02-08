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
         Desktop: Sidebar is at the left.
         Mobile: Handled by fixed bottom UI in MemeEditor.
      */}
      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden">
        {sidebar}
        {children}
      </div>
    </Layout>
  );
};

export default EditorLayout;