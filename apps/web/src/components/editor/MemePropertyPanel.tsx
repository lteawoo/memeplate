import React from 'react';
import Icon from '@mdi/react';
import {
  mdiLinkVariant,
  mdiDelete,
  mdiDownload,
  mdiContentCopy,
  mdiContentSave,
  mdiShape,
  mdiSquare,
  mdiCircle,
  mdiFormatColorText,
  mdiChevronUp,
  mdiChevronDown,
  mdiTune,
  mdiFormatAlignLeft,
  mdiFormatAlignCenter,
  mdiFormatAlignRight,
  mdiFormatBold,
  mdiFormatItalic,
  mdiFormatAlignTop,
  mdiFormatVerticalAlignCenter,
  mdiFormatAlignBottom,
  mdiOpacity,
  mdiShareVariant,
} from '@mdi/js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import type { ToolType } from './MemeToolbar';
import { Rect, Circle, Textbox, type CanvasObject } from '../../core/canvas';
import MemeColorPicker from './MemeColorPicker';
import EditorGuideCard from './EditorGuideCard';
import { cn } from '@/lib/utils';

type FormatType = 'png' | 'jpg' | 'webp' | 'pdf';

type SegmentedOption = {
  label: React.ReactNode;
  value: string;
};

interface SegmentedButtonsProps {
  value: string;
  options: SegmentedOption[];
  onChange: (value: string) => void;
  className?: string;
}

const SegmentedButtons: React.FC<SegmentedButtonsProps> = ({ value, options, onChange, className }) => {
  return (
    <div className={cn('grid w-full gap-1 rounded-xl border border-border bg-muted p-1', className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-bold transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

interface MemePropertyPanelProps {
  activeTool: ToolType | null;
  addText: () => void;
  updateProperty: (key: string, value: string | number | boolean) => void;
  activeObject: CanvasObject | null;
  deleteActiveObject: () => void;
  addShape: (type: 'rect' | 'circle') => void;
  downloadImage: (format: FormatType) => void;
  copyToClipboard: () => void;
  publishImage: (title: string, description: string) => Promise<{ id: string; shareSlug: string } | null>;
  saveTemplate: (
    title: string,
    description: string,
    visibility: 'private' | 'public',
  ) => Promise<{ id: string; title: string; description?: string; visibility: 'private' | 'public'; shareSlug: string } | null>;
  copyTemplateShareLink: () => Promise<void>;
  savedTemplate: { id: string; title: string; description?: string; visibility: 'private' | 'public'; shareSlug: string } | null;
  isTemplateSaving: boolean;
  isImagePublishing: boolean;
  canPublishRemix: boolean;
  isTemplateSaveDisabled: boolean;
  layers: CanvasObject[];
  selectLayer: (obj: CanvasObject) => void;
  changeZIndex: (direction: 'forward' | 'backward' | 'front' | 'back') => void;
}

const MemePropertyPanel: React.FC<MemePropertyPanelProps> = (props) => {
  const {
    activeTool,
    addText,
    updateProperty,
    activeObject,
    deleteActiveObject,
    addShape,
    downloadImage,
    copyToClipboard,
    publishImage,
    saveTemplate,
    copyTemplateShareLink,
    savedTemplate,
    isTemplateSaving,
    isImagePublishing,
    canPublishRemix,
    isTemplateSaveDisabled,
    layers,
    selectLayer,
    changeZIndex,
  } = props;

  const [templateTitle, setTemplateTitle] = React.useState('새 밈플릿');
  const [templateDescription, setTemplateDescription] = React.useState('');
  const [templateVisibility, setTemplateVisibility] = React.useState<'private' | 'public'>('private');
  const [remixTitle, setRemixTitle] = React.useState('새 리믹스');
  const [remixDescription, setRemixDescription] = React.useState('');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = React.useState(false);
  const [isRemixModalOpen, setIsRemixModalOpen] = React.useState(false);
  const downloadOptions: Array<{ label: string; value: FormatType }> = [
    { label: 'PNG', value: 'png' },
    { label: 'JPG', value: 'jpg' },
    { label: 'WEBP', value: 'webp' },
    { label: 'PDF', value: 'pdf' },
  ];

  const textLayerOrder = React.useMemo(() => {
    const textLayerIds = layers
      .filter((layer): layer is Textbox => layer instanceof Textbox)
      .map((layer) => layer.id);
    return new Map(textLayerIds.map((id, index) => [id, index + 1]));
  }, [layers]);

  React.useEffect(() => {
    if (!savedTemplate) return;
    setTemplateTitle(savedTemplate.title);
    setTemplateDescription(savedTemplate.description || '');
    setTemplateVisibility(savedTemplate.visibility);
  }, [savedTemplate]);

  const handleTemplatePublish = async () => {
    const published = await saveTemplate(templateTitle, templateDescription, templateVisibility);
    if (published) {
      setIsTemplateModalOpen(false);
    }
  };

  const handleRemixPublish = async () => {
    const published = await publishImage(remixTitle, remixDescription);
    if (published) {
      setIsRemixModalOpen(false);
    }
  };

  const renderPanelContent = () => {
    if (!activeTool) {
      return (
        <EditorGuideCard
          iconPath={mdiTune}
          description="도구를 선택하여 편집을 시작하세요"
          className="py-14"
        />
      );
    }

    switch (activeTool) {
      case 'edit':
        return (
          <div className="flex w-full flex-col gap-4">
            <div className="mb-2 flex items-center gap-2 rounded-2xl border border-border bg-muted/60 p-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => addText()}
                className="h-10 flex-1 rounded-xl border-border bg-muted text-xs font-bold text-foreground hover:bg-accent"
              >
                <Icon path={mdiFormatColorText} size={0.7} /> 텍스트
              </Button>
              <div className="h-4 w-px bg-border" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 flex-1 rounded-xl border-border bg-muted text-xs font-bold text-foreground hover:bg-accent"
                  >
                    <Icon path={mdiShape} size={0.7} /> 도형
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-32">
                  <DropdownMenuItem onClick={() => addShape('rect')}>
                    <Icon path={mdiSquare} size={0.8} /> 사각형
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addShape('circle')}>
                    <Icon path={mdiCircle} size={0.8} /> 원형
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-col overflow-hidden rounded-lg border border-border">
              <div className="flex items-center justify-between border-b border-border bg-muted px-3 py-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Layers ({layers.length})</span>
              </div>

              <div className="custom-scrollbar flex max-h-[65vh] flex-col overflow-y-auto">
                {[...layers].reverse().map((obj, idx) => {
                  const isSelected = activeObject?.id === obj.id;
                  const isText = obj instanceof Textbox;
                  const isRect = obj instanceof Rect;
                  const isCircle = obj instanceof Circle;
                  const textLayerNumber = textLayerOrder.get(obj.id) ?? 1;

                  return (
                    <div
                      key={obj.id || idx}
                      className={cn(
                        'group flex flex-col border-b border-border/60 p-2 transition-all last:border-b-0',
                        isSelected
                          ? 'border-l-4 border-l-primary bg-primary/10'
                          : 'border-l-4 border-l-transparent bg-muted/80 hover:bg-muted',
                      )}
                      onClick={() => selectLayer(obj)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex shrink-0 flex-col overflow-hidden rounded-md border border-border bg-muted">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              selectLayer(obj);
                              changeZIndex('forward');
                            }}
                            className="h-5 w-7 rounded-none p-0 text-muted-foreground hover:bg-accent hover:text-primary"
                          >
                            <Icon path={mdiChevronUp} size={0.58} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              selectLayer(obj);
                              changeZIndex('backward');
                            }}
                            className="h-5 w-7 rounded-none p-0 text-muted-foreground hover:bg-accent hover:text-primary"
                          >
                            <Icon path={mdiChevronDown} size={0.58} />
                          </Button>
                        </div>

                        <div
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                            isSelected ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border bg-muted text-muted-foreground',
                          )}
                        >
                          <Icon path={isText ? mdiFormatColorText : mdiShape} size={0.58} />
                        </div>

                        <span className={cn('flex-1 truncate pl-1 text-[11px] font-bold', isSelected ? 'text-primary' : 'text-muted-foreground')}>
                          {isText ? '텍스트 레이어' : isRect ? '사각형' : isCircle ? '원형' : '도형'}
                        </span>

                        <div className="flex shrink-0 items-center gap-1">
                          <MemeColorPicker
                            label=""
                            value={obj.fill as string}
                            onChange={(val) => {
                              obj.set('fill', val);
                              updateProperty('fill', val);
                              selectLayer(obj);
                            }}
                            compact
                          />
                          {isText ? (
                            <MemeColorPicker
                              label=""
                              value={(obj.stroke as string) || '#000000'}
                              onChange={(val) => {
                                obj.set('stroke', val);
                                updateProperty('stroke', val);
                                selectLayer(obj);
                              }}
                              compact
                            />
                          ) : null}

                          {isText ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    selectLayer(obj);
                                  }}
                                  className={cn(
                                    'h-8 w-8 rounded-lg p-0',
                                    isSelected
                                      ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15'
                                      : 'border-border bg-muted text-muted-foreground hover:border-border hover:bg-accent hover:text-primary',
                                  )}
                                >
                                  <Icon path={mdiTune} size={0.7} />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent align="end" className="w-72 p-2">
                                <div className="mb-2 text-xs font-bold">텍스트 상세 설정</div>
                                <div className="flex flex-col gap-5">
                                  <div className="flex flex-col gap-2">
                                    <span className="text-[11px] font-bold uppercase text-muted-foreground">스타일</span>
                                    <div className="flex gap-2">
                                      <Button
                                        type="button"
                                        variant={(obj as Textbox).fontWeight === 'bold' ? 'default' : 'outline'}
                                        onClick={() => {
                                          const next = (obj as Textbox).fontWeight === 'bold' ? 'normal' : 'bold';
                                          (obj as Textbox).set('fontWeight', next);
                                          updateProperty('fontWeight', next);
                                        }}
                                        className="flex-1"
                                      >
                                        <Icon path={mdiFormatBold} size={0.6} /> Bold
                                      </Button>
                                      <Button
                                        type="button"
                                        variant={(obj as Textbox).fontStyle === 'italic' ? 'default' : 'outline'}
                                        onClick={() => {
                                          const next = (obj as Textbox).fontStyle === 'italic' ? 'normal' : 'italic';
                                          (obj as Textbox).set('fontStyle', next);
                                          updateProperty('fontStyle', next);
                                        }}
                                        className="flex-1 italic"
                                      >
                                        <Icon path={mdiFormatItalic} size={0.6} /> Italic
                                      </Button>
                                    </div>
                                  </div>

                                  <div>
                                    <span className="mb-2 block text-[11px] font-bold uppercase text-muted-foreground">가로 정렬</span>
                                    <SegmentedButtons
                                      value={(obj as Textbox).textAlign}
                                      onChange={(val) => {
                                        (obj as Textbox).set('textAlign', val);
                                        updateProperty('textAlign', val);
                                      }}
                                      options={[
                                        { value: 'left', label: <Icon path={mdiFormatAlignLeft} size={0.65} /> },
                                        { value: 'center', label: <Icon path={mdiFormatAlignCenter} size={0.65} /> },
                                        { value: 'right', label: <Icon path={mdiFormatAlignRight} size={0.65} /> },
                                      ]}
                                      className="grid-cols-3"
                                    />
                                  </div>

                                  <div>
                                    <span className="mb-2 block text-[11px] font-bold uppercase text-muted-foreground">세로 정렬</span>
                                    <SegmentedButtons
                                      value={(obj as Textbox).verticalAlign}
                                      onChange={(val) => {
                                        (obj as Textbox).set('verticalAlign', val);
                                        updateProperty('verticalAlign', val);
                                      }}
                                      options={[
                                        { value: 'top', label: <Icon path={mdiFormatAlignTop} size={0.65} /> },
                                        { value: 'middle', label: <Icon path={mdiFormatVerticalAlignCenter} size={0.65} /> },
                                        { value: 'bottom', label: <Icon path={mdiFormatAlignBottom} size={0.65} /> },
                                      ]}
                                      className="grid-cols-3"
                                    />
                                  </div>

                                  <div>
                                    <div className="mb-1 flex items-center justify-between">
                                      <span className="text-[11px] font-bold uppercase text-muted-foreground">최대 크기</span>
                                      <Input
                                        type="number"
                                        min={8}
                                        max={300}
                                        value={String((obj as Textbox).fontSize)}
                                        onChange={(e) => {
                                          const next = Number(e.target.value);
                                          if (Number.isFinite(next)) {
                                            updateProperty('fontSize', next);
                                          }
                                        }}
                                        className="h-7 w-16 border-border px-2 text-right text-xs font-bold"
                                      />
                                    </div>
                                    <Slider
                                      min={8}
                                      max={300}
                                      value={[(obj as Textbox).fontSize]}
                                      onValueChange={(vals) => {
                                        const next = vals[0];
                                        if (typeof next === 'number') {
                                          updateProperty('fontSize', next);
                                        }
                                      }}
                                    />
                                  </div>

                                  <div>
                                    <div className="mb-1 flex items-center justify-between">
                                      <span className="text-[11px] font-bold uppercase text-muted-foreground">외곽선 강도</span>
                                      <Input
                                        type="number"
                                        min={0}
                                        max={10}
                                        step={0.1}
                                        value={String((obj as Textbox).strokeWidth)}
                                        onChange={(e) => {
                                          const next = Number(e.target.value);
                                          if (Number.isFinite(next)) {
                                            updateProperty('strokeWidth', next);
                                          }
                                        }}
                                        className="h-7 w-16 border-border px-2 text-right text-xs font-bold"
                                      />
                                    </div>
                                    <Slider
                                      min={0}
                                      max={10}
                                      step={0.1}
                                      value={[(obj as Textbox).strokeWidth]}
                                      onValueChange={(vals) => {
                                        const next = vals[0];
                                        if (typeof next === 'number') {
                                          updateProperty('strokeWidth', next);
                                        }
                                      }}
                                    />
                                  </div>

                                  <div>
                                    <div className="mb-1 flex items-center justify-between">
                                      <span className="px-0.5 text-[11px] font-bold uppercase text-muted-foreground">
                                        <Icon path={mdiOpacity} size={0.4} className="mr-1 inline" /> 불투명도
                                      </span>
                                      <span className="text-[11px] font-bold text-primary">{Math.round((obj as Textbox).opacity * 100)}%</span>
                                    </div>
                                    <Slider
                                      min={0}
                                      max={1}
                                      step={0.01}
                                      value={[(obj as Textbox).opacity]}
                                      onValueChange={(vals) => {
                                        const next = vals[0];
                                        if (typeof next === 'number') {
                                          updateProperty('opacity', next);
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : null}

                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              selectLayer(obj);
                              deleteActiveObject();
                            }}
                            className="h-8 w-8 rounded-lg border-border bg-muted p-0 text-muted-foreground hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                          >
                            <Icon path={mdiDelete} size={0.7} />
                          </Button>
                        </div>
                      </div>

                      {isText ? (
                        <div className="mt-2 pl-[2.75rem]">
                          <Textarea
                            value={(obj as Textbox).text}
                            onChange={(e) => {
                              (obj as Textbox).set('text', e.target.value);
                              updateProperty('text', e.target.value);
                              selectLayer(obj);
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            className="min-h-[30px] w-full resize-none rounded-md border border-border bg-muted px-2 py-1 text-xs font-semibold text-foreground placeholder:text-muted-foreground hover:border-border focus-visible:ring-1 focus-visible:ring-ring"
                            placeholder={`텍스트-${textLayerNumber}`}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {layers.length === 0 ? (
                  <EditorGuideCard
                    iconPath={mdiShape}
                    description="편집할 개체를 추가하세요"
                    className="rounded-none !border-0 !bg-transparent py-12"
                  />
                ) : null}
              </div>
            </div>
          </div>
        );

      case 'share':
        return (
          <div className="flex w-full flex-col gap-8">
            {!isTemplateSaveDisabled ? (
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="h-11 rounded-xl font-bold"
                >
                  <Icon path={mdiContentSave} size={0.9} />
                  {savedTemplate ? '밈플릿 업데이트' : '밈플릿 게시'}
                </Button>
                {savedTemplate?.visibility === 'public' ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void copyTemplateShareLink()}
                    className="h-11 rounded-xl font-semibold"
                  >
                    <Icon path={mdiLinkVariant} size={0.9} /> 공유 링크 복사
                  </Button>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-4">
              {canPublishRemix ? (
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    onClick={() => setIsRemixModalOpen(true)}
                    className="h-11 rounded-xl font-bold"
                  >
                    <Icon path={mdiShareVariant} size={0.9} /> 리믹스 게시
                  </Button>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        className="h-11 flex-1 rounded-xl border-none bg-primary px-3 text-sm font-bold text-primary-foreground hover:bg-primary/92"
                      >
                        <Icon path={mdiDownload} size={0.9} />
                        다운로드
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      {downloadOptions.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => downloadImage(option.value)}
                          className="text-sm font-semibold"
                        >
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={copyToClipboard}
                  className="h-11 rounded-xl border border-border bg-muted px-3 text-sm font-bold text-muted-foreground hover:border-border hover:text-foreground"
                >
                  <Icon path={mdiContentCopy} size={0.9} />
                  클립보드 복사
                </Button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex w-full min-h-0 flex-col bg-editor-sidebar-bg md:h-full md:flex-1 md:overflow-hidden">
      <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
        <div className="w-full max-w-full animate-in fade-in slide-in-from-top-4 duration-500">
          {renderPanelContent()}
        </div>
      </div>

      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{savedTemplate ? '밈플릿 업데이트' : '밈플릿 게시'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Input
              value={templateTitle}
              onChange={(e) => setTemplateTitle(e.target.value)}
              maxLength={100}
              placeholder="밈플릿 제목"
            />
            <Textarea
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="밈플릿 설명 (선택)"
            />
            <SegmentedButtons
              value={templateVisibility}
              onChange={(value) => setTemplateVisibility(value as 'private' | 'public')}
              className="grid-cols-2"
              options={[
                { label: '비공개', value: 'private' },
                { label: '공개', value: 'public' },
              ]}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsTemplateModalOpen(false)}>취소</Button>
            <Button type="button" onClick={() => void handleTemplatePublish()} disabled={isTemplateSaving}>
              {isTemplateSaving ? '처리 중...' : savedTemplate ? '업데이트' : '게시'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRemixModalOpen} onOpenChange={setIsRemixModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>리믹스 게시</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Input
              value={remixTitle}
              onChange={(e) => setRemixTitle(e.target.value)}
              maxLength={100}
              placeholder="리믹스 제목"
            />
            <Textarea
              value={remixDescription}
              onChange={(e) => setRemixDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="리믹스 설명 (선택)"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsRemixModalOpen(false)}>취소</Button>
            <Button type="button" onClick={() => void handleRemixPublish()} disabled={isImagePublishing}>
              {isImagePublishing ? '처리 중...' : '게시'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemePropertyPanel;
