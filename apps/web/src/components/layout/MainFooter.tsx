import React from 'react';
import { Link } from 'react-router-dom';

const MainFooter: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t border-border/80 bg-app-surface">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-6 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <Link to="/about" className="transition-colors hover:text-foreground">
            About
          </Link>
          <Link to="/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
        </div>
        <span className="text-xs text-muted-foreground">© {year} Memeplate</span>
      </div>
    </footer>
  );
};

export default MainFooter;
