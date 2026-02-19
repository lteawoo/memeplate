import React from 'react';

interface EditorLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

const EditorLayout: React.FC<EditorLayoutProps> = ({ sidebar, children }) => {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-app-surface md:flex-row md:overflow-hidden">
      {/* 
         Desktop: Sidebar is at the left.
         Mobile: Stacked vertically.
      */}
      <div className="flex-1 min-h-0 min-w-0 relative flex flex-col md:flex-row">
        {sidebar}
        {children}
      </div>
    </div>
  );
};

export default EditorLayout;
