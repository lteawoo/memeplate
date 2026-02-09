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
      flex-1 py-3 md:py-4 flex flex-col items-center justify-center gap-1 md:gap-2
      transition-all duration-300 rounded-xl relative
      border-none outline-none cursor-pointer active:scale-95 shrink-0
      ${disabled 
          ? 'bg-transparent text-slate-300 cursor-not-allowed opacity-50' 
          : isActive 
              ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
              : 'bg-transparent text-slate-500 hover:bg-white/40 hover:text-slate-700'}
    `}
  >
    <Icon 
      path={icon} 
      size={window.innerWidth < 768 ? 0.9 : 1.1} 
      className={`transition-all duration-300 ${isActive ? 'scale-110' : 'opacity-70'}`} 
    />
    <span className={`
      text-[9px] md:text-[10px] font-black uppercase tracking-tighter transition-colors duration-300
      ${isActive ? 'text-blue-600' : 'text-slate-500'}
    `}>
      {label}
    </span>
  </button>
);

const MemeToolbar: React.FC<MemeToolbarProps> = ({ 
  activeTool, 
  setActiveTool
}) => {
  return (
    <div className="w-full h-24 border-b border-slate-100 bg-white flex flex-row items-center justify-center py-2 gap-2 px-4 shrink-0 z-20">
      {/* Main Tools Group - Simplified to 3 core tools */}
      <div className="flex flex-row w-full gap-1 bg-slate-200/40 p-1.5 rounded-2xl shrink-0">
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
        />
        <SidebarItem 
          icon={mdiShareVariant} 
          label="공유" 
          isActive={activeTool === 'share'} 
          onClick={() => setActiveTool('share')} 
        />
      </div>
    </div>
  );
};

export default MemeToolbar;
