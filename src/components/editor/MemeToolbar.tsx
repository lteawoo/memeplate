import React from 'react';

import Icon from '@mdi/react';
import { 
  mdiImage, 
  mdiFormatColorText, 
  mdiShape, 
  mdiBrush,
  mdiShareVariant,
  mdiLayers
} from '@mdi/js';

export type ToolType = 'background' | 'text' | 'shapes' | 'brush' | 'layers' | 'share' | null;

interface MemeToolbarProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  hasBackground: boolean;
  editMode: 'base' | 'template';
  setEditMode: (mode: 'base' | 'template') => void;
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
      w-20 md:w-full py-4 md:py-4 flex flex-col items-center justify-center gap-2
      transition-all duration-300 rounded-xl relative
      border-none outline-none cursor-pointer active:scale-95
      ${disabled 
          ? 'bg-transparent text-slate-300 cursor-not-allowed opacity-50' 
          : isActive 
              ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
              : 'bg-transparent text-slate-500 hover:bg-white/40 hover:text-slate-700'}
    `}
  >
    <Icon 
      path={icon} 
      size={1.1} 
      className={`transition-all duration-300 ${isActive ? 'scale-110' : 'opacity-70'}`} 
    />
    <span className={`
      text-[10px] font-black uppercase tracking-tighter transition-colors duration-300
      ${isActive ? 'text-blue-600' : 'text-slate-500'}
    `}>
      {label}
    </span>
  </button>
);

const MemeToolbar: React.FC<MemeToolbarProps> = ({ activeTool, setActiveTool, hasBackground, editMode, setEditMode }) => {
  return (
    <div className="w-full md:w-24 h-24 md:h-full border-t md:border-t-0 md:border-r border-slate-100 bg-white md:bg-slate-50/10 flex flex-row md:flex-col items-center justify-start py-4 md:py-6 gap-4 md:gap-4 px-2 md:px-4 shrink-0 z-20">
      {/* Mode Switcher Tabs */}
      <div className="flex flex-row md:flex-col w-auto md:w-full gap-2 bg-slate-200/40 p-2 rounded-2xl">
        <button 
          type="button"
          onClick={() => setEditMode('base')}
          className={`
            px-6 md:px-0 md:w-full py-2 md:py-4 rounded-xl flex flex-col items-center justify-center transition-all
            border-none outline-none cursor-pointer active:scale-95
            ${editMode === 'base' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'bg-transparent text-slate-500 hover:bg-white/40'}
          `}
        >
          <span className="text-[11px] font-black uppercase tracking-tighter">Base</span>
        </button>
        <button 
          type="button"
          onClick={() => setEditMode('template')}
          className={`
            px-6 md:px-0 md:w-full py-2 md:py-4 rounded-xl flex flex-col items-center justify-center transition-all
            border-none outline-none cursor-pointer active:scale-95
            ${editMode === 'template' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'bg-transparent text-slate-500 hover:bg-white/40'}
          `}
        >
          <span className="text-[11px] font-black uppercase tracking-tighter">Meme</span>
        </button>
      </div>

      <div className="flex flex-row md:flex-col w-auto md:w-full gap-2 bg-slate-200/40 p-2 rounded-2xl">
        {editMode === 'base' ? (
          <>
            <SidebarItem 
              icon={mdiImage} 
              label="이미지" 
              isActive={activeTool === 'background'} 
              onClick={() => setActiveTool('background')} 
            />
            <SidebarItem 
              icon={mdiShape} 
              label="도형" 
              isActive={activeTool === 'shapes'} 
              onClick={() => setActiveTool('shapes')} 
              disabled={!hasBackground} 
            />
            <SidebarItem 
              icon={mdiBrush} 
              label="브러쉬" 
              isActive={activeTool === 'brush'} 
              onClick={() => setActiveTool('brush')} 
              disabled={!hasBackground} 
            />
          </>
        ) : (
          <>
            <SidebarItem 
              icon={mdiFormatColorText} 
              label="텍스트" 
              isActive={activeTool === 'text'} 
              onClick={() => setActiveTool('text')} 
              disabled={!hasBackground} 
            />
            <SidebarItem 
              icon={mdiShareVariant} 
              label="공유" 
              isActive={activeTool === 'share'} 
              onClick={() => setActiveTool('share')} 
              disabled={!hasBackground} 
            />
          </>
        )}
        
        <SidebarItem 
          icon={mdiLayers} 
          label="레이어" 
          isActive={activeTool === 'layers'} 
          onClick={() => setActiveTool('layers')} 
          disabled={!hasBackground} 
        />
      </div>
    </div>
  );
};

export default MemeToolbar;
