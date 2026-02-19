import React from 'react';

import Icon from '@mdi/react';
import { 
  mdiImage, 
  mdiPencil,
  mdiShareVariant
} from '@mdi/js';

export type ToolType = 'background' | 'edit' | 'text' | 'eraser' | 'share' | null;

interface MemeToolbarProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  hasBackground: boolean;
}

interface SidebarItemProps {
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, isActive, onClick, disabled }) => (
  <button
    type="button"
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    className={`
      flex-1 py-2 md:py-2 flex flex-col items-center justify-center gap-1 md:gap-1
      transition-all duration-300 rounded-xl relative
      border-none outline-none cursor-pointer active:scale-95 shrink-0
      ${disabled 
          ? 'bg-transparent text-slate-500 cursor-not-allowed opacity-70 ring-1 ring-transparent' 
          : isActive 
              ? 'bg-slate-50 text-slate-900 shadow-sm ring-1 ring-blue-400/40' 
              : 'bg-transparent text-slate-600 ring-1 ring-transparent hover:bg-slate-50 hover:text-slate-800 hover:ring-slate-200/80'}
    `}
  >
    <Icon 
      path={icon} 
      size={window.innerWidth < 768 ? 0.85 : 1} 
      className={`transition-all duration-300 ${isActive ? 'scale-110' : 'opacity-100'}`} 
    />
    <span className={`
      text-[9px] md:text-[10px] font-black uppercase tracking-tighter transition-colors duration-300
      ${isActive ? 'text-slate-900' : 'text-slate-600'}
    `}>
      {label}
    </span>
  </button>
);

const MemeToolbar: React.FC<MemeToolbarProps> = ({ 
  activeTool, 
  setActiveTool,
  hasBackground
}) => {
  return (
    <div className="w-full h-20 border-b border-slate-200 bg-slate-50 flex flex-row items-center justify-center py-1 gap-1 px-3 shrink-0 z-20">
      {/* Main Tools Group - Simplified to 3 core tools */}
      <div className="flex flex-row w-full gap-1 bg-slate-100/80 border border-slate-200 p-1 rounded-xl shrink-0">
        <SidebarItem 
          icon={mdiImage} 
          label="이미지" 
          isActive={activeTool === 'background'} 
          onClick={() => setActiveTool('background')} 
        />
        <SidebarItem 
          icon={mdiPencil} 
          label="편집" 
          isActive={activeTool === 'edit'} 
          onClick={() => setActiveTool('edit')} 
          disabled={!hasBackground}
        />
        <SidebarItem 
          icon={mdiShareVariant} 
          label="공유" 
          isActive={activeTool === 'share'} 
          onClick={() => setActiveTool('share')} 
          disabled={!hasBackground}
        />
      </div>
    </div>
  );
};

export default MemeToolbar;
