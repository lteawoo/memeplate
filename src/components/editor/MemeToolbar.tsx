import React from 'react';

import Icon from '@mdi/react';
import { 
  mdiImage, 
  mdiFormatColorText, 
  mdiEraser,
  mdiShareVariant,
  mdiLayers
} from '@mdi/js';

export type ToolType = 'background' | 'text' | 'eraser' | 'layers' | 'share' | null;

interface MemeToolbarProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  showLayers: boolean;
  setShowLayers: (show: boolean) => void;
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
      w-16 md:w-full py-3 md:py-4 flex flex-col items-center justify-center gap-1 md:gap-2
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
  setActiveTool, 
  showLayers,
  setShowLayers,
  hasBackground
}) => {
  return (
    <div className="w-full md:w-28 h-20 md:h-full border-t md:border-t-0 md:border-r border-slate-100 bg-white md:bg-slate-50/10 flex flex-row md:flex-col items-center justify-start py-2 md:py-6 gap-2 md:gap-6 px-4 md:px-6 shrink-0 z-20 overflow-x-auto no-scrollbar">
      {/* Main Tools Group */}
      <div className="flex flex-row md:flex-col w-auto md:w-full gap-1 md:gap-2 bg-slate-200/40 p-1.5 md:p-2 rounded-2xl shrink-0">
        <SidebarItem 
          icon={mdiImage} 
          label="이미지" 
          isActive={activeTool === 'background'} 
          onClick={() => setActiveTool('background')} 
        />
        <SidebarItem 
          icon={mdiFormatColorText} 
          label="텍스트" 
          isActive={activeTool === 'text'} 
          onClick={() => setActiveTool('text')} 
          disabled={!hasBackground} 
        />
        <SidebarItem 
          icon={mdiEraser} 
          label="지우개" 
          isActive={activeTool === 'eraser'} 
          onClick={() => setActiveTool('eraser')} 
          disabled={!hasBackground} 
        />
        <SidebarItem 
          icon={mdiLayers} 
          label="레이어" 
          isActive={showLayers} 
          onClick={() => setShowLayers(!showLayers)} 
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
