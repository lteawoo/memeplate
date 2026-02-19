import React from 'react';
import { Input } from '@/components/ui/input';

interface MemeColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label: string;
  height?: string;
  compact?: boolean;
}

const isValidHex = (value: string) => /^#([0-9A-Fa-f]{3}){1,2}$/.test(value.trim());

const MemeColorPicker: React.FC<MemeColorPickerProps> = ({
  value,
  onChange,
  height = 'h-12',
  compact = false,
  label,
}) => {
  const [textValue, setTextValue] = React.useState(value);

  React.useEffect(() => {
    setTextValue(value);
  }, [value]);

  if (compact) {
    return (
      <div className="flex shrink-0 items-center">
        <input
          type="color"
          value={isValidHex(value) ? value : '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer overflow-hidden rounded-lg border-none bg-transparent p-0 shadow-sm"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className={`flex items-center gap-3 rounded-xl border border-border bg-muted px-3 ${height}`}>
        <input
          type="color"
          value={isValidHex(value) ? value : '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer overflow-hidden rounded-lg border-none bg-transparent p-0 shadow-sm"
        />
        <Input
          value={textValue}
          onChange={(e) => {
            const next = e.target.value;
            setTextValue(next);
            if (isValidHex(next)) {
              onChange(next);
            }
          }}
          onBlur={() => {
            if (!isValidHex(textValue)) {
              setTextValue(value);
            }
          }}
          className="h-8 border-border bg-card text-xs font-semibold text-foreground"
          placeholder="#FFFFFF"
          maxLength={7}
        />
      </div>
    </div>
  );
};

export default MemeColorPicker;
