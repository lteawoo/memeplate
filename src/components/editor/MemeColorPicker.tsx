import React from 'react';
import { ColorPicker, Typography } from 'antd';

const { Text } = Typography;

interface MemeColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label: string;
  height?: string;
  compact?: boolean;
}

const MemeColorPicker: React.FC<MemeColorPickerProps> = ({ 
  value, 
  onChange, 
  label, 
  height = "h-12",
  compact = false
}) => {
  if (compact) {
    return (
      <div className="shrink-0 flex items-center">
        <input 
            type="color" 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-8 rounded-lg border-none p-0 cursor-pointer bg-transparent overflow-hidden shadow-sm"
        />
      </div>
    );
  }

  return (
  <div>
    <div className="flex justify-between items-center mb-4">
        <Text type="secondary" className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</Text>
    </div>
    <ColorPicker 
        value={value} 
        onChange={(c) => onChange(c.toHexString())} 
        showText
        size="large"
        variant="borderless"
        className={`w-full ${height} flex items-center justify-center gap-4 p-0`}
    />
  </div>
  );
};

export default MemeColorPicker;
