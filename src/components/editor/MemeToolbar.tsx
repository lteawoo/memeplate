import React from 'react';
import { Tooltip } from 'antd';
import Icon from '@mdi/react';
import { 
  mdiImage, 
  mdiFormatColorText, 
  mdiShape, 
  mdiBrush 
} from '@mdi/js';

export type ToolType = 'background' | 'text' | 'shapes' | 'brush';

interface MemeToolbarProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
}

const MemeToolbar: React.FC<MemeToolbarProps> = ({ activeTool, setActiveTool }) => {
  const SidebarItem = ({ id, icon, label }: { id: ToolType, icon: string, label: string }) => (
    <Tooltip title={label} placement="right">
        <button
            onClick={() => setActiveTool(id)}
            className={`
                w-full aspect-square flex flex-col items-center justify-center gap-2
                transition-all duration-300 rounded-2xl
                ${activeTool === id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}
            `}
        >
            <Icon path={icon} size={1.2} />
            <span className={`text-[11px] font-bold ${activeTool === id ? 'text-white' : ''}`}>{label}</span>
        </button>
    </Tooltip>
  );

  return (
    <div className="w-24 h-full border-r border-slate-100 bg-slate-50/50 flex flex-col items-center py-8 gap-5 px-3 shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.05)] shrink-0">
      <SidebarItem id="background" icon={mdiImage} label="배경" />
      <SidebarItem id="text" icon={mdiFormatColorText} label="텍스트" />
      <SidebarItem id="shapes" icon={mdiShape} label="도형도구" />
      <SidebarItem id="brush" icon={mdiBrush} label="브러쉬" />
    </div>
  );
};

export default MemeToolbar;
