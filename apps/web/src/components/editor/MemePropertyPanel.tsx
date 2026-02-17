import React from 'react';
import { 
  Button, 
  Input, 
  Upload, 
  Typography, 
  Empty,
  Segmented,
  Dropdown,
  type MenuProps
} from 'antd';
import type { UploadChangeParam, UploadFile } from 'antd/es/upload';
import Icon from '@mdi/react';
import { 
  mdiCloudUpload, 
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
  mdiShareVariant
} from '@mdi/js';
import type { ToolType } from './MemeToolbar';
import { Rect, Circle, Textbox, type CanvasObject } from '../../core/canvas';
import MemeColorPicker from './MemeColorPicker';
import { Popover, Slider, InputNumber } from 'antd';

const { Text } = Typography;

type FormatType = 'png' | 'jpg' | 'webp' | 'pdf';

interface MemePropertyPanelProps {
  activeTool: ToolType | null;
  hasBackground: boolean;
  bgUrl: string;
  setBgUrl: (url: string) => void;
  handleImageUpload: (info: UploadChangeParam<UploadFile>) => void;
  setBackgroundImage: (url: string) => void;
  addText: () => void;
  color: string;
  updateProperty: (key: string, value: string | number) => void;
  activeObject: CanvasObject | null;
  deleteActiveObject: () => void;
  addShape: (type: 'rect' | 'circle') => void;
  downloadImage: (format: FormatType) => void;
  copyToClipboard: () => void;
  publishImage: (title: string, description: string) => Promise<{ id: string; shareSlug: string } | null>;
  saveTemplate: (title: string, description: string, visibility: 'private' | 'public') => Promise<{ id: string; title: string; description?: string; visibility: 'private' | 'public'; shareSlug: string } | null>;
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
    bgUrl,
    setBgUrl,
    handleImageUpload,
    setBackgroundImage,
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
    changeZIndex
  } = props;

  const [downloadFormat, setDownloadFormat] = React.useState<FormatType>('png');
  const [templateTitle, setTemplateTitle] = React.useState('새 밈플릿');
  const [templateDescription, setTemplateDescription] = React.useState('');
  const [templateVisibility, setTemplateVisibility] = React.useState<'private' | 'public'>('private');
  const [remixTitle, setRemixTitle] = React.useState('새 리믹스');
  const [remixDescription, setRemixDescription] = React.useState('');
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

  const shapeItems: MenuProps['items'] = [
    {
      key: 'rect',
      label: '사각형',
      icon: <Icon path={mdiSquare} size={0.8} />,
      onClick: () => addShape('rect'),
    },
    {
      key: 'circle',
      label: '원형',
      icon: <Icon path={mdiCircle} size={0.8} />,
      onClick: () => addShape('circle'),
    },
  ];

  const renderPanelContent = () => {
    if (!activeTool) return <Empty description="도구를 선택하여 편집을 시작하세요" />;
    
    switch(activeTool) {
      case 'background':
        // ... (background logic)
        return (
          <div className="flex flex-col gap-6 md:gap-8 w-full">
            <div>
              <Text strong className="block mb-3 md:mb-4 text-slate-700 text-sm md:text-base">이미지 업로드</Text>
              <Upload.Dragger
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => {
                  handleImageUpload({ file: file as unknown as UploadFile, fileList: [] });
                  return false; // Prevent default upload behavior
                }}
                className="bg-slate-50 hover:bg-slate-100 transition-colors border-slate-200"
                style={{ padding: window.innerWidth < 768 ? '16px 0' : '24px 0', border: '2px dashed #e2e8f0' }}
              >
                <p className="flex justify-center mb-1 md:mb-2">
                  <Icon path={mdiCloudUpload} size={window.innerWidth < 768 ? 1.8 : 2.5} color="#1677ff" />
                </p>
                <p className="ant-upload-text text-slate-600 font-semibold mt-1 md:mt-2 text-xs md:text-sm">클릭 또는 드래그하여 업로드</p>
              </Upload.Dragger>
            </div>
            
            <div className="flex items-center gap-3 md:gap-4">
               <div className="h-px bg-slate-200 flex-1"></div>
               <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">또는</span>
               <div className="h-px bg-slate-200 flex-1"></div>
            </div>
            
            <div>
              <Text strong className="block mb-3 md:mb-4 text-slate-700 text-sm md:text-base">외부 URL 로드</Text>
              <div className="flex flex-col gap-2">
                <Input 
                  prefix={<Icon path={mdiLinkVariant} size={0.7} className="text-slate-400" />}
                  placeholder="https://example.com/image.jpg" 
                  value={bgUrl}
                  onChange={(e) => setBgUrl(e.target.value)}
                  onPressEnter={() => bgUrl && setBackgroundImage(bgUrl)}
                  className="h-10 md:h-12 rounded-xl text-sm md:text-base"
                />
                <Button 
                  onClick={() => bgUrl && setBackgroundImage(bgUrl)}
                  className="h-10 md:h-12 rounded-xl font-bold text-sm md:text-base mt-1 md:mt-2"
                  type="primary"
                  block
                >
                  배경 적용
                </Button>
              </div>
            </div>
          </div>
        );

      case 'edit':
        return (
          <div className="flex flex-col gap-4 w-full">
            {/* 1. Compact Action Bar */}
            <div className="flex items-center gap-2 bg-slate-100/50 p-2 rounded-2xl mb-2">
               <Button 
                  type="text"
                  icon={<Icon path={mdiFormatColorText} size={0.7} />} 
                  onClick={() => addText()}
                  className="flex-1 h-10 hover:bg-white hover:shadow-sm font-bold text-xs rounded-xl transition-all"
               >
                  텍스트
               </Button>
               <div className="w-px h-4 bg-slate-200" />
               <Dropdown menu={{ items: shapeItems }} trigger={['click']} placement="bottom">
                 <Button 
                    type="text"
                    icon={<Icon path={mdiShape} size={0.7} />} 
                    className="flex-1 h-10 hover:bg-white hover:shadow-sm font-bold text-xs rounded-xl transition-all"
                 >
                    도형
                 </Button>
               </Dropdown>
            </div>

            <div className="flex flex-col gap-0 border border-slate-100 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Layers ({layers.length})</span>
              </div>
              
              <div className="flex flex-col overflow-y-auto max-h-[65vh] custom-scrollbar">
                {[...layers].reverse().map((obj, idx) => {
                  const isSelected = activeObject?.id === obj.id;
                  const isText = obj instanceof Textbox;
                  const isRect = obj instanceof Rect;
                  const isCircle = obj instanceof Circle;
                  const textLayerNumber = textLayerOrder.get(obj.id) ?? 1;
                  
                  return (
                    <div 
                      key={obj.id || idx} 
                      className={`
                        group flex flex-col p-1.5 transition-all border-b border-slate-50 last:border-b-0
                        ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'bg-white hover:bg-slate-50/50 border-l-4 border-l-transparent'}
                      `}
                      onClick={() => selectLayer(obj)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col bg-white rounded border border-slate-200 overflow-hidden shrink-0">
                          <Button 
                            type="text"
                            size="small"
                            icon={<Icon path={mdiChevronUp} size={0.5} />} 
                            onClick={(e) => { e.stopPropagation(); selectLayer(obj); changeZIndex('forward'); }}
                            className="w-6 h-4 flex items-center justify-center text-slate-400 hover:text-blue-600 p-0"
                          />
                          <Button 
                            type="text"
                            size="small"
                            icon={<Icon path={mdiChevronDown} size={0.5} />} 
                            onClick={(e) => { e.stopPropagation(); selectLayer(obj); changeZIndex('backward'); }}
                            className="w-6 h-4 flex items-center justify-center text-slate-400 hover:text-blue-600 p-0"
                          />
                        </div>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}>
                          <Icon path={isText ? mdiFormatColorText : mdiShape} size={0.5} />
                        </div>
                        
                        {isText ? (
                          <span className={`text-[11px] font-bold truncate flex-1 pl-1 ${isSelected ? 'text-blue-900' : 'text-slate-500'}`}>
                            텍스트 레이어
                          </span>
                        ) : (
                          <span className={`text-[11px] font-bold truncate flex-1 pl-1 ${isSelected ? 'text-blue-900' : 'text-slate-500'}`}>
                            {isRect ? '사각형' : isCircle ? '원형' : '도형'}
                          </span>
                        )}

                        <div className="flex items-center gap-1 shrink-0">
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
                          {isText && (
                            <MemeColorPicker 
                              label="" 
                              value={obj.stroke as string || '#000000'} 
                              onChange={(val) => {
                                  obj.set('stroke', val);
                                  updateProperty('stroke', val);
                                  selectLayer(obj);
                              }}
                              compact
                            />
                          )}
                          {isText && (
                            <Popover
                              placement="bottomRight"
                              title={<span className="text-xs font-bold">텍스트 상세 설정</span>}
                              trigger="click"
                              content={
                                <div className="flex flex-col gap-5 w-72 p-1">
                                  {/* 1. Font Style & Weight */}
                                  <div className="flex flex-col gap-2">
                                    <Text className="text-[11px] text-slate-400 font-bold uppercase block">스타일</Text>
                                    <div className="flex gap-2">
                                      <Button 
                                        type={(obj as Textbox).fontWeight === 'bold' ? 'primary' : 'default'}
                                        icon={<Icon path={mdiFormatBold} size={0.6} />}
                                        onClick={() => {
                                          const next = (obj as Textbox).fontWeight === 'bold' ? 'normal' : 'bold';
                                          (obj as Textbox).set('fontWeight', next);
                                          updateProperty('fontWeight', next);
                                        }}
                                        className="flex-1 font-bold"
                                      >Bold</Button>
                                      <Button 
                                        type={(obj as Textbox).fontStyle === 'italic' ? 'primary' : 'default'}
                                        icon={<Icon path={mdiFormatItalic} size={0.6} />}
                                        onClick={() => {
                                          const next = (obj as Textbox).fontStyle === 'italic' ? 'normal' : 'italic';
                                          (obj as Textbox).set('fontStyle', next);
                                          updateProperty('fontStyle', next);
                                        }}
                                        className="flex-1 italic"
                                      >Italic</Button>
                                    </div>
                                  </div>

                                  {/* 2. Horizontal Align */}
                                  <div>
                                    <Text className="text-[11px] text-slate-400 font-bold uppercase block mb-2">가로 정렬</Text>
                                    <Segmented
                                      block
                                      value={(obj as Textbox).textAlign}
                                      onChange={(val) => {
                                        (obj as Textbox).set('textAlign', val);
                                        updateProperty('textAlign', val as string);
                                      }}
                                      options={[
                                        { value: 'left', label: <div className="flex items-center justify-center h-8 w-full"><Icon path={mdiFormatAlignLeft} size={0.6} /></div> },
                                        { value: 'center', label: <div className="flex items-center justify-center h-8 w-full"><Icon path={mdiFormatAlignCenter} size={0.6} /></div> },
                                        { value: 'right', label: <div className="flex items-center justify-center h-8 w-full"><Icon path={mdiFormatAlignRight} size={0.6} /></div> },
                                      ]}
                                    />
                                  </div>

                                  {/* 3. Vertical Align */}
                                  <div>
                                    <Text className="text-[11px] text-slate-400 font-bold uppercase block mb-2">세로 정렬</Text>
                                    <Segmented
                                      block
                                      value={(obj as Textbox).verticalAlign}
                                      onChange={(val) => {
                                        (obj as Textbox).set('verticalAlign', val);
                                        updateProperty('verticalAlign', val as string);
                                      }}
                                      options={[
                                        { value: 'top', label: <div className="flex items-center justify-center h-8 w-full"><Icon path={mdiFormatAlignTop} size={0.6} /></div> },
                                        { value: 'middle', label: <div className="flex items-center justify-center h-8 w-full"><Icon path={mdiFormatVerticalAlignCenter} size={0.6} /></div> },
                                        { value: 'bottom', label: <div className="flex items-center justify-center h-8 w-full"><Icon path={mdiFormatAlignBottom} size={0.6} /></div> },
                                      ]}
                                    />
                                  </div>

                                  {/* 4. Max Font Size */}
                                  <div>
                                    <div className="flex justify-between items-center mb-1">
                                      <Text className="text-[11px] text-slate-400 font-bold uppercase">최대 크기</Text>
                                      <InputNumber
                                        min={8} max={300} size="small" variant="borderless"
                                        value={(obj as Textbox).fontSize}
                                        onChange={(val) => val && updateProperty('fontSize', val)}
                                        className="text-right font-bold w-16"
                                      />
                                    </div>
                                    <Slider
                                      min={8} max={300}
                                      value={(obj as Textbox).fontSize}
                                      onChange={(val) => updateProperty('fontSize', val)}
                                      tooltip={{ open: false }}
                                    />
                                  </div>

                                  {/* 5. Stroke Width */}
                                  <div>
                                    <div className="flex justify-between items-center mb-1">
                                      <Text className="text-[11px] text-slate-400 font-bold uppercase">외곽선 강도</Text>
                                      <InputNumber
                                        min={0} max={10} step={0.1} size="small" variant="borderless"
                                        value={(obj as Textbox).strokeWidth}
                                        onChange={(val) => val !== null && updateProperty('strokeWidth', val)}
                                        className="text-right font-bold w-16"
                                      />
                                    </div>
                                    <Slider
                                      min={0} max={10} step={0.1}
                                      value={(obj as Textbox).strokeWidth}
                                      onChange={(val) => updateProperty('strokeWidth', val)}
                                      tooltip={{ open: false }}
                                    />
                                  </div>

                                  {/* 6. Opacity */}
                                  <div>
                                    <div className="flex justify-between items-center mb-1">
                                      <Text className="text-[11px] text-slate-400 font-bold uppercase px-0.5">
                                        <Icon path={mdiOpacity} size={0.4} className="inline mr-1" /> 불투명도
                                      </Text>
                                      <Text className="text-[11px] font-bold text-blue-600">{Math.round((obj as Textbox).opacity * 100)}%</Text>
                                    </div>
                                    <Slider
                                      min={0} max={1} step={0.01}
                                      value={(obj as Textbox).opacity}
                                      onChange={(val) => updateProperty('opacity', val)}
                                      tooltip={{ open: false }}
                                    />
                                  </div>
                                </div>
                              }
                            >
                              <Button 
                                type="text"
                                size="small"
                                icon={<Icon path={mdiTune} size={0.6} />} 
                                onClick={(e) => { e.stopPropagation(); selectLayer(obj); }}
                                className={`w-7 h-7 flex items-center justify-center rounded-lg p-0 ${isSelected ? 'text-blue-600 bg-blue-50/50 hover:bg-blue-100' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'}`}
                              />
                            </Popover>
                          )}
                          <Button 
                            type="text"
                            size="small"
                            icon={<Icon path={mdiDelete} size={0.6} />} 
                            onClick={(e) => {
                                e.stopPropagation();
                                selectLayer(obj);
                                deleteActiveObject();
                            }}
                            className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg p-0"
                          />
                        </div>
                      </div>
                      {isText && (
                        <div className="mt-2 pl-[2.75rem]">
                          <Input.TextArea
                            value={(obj as Textbox).text}
                            onChange={(e) => {
                                (obj as Textbox).set('text', e.target.value);
                                updateProperty('text', e.target.value);
                                selectLayer(obj);
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            autoSize={{ minRows: 1, maxRows: 3 }}
                            className="w-full border border-slate-200 bg-white hover:border-slate-300 focus:border-blue-400 transition-colors rounded-md text-xs font-semibold px-2 py-1"
                            placeholder={`텍스트-${textLayerNumber}`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                {layers.length === 0 && (
                  <div className="py-12 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                    <Empty description="편집할 개체를 추가하세요" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'share':
        return (
          <div className="flex flex-col gap-8 w-full">
            {!isTemplateSaveDisabled && (
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <Text strong className="text-slate-700">밈플릿 공유</Text>
                <Input
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  maxLength={100}
                  placeholder="밈플릿 제목"
                />
                <Input.TextArea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  maxLength={500}
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  placeholder="밈플릿 설명 (선택)"
                />
                <Segmented
                  value={templateVisibility}
                  onChange={(value) => setTemplateVisibility(value as 'private' | 'public')}
                  options={[
                    { label: '비공개', value: 'private' },
                    { label: '공개', value: 'public' }
                  ]}
                  block
                />
                <Button
                  type="primary"
                  icon={<Icon path={mdiContentSave} size={0.9} />}
                  loading={isTemplateSaving}
                  onClick={() => void saveTemplate(templateTitle, templateDescription, templateVisibility)}
                  className="h-11 rounded-xl font-bold"
                >
                  {savedTemplate ? '밈플릿 업데이트' : '밈플릿 저장'}
                </Button>
                {savedTemplate?.visibility === 'public' && (
                  <Button
                    icon={<Icon path={mdiLinkVariant} size={0.9} />}
                    onClick={() => void copyTemplateShareLink()}
                    className="h-10 rounded-xl font-semibold"
                  >
                    공유 링크 복사
                  </Button>
                )}
              </div>
            )}
            
            <div className="flex flex-col gap-4">
               {canPublishRemix ? (
                 <>
                   <Input
                      value={remixTitle}
                      onChange={(e) => setRemixTitle(e.target.value)}
                      maxLength={100}
                      placeholder="리믹스 제목"
                   />
                   <Input.TextArea
                      value={remixDescription}
                      onChange={(e) => setRemixDescription(e.target.value)}
                      maxLength={500}
                      autoSize={{ minRows: 2, maxRows: 4 }}
                      placeholder="리믹스 설명 (선택)"
                   />
                   <Button
                      type="primary"
                      icon={<Icon path={mdiShareVariant} size={1} />}
                      onClick={() => void publishImage(remixTitle, remixDescription)}
                      loading={isImagePublishing}
                      size="large"
                      block
                      className="h-16 text-lg font-bold shadow-lg shadow-emerald-500/20 rounded-2xl border-none bg-emerald-600 hover:bg-emerald-500"
                   >
                      리믹스 게시
                   </Button>
                 </>
               ) : null}

               <div className="bg-slate-50 p-2 rounded-2xl border border-slate-100">
                 <Segmented 
                    options={[
                        { label: 'PNG', value: 'png' },
                        { label: 'JPG', value: 'jpg' },
                        { label: 'WEBP', value: 'webp' },
                        { label: 'PDF', value: 'pdf' },
                    ]}
                    value={downloadFormat}
                    onChange={(val) => setDownloadFormat(val as FormatType)}
                    block
                    size="large"
                    className="bg-transparent"
                 />
               </div>

               <Button 
                  type="primary" 
                  icon={<Icon path={mdiDownload} size={1} />} 
                  onClick={() => downloadImage(downloadFormat)}
                  size="large"
                  block
                  className="h-16 text-lg font-bold shadow-lg shadow-blue-500/20 rounded-2xl border-none bg-blue-600 hover:bg-blue-500"
               >
                  다운로드
               </Button>
                  
               <Button 
                  icon={<Icon path={mdiContentCopy} size={0.9} />} 
                  onClick={copyToClipboard}
                  size="large"
                  block
                  className="h-16 text-lg font-bold rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-slate-800 hover:border-slate-300"
               >
                  클립보드 복사
               </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

    return (
    <div className="flex-1 h-full flex flex-col bg-white overflow-hidden">
      {/* 1. Property Section (Scrollable) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 md:px-6 md:py-6">
        <div className="w-full max-w-full animate-in fade-in slide-in-from-top-4 duration-500">
          {renderPanelContent()}
        </div>
      </div>
    </div>
  );
};

export default MemePropertyPanel;
