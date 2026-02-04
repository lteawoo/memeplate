import React from 'react';
import { Tooltip } from 'antd';
import Icon from '@mdi/react';
import { 
  mdiImage, 
  mdiFormatColorText, 
  mdiShape, 
  mdiBrush,
  mdiShareVariant
} from '@mdi/js';

export type ToolType = 'background' | 'text' | 'shapes' | 'brush' | 'share' | null;

interface MemeToolbarProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
}

interface SidebarItemProps {
  id: ToolType;
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, isActive, onClick }) => (
  <Tooltip title={label} placement="right">
      <button
          onClick={onClick}
          className={`
              w-full md:aspect-square flex flex-col items-center justify-center gap-1 md:gap-2
              transition-all duration-300 rounded-xl md:rounded-2xl py-2 md:py-0
              ${isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}
          `}
      >
          <Icon path={icon} size={1} className="md:w-7 md:h-7" />
          <span className={`text-[10px] md:text-[11px] font-bold ${isActive ? 'text-white' : ''}`}>{label}</span>
      </button>
  </Tooltip>
);

const MemeToolbar: React.FC<MemeToolbarProps> = ({ activeTool, setActiveTool }) => {
  return (
    <div className="w-full md:w-24 h-20 md:h-full border-t md:border-t-0 md:border-r border-slate-100 bg-white md:bg-slate-50/50 flex flex-row md:flex-col items-center justify-around md:justify-start py-2 md:py-8 gap-1 md:gap-5 px-3 md:shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.05)] shrink-0 z-20">
      <SidebarItem id="background" icon={mdiImage} label="배경" isActive={activeTool === 'background'} onClick={() => setActiveTool('background')} />
      <SidebarItem id="text" icon={mdiFormatColorText} label="텍스트" isActive={activeTool === 'text'} onClick={() => setActiveTool('text')} />
      <SidebarItem id="shapes" icon={mdiShape} label="도형" isActive={activeTool === 'shapes'} onClick={() => setActiveTool('shapes')} />
      <SidebarItem id="brush" icon={mdiBrush} label="브러쉬" isActive={activeTool === 'brush'} onClick={() => setActiveTool('brush')} />
      <SidebarItem id="share" icon={mdiShareVariant} label="공유" isActive={activeTool === 'share'} onClick={() => setActiveTool('share')} />
    </div>
  );
};

export default MemeToolbar;
