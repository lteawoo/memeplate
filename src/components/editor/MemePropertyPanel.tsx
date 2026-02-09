import React from 'react';
import { 
  Button, 
  Input, 
  Upload, 
  Typography, 
  Empty,
  Segmented
} from 'antd';
import type { UploadChangeParam, UploadFile } from 'antd/es/upload';
import Icon from '@mdi/react';
import { 
  mdiCloudUpload, 
  mdiLinkVariant, 
  mdiDelete, 
  mdiDownload, 
  mdiContentCopy,
  mdiShape,
  mdiFormatColorText,
  mdiChevronUp,
  mdiChevronDown
} from '@mdi/js';
import type { ToolType } from './MemeToolbar';
import * as fabric from 'fabric';
import MemeColorPicker from './MemeColorPicker';

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
  activeObject: fabric.Object | null;
  deleteActiveObject: () => void;
  addShape: (type: 'rect' | 'circle') => void;
  downloadImage: (format: FormatType) => void;
  copyToClipboard: () => void;
  layers: fabric.Object[];
  selectLayer: (obj: fabric.Object) => void;
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
    layers,
    selectLayer,
    changeZIndex
  } = props;

  const [downloadFormat, setDownloadFormat] = React.useState<FormatType>('png');
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const isObjectSelected = !!activeObject;

  const renderSlimBar = () => {
    if (!activeObject) return null;

    if ((activeTool === 'text' || activeTool === 'edit') && activeObject instanceof fabric.IText) {
        return (
            <div className="flex flex-row items-center gap-3 px-4 h-full w-full">
                <Input 
                    value={activeObject.text} 
                    onChange={(e) => {
                        props.updateProperty('text', e.target.value);
                        activeObject.set('text', e.target.value);
                        props.selectLayer(activeObject); 
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="flex-1 h-10 border-none bg-slate-100/50 rounded-lg"
                    placeholder="텍스트 입력"
                />
                <div className="flex items-center gap-2">
                    <MemeColorPicker 
                        label="" 
                        value={props.color} 
                        onChange={(val) => props.updateProperty('fill', val)}
                        height="h-8"
                        compact
                    />
                    <MemeColorPicker 
                        label="" 
                        value={(activeObject.stroke as string) || '#000000'} 
                        onChange={(val) => props.updateProperty('stroke', val)}
                        height="h-8"
                        compact
                    />
                    <Button 
                        danger 
                        shape="circle"
                        type="text"
                        icon={<Icon path={mdiDelete} size={0.7} />} 
                        onClick={props.deleteActiveObject}
                        className="flex items-center justify-center hover:bg-red-50 shrink-0"
                    />
                </div>
            </div>
        );
    }

    return (
      <div className="flex flex-row items-center gap-8 px-4 h-full overflow-x-auto no-scrollbar py-2">
        {/* Common: Color Picker */}
        <div className="shrink-0 border-r border-slate-100 pr-8">
           <MemeColorPicker 
              label={activeObject instanceof fabric.IText ? "글자 색상" : "채우기 색상"} 
              value={props.color} 
              onChange={(val) => props.updateProperty('fill', val)}
              
              height="h-10"
              compact
           />
        </div>

        {/* Delete Action */}
        <div className="shrink-0">
          <Button 
            danger 
            shape="circle"
            icon={<Icon path={mdiDelete} size={0.8} />} 
            onClick={props.deleteActiveObject}
            size="large"
            className="flex items-center justify-center border-none bg-red-50 hover:bg-red-100"
          />
        </div>
      </div>
    );
  };

  const renderPanelContent = () => {
    if (isMobile && isObjectSelected && (activeTool === 'edit' || !activeTool)) {
        return renderSlimBar();
    }

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
                customRequest={({ onSuccess }) => onSuccess?.('ok')}
                onChange={handleImageUpload}
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
               <Button 
                  type="text"
                  icon={<Icon path={mdiShape} size={0.7} />} 
                  onClick={() => addShape('rect')}
                  className="flex-1 h-10 hover:bg-white hover:shadow-sm font-bold text-xs rounded-xl transition-all"
               >
                  도형
               </Button>
            </div>

            <div className="flex flex-col gap-0 border border-slate-100 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Layers ({layers.length})</span>
              </div>
              
              <div className="flex flex-col overflow-y-auto max-h-[65vh] custom-scrollbar">
                {[...layers].reverse().map((obj, idx) => {
                  const isSelected = activeObject === obj;
                  const isText = obj instanceof fabric.IText;
                  const isRect = obj instanceof fabric.Rect;
                  const isCircle = obj instanceof fabric.Circle;
                  
                  return (
                    <div 
                      key={obj.id || idx} 
                      className={`
                        group flex flex-col p-1.5 transition-all border-b border-slate-50 last:border-b-0
                        ${isSelected ? 'bg-blue-50/50' : 'bg-white hover:bg-slate-50/50'}
                      `}
                      onClick={() => selectLayer(obj)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col bg-white rounded border border-slate-200 overflow-hidden shrink-0">
                          <Button 
                            type="text"
                            size="small"
                            icon={<Icon path={mdiChevronUp} size={0.4} />} 
                            onClick={(e) => { e.stopPropagation(); selectLayer(obj); changeZIndex('forward'); }}
                            className="w-5 h-3.5 flex items-center justify-center text-slate-400 hover:text-blue-600 p-0"
                          />
                          <Button 
                            type="text"
                            size="small"
                            icon={<Icon path={mdiChevronDown} size={0.4} />} 
                            onClick={(e) => { e.stopPropagation(); selectLayer(obj); changeZIndex('backward'); }}
                            className="w-5 h-3.5 flex items-center justify-center text-slate-400 hover:text-blue-600 p-0"
                          />
                        </div>
                        <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          <Icon path={isText ? mdiFormatColorText : mdiShape} size={0.4} />
                        </div>
                        
                        {isText ? (
                          <Input 
                            value={(obj as fabric.IText).text} 
                            onChange={(e) => {
                                (obj as fabric.IText).set('text', e.target.value);
                                updateProperty('text', e.target.value);
                                selectLayer(obj);
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="flex-1 h-6 border-none bg-transparent hover:bg-slate-100/30 focus:bg-white transition-colors rounded text-[11px] font-bold p-1"
                            placeholder="텍스트..."
                          />
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
                          <Button 
                            type="text"
                            size="small"
                            icon={<Icon path={mdiDelete} size={0.4} />} 
                            onClick={(e) => {
                                e.stopPropagation();
                                selectLayer(obj);
                                deleteActiveObject();
                            }}
                            className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded p-0"
                          />
                        </div>
                      </div>
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
            
            <div className="flex flex-col gap-4">
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