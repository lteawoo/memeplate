import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

const PageContainer: React.FC<PageContainerProps> = ({ children, className }) => {
  const classes = ['mx-auto w-full max-w-6xl px-6', className].filter(Boolean).join(' ');
  return <main className={classes}>{children}</main>;
};

export default PageContainer;
