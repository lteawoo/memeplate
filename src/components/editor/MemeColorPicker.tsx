import React from 'react';
import { ColorPicker, Typography, Tooltip, Button } from 'antd';
import Icon from '@mdi/react';
import { mdiEyedropper } from '@mdi/js';

const { Text } = Typography;

interface MemeColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label: string;
  activateEyedropper: () => void;
  height?: string;
  compact?: boolean;
}

const MemeColorPicker: React.FC<MemeColorPickerProps> = ({ 
  value, 
  onChange, 
  label, 
  activateEyedropper,
  height = "h-12",
  compact = false
}) => {
  if (compact) {
    return (
      <div className="flex flex-col gap-1 shrink-0">
        <Text type="secondary" className="text-[10px] font-black uppercase tracking-tighter text-slate-400 leading-none">{label}</Text>
        <div className="flex items-center gap-2">
            <div className="relative shrink-0 flex items-center">
                <input 
                    type="color" 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)}
                    className="w-10 h-8 rounded-lg border-none p-0 cursor-pointer bg-transparent overflow-hidden shadow-sm"
                />
            </div>
            <Button 
                size="small"
                icon={<Icon path={mdiEyedropper} size={0.5} />} 
                onClick={activateEyedropper}
                className="flex items-center justify-center rounded-lg border-slate-100 text-slate-500 w-8 h-8"
            />
        </div>
      </div>
    );
  }

  return (
  <div>
    <div className="flex justify-between items-center mb-4">
        <Text type="secondary" className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</Text>
        <Tooltip title="스포이드 (색상 추출)">
            <Button 
                type="text" 
                size="small"
                icon={<Icon path={mdiEyedropper} size={0.7} />} 
                onClick={activateEyedropper}
            />
        </Tooltip>
    </div>
    <ColorPicker 
        value={value} 
        onChange={(c) => onChange(c.toHexString())} 
        showText
        size="large"
        className={`w-full ${height} rounded-xl border-slate-200 flex items-center justify-center gap-4`}
    />
  </div>
  );
};

export default MemeColorPicker;
