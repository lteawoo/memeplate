import React from 'react';
import { Layout } from 'antd';

interface EditorLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

const EditorLayout: React.FC<EditorLayoutProps> = ({ sidebar, children }) => {
  return (
    <Layout
      className="flex-1 min-h-0 flex flex-col md:flex-row bg-slate-100 md:overflow-hidden"
      style={{ backgroundColor: 'var(--app-surface)' }}
    >
      {/* 
         Desktop: Sidebar is at the left.
         Mobile: Stacked vertically.
      */}
      <div className="flex-1 min-h-0 min-w-0 relative flex flex-col md:flex-row">
        {sidebar}
        {children}
      </div>
    </Layout>
  );
};

export default EditorLayout;
