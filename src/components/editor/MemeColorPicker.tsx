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
}

const MemeColorPicker: React.FC<MemeColorPickerProps> = ({ 
  value, 
  onChange, 
  label, 
  activateEyedropper,
  height = "h-12" 
}) => (
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

export default MemeColorPicker;
