import React from 'react';
import { Tooltip } from 'antd';
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
  <Tooltip title={label} placement="right">
      <button
          onClick={disabled ? undefined : onClick}
          disabled={disabled}
          className={`
              w-full md:aspect-square flex flex-col items-center justify-center gap-1 md:gap-2
              transition-all duration-300 rounded-xl md:rounded-2xl py-2 md:py-0
              ${disabled 
                  ? 'text-slate-300 cursor-not-allowed opacity-50' 
                  : isActive 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                      : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}
          `}
      >
          <Icon path={icon} size={1} className="md:w-7 md:h-7" />
          <span className={`text-[10px] md:text-[11px] font-bold ${isActive ? 'text-white' : ''}`}>{label}</span>
      </button>
  </Tooltip>
);

const MemeToolbar: React.FC<MemeToolbarProps> = ({ activeTool, setActiveTool, hasBackground, editMode, setEditMode }) => {
  return (
    <div className="w-full md:w-24 h-24 md:h-full border-t md:border-t-0 md:border-r border-slate-100 bg-white md:bg-slate-50/50 flex flex-row md:flex-col items-center justify-around md:justify-start py-2 md:py-4 gap-1 md:gap-4 px-2 md:shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.05)] shrink-0 z-20">
      {/* Mode Switcher Tabs */}
      <div className="flex flex-row md:flex-col w-auto md:w-full gap-1 mb-0 md:mb-2 bg-slate-200/50 p-1 rounded-xl">
        <button 
          onClick={() => setEditMode('base')}
          className={`
            px-3 md:px-0 md:w-full py-2 md:py-3 rounded-lg flex flex-col items-center justify-center transition-all
            ${editMode === 'base' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:bg-white/50'}
          `}
        >
          <span className="text-[10px] font-black uppercase tracking-tighter">Base</span>
        </button>
        <button 
          onClick={() => setEditMode('template')}
          className={`
            px-3 md:px-0 md:w-full py-2 md:py-3 rounded-lg flex flex-col items-center justify-center transition-all
            ${editMode === 'template' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-400 hover:bg-white/50'}
          `}
        >
          <span className="text-[10px] font-black uppercase tracking-tighter">Meme</span>
        </button>
      </div>

      <div className="w-8 h-px bg-slate-200 mx-auto hidden md:block my-2"></div>

      <div className="flex flex-row md:flex-col items-center gap-1 md:gap-4">
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
        
        <div className="w-8 h-px bg-slate-200 mx-auto hidden md:block my-2"></div>

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
