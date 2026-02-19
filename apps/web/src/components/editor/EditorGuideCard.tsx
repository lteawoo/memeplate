import React from 'react';
import Icon from '@mdi/react';

const GUIDE_CARD_BASE_CLASSNAME = 'rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 text-center';
const GUIDE_ICON_CLASSNAME = 'mx-auto flex items-center justify-center text-blue-500';
const GUIDE_TEXT_CLASSNAME = 'text-sm font-semibold text-slate-500';

interface EditorGuideCardProps {
  iconPath: string;
  description: string;
  className?: string;
  iconSize?: number;
}

const mergeClassName = (...values: Array<string | undefined>) => values.filter(Boolean).join(' ');

const EditorGuideCard: React.FC<EditorGuideCardProps> = ({
  iconPath,
  description,
  className,
  iconSize = 1.9
}) => {
  return (
    <div className={mergeClassName(GUIDE_CARD_BASE_CLASSNAME, className)}>
      <div className={GUIDE_ICON_CLASSNAME}>
        <Icon path={iconPath} size={iconSize} />
      </div>
      <p className={mergeClassName('m-0 mt-3', GUIDE_TEXT_CLASSNAME)}>{description}</p>
    </div>
  );
};

export default EditorGuideCard;
