import React from 'react';
import { 
  Button, 
  Input, 
  Slider, 
  Upload, 
  Divider, 
  Typography, 
  Tooltip, 
  Empty,
  Segmented
} from 'antd';
import type { UploadChangeParam, UploadFile } from 'antd/es/upload';
import Icon from '@mdi/react';
import { 
  mdiCloudUpload, 
  mdiLinkVariant, 
  mdiPlus, 
  mdiDelete, 
  mdiDownload, 
  mdiRectangle, 
  mdiCircle, 
  mdiBrush, 
  mdiOpacity, 
  mdiContentCopy,
  mdiArrowUp,
  mdiArrowDown,
  mdiShape,
  mdiFormatColorText,
  mdiImage,
  mdiClose,
  mdiLayers
} from '@mdi/js';
import type { ToolType } from './MemeToolbar';
import * as fabric from 'fabric';
import MemeColorPicker from './MemeColorPicker';

const { Text } = Typography;

type FormatType = 'png' | 'jpg' | 'webp' | 'pdf';

interface MemePropertyPanelProps {
  activeTool: ToolType | null;
  hasBackground: boolean;
  showLayers: boolean;
  setShowLayers: (show: boolean) => void;
  bgUrl: string;
  setBgUrl: (url: string) => void;
  handleImageUpload: (info: UploadChangeParam<UploadFile>) => void;
  setBackgroundImage: (url: string) => void;
  addText: () => void;
  isTextSelected: boolean;
  color: string;
  updateProperty: (key: string, value: string | number) => void;
  activateEyedropper: () => void;
  fontSize: number;
  activeObject: fabric.Object | null;
  opacity: number;
  strokeWidth: number;
  deleteActiveObject: () => void;
  addShape: (type: 'rect' | 'circle') => void;
  isShapeSelected: boolean;
  brushSize: number;
  setBrushSize: (size: number) => void;
  setColor: (color: string) => void;
  downloadImage: (format: FormatType) => void;
  copyToClipboard: () => void;
  layers: fabric.Object[];
  moveLayer: (direction: 'front' | 'forward' | 'backward' | 'back') => void;
  selectLayer: (obj: fabric.Object) => void;
  editMode: 'base' | 'template';
}

const MemePropertyPanel: React.FC<MemePropertyPanelProps> = (props) => {
  const {
    activeTool,
    hasBackground,
    showLayers,
    setShowLayers,
    bgUrl,
    setBgUrl,
    handleImageUpload,
    setBackgroundImage,
    addText,
    isTextSelected,
    color,
    updateProperty,
    activateEyedropper,
    fontSize,
    activeObject,
    opacity,
    strokeWidth,
    deleteActiveObject,
    addShape,
    isShapeSelected,
    brushSize,
    setBrushSize,
    setColor,
    downloadImage,
    copyToClipboard,
    layers,
    moveLayer,
    selectLayer
  } = props;

  const [downloadFormat, setDownloadFormat] = React.useState<FormatType>('png');

  const renderPanelContent = () => {
    if (!activeTool) return <Empty description="도구를 선택하여 편집을 시작하세요" />;
    
    switch(activeTool) {
      case 'background':
        return (
          <div className="flex flex-col gap-8 w-full">
            <div>
              <Text strong className="block mb-4 text-slate-700">이미지 업로드</Text>
              <Upload.Dragger
                accept="image/*"
                showUploadList={false}
                customRequest={({ onSuccess }) => onSuccess?.('ok')}
                onChange={handleImageUpload}
                className="bg-slate-50 hover:bg-slate-100 transition-colors border-slate-200"
                style={{ padding: '24px 0', border: '2px dashed #e2e8f0' }}
              >
                <p className="flex justify-center mb-2">
                  <Icon path={mdiCloudUpload} size={2.5} color="#1677ff" />
                </p>
                <p className="ant-upload-text text-slate-600 font-semibold mt-2">클릭 또는 드래그하여 업로드</p>
              </Upload.Dragger>
            </div>
            
            <div className="flex items-center gap-4">
               <div className="h-px bg-slate-200 flex-1"></div>
               <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">또는</span>
               <div className="h-px bg-slate-200 flex-1"></div>
            </div>
            
            <div>
              <Text strong className="block mb-4 text-slate-700">외부 URL 로드</Text>
              <div className="flex flex-col gap-2">
                <Input 
                  prefix={<Icon path={mdiLinkVariant} size={0.8} className="text-slate-400" />}
                  placeholder="https://example.com/image.jpg" 
                  value={bgUrl}
                  onChange={(e) => setBgUrl(e.target.value)}
                  onPressEnter={() => bgUrl && setBackgroundImage(bgUrl)}
                  className="h-12 rounded-xl text-base"
                />
                <Button 
                  onClick={() => bgUrl && setBackgroundImage(bgUrl)}
                  className="h-12 rounded-xl font-bold text-base mt-2"
                  type="primary"
                  block
                >
                  배경 적용
                </Button>
              </div>
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="flex flex-col gap-10 w-full">
            <Button 
              type="primary" 
              icon={<Icon path={mdiPlus} size={1.2} />} 
              onClick={addText} 
              block
              disabled={!hasBackground}
              className="h-20 text-xl font-extrabold rounded-[1.5rem] shadow-xl shadow-blue-500/20 flex items-center justify-center gap-4 border-none bg-blue-600 hover:bg-blue-500"
            >
              텍스트 추가
            </Button>

            {isTextSelected ? (
              <div className="space-y-8 animate-in fade-in duration-300">
                  <Divider className="my-0 border-slate-100" />

                  <MemeColorPicker 
                    label="글자 색상" 
                    value={color} 
                    onChange={(val) => updateProperty('fill', val)}
                    activateEyedropper={activateEyedropper}
                    height="h-10"
                  />

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <Text type="secondary" className="text-xs font-bold text-slate-500 uppercase">글자 크기</Text>
                      <Text className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{fontSize}px</Text>
                    </div>
                    <Slider 
                      min={10} 
                      max={200} 
                      value={fontSize} 
                      onChange={(val) => updateProperty('fontSize', val)} 
                      tooltip={{ open: false }}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <Icon path={mdiOpacity} size={0.7} className="text-slate-400" />
                        <Text type="secondary" className="text-xs font-bold text-slate-500 uppercase tracking-wider">불투명도</Text>
                      </div>
                      <Text className="text-sm font-mono font-bold text-slate-600">{Math.round((opacity ?? 1) * 100)}%</Text>
                    </div>
                    <Slider 
                      min={0} 
                      max={100} 
                      value={(opacity ?? 1) * 100} 
                      onChange={(val) => updateProperty('opacity', val / 100)} 
                      tooltip={{ open: false }}
                      className="mx-2"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <Text type="secondary" className="text-xs font-bold text-slate-500 uppercase">외곽선 두께</Text>
                      <Text className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{strokeWidth}px</Text>
                    </div>
                    <Slider 
                      min={0} 
                      max={15} 
                      value={strokeWidth} 
                      onChange={(val) => updateProperty('strokeWidth', val)} 
                      tooltip={{ open: false }}
                    />
                  </div>

                  <Button 
                    danger 
                    icon={<Icon path={mdiDelete} size={0.8} />} 
                    onClick={deleteActiveObject}
                    block
                    className="flex items-center justify-center gap-2"
                  >
                    선택 삭제
                  </Button>
              </div>
            ) : (
                <Empty description="텍스트를 선택하세요" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>
        );

      case 'shapes':
        return (
          <div className="flex flex-col gap-10 w-full">
             <div className="flex flex-col gap-4">
                <button 
                    className="h-24 w-full flex flex-row items-center justify-start gap-6 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50 hover:border-blue-500 hover:bg-white hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer outline-none"
                    onClick={() => addShape('rect')}
                    disabled={!hasBackground}
                >
                    <div className="w-14 h-14 shrink-0 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center group-hover:border-blue-100 transition-all">
                        <Icon path={mdiRectangle} size={1.5} className="text-blue-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-lg font-black text-slate-900 leading-tight">사각형</span>
                    </div>
                </button>
                <button 
                    className="h-24 w-full flex flex-row items-center justify-start gap-6 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50 hover:border-blue-500 hover:bg-white hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer outline-none"
                    onClick={() => addShape('circle')}
                    disabled={!hasBackground}
                >
                    <div className="w-14 h-14 shrink-0 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center group-hover:border-blue-100 transition-all">
                        <Icon path={mdiCircle} size={1.5} className="text-blue-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-lg font-black text-slate-900 leading-tight">원형</span>
                    </div>
                </button>
             </div>

             {isShapeSelected ? (
                 <div className="space-y-8 animate-in fade-in duration-300">
                    <Divider className="my-0 border-slate-100" />
                    
                    <MemeColorPicker 
                        label="채우기 색상" 
                        value={color} 
                        onChange={(val) => updateProperty('fill', val)}
                        activateEyedropper={activateEyedropper}
                    />

                    <Button 
                        danger 
                        icon={<Icon path={mdiDelete} size={0.9} />} 
                        onClick={deleteActiveObject}
                        block
                        className="h-14 text-base font-bold rounded-2xl flex items-center justify-center gap-2 mt-4"
                    >
                        도형 삭제
                    </Button>
                 </div>
             ) : (
                 <div className="text-center text-slate-400 mt-4 text-sm">
                     도형을 추가하여 불필요한<br/>텍스트나 영역을 가려보세요.
                 </div>
             )}
          </div>
        );

      case 'brush':
        return (
          <div className="flex flex-col gap-8 w-full">
             <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-4 mb-2">
                   <Icon path={mdiBrush} size={1} className="text-blue-500" />
                   <Text strong className="text-slate-700">브러쉬 모드</Text>
                </div>
                <Text type="secondary" className="text-sm block leading-relaxed">
                    캔버스 위에 자유롭게 그림을 그립니다. 색상과 크기를 조절하여 꾸며보세요.
                </Text>
             </div>

             <MemeColorPicker 
                label="브러쉬 색상" 
                value={color} 
                onChange={(val) => setColor(val)}
                activateEyedropper={activateEyedropper}
             />
             
             <div>
                <div className="flex justify-between items-center mb-4">
                  <Text type="secondary" className="text-xs font-bold text-slate-500 uppercase tracking-wider">브러쉬 크기</Text>
                  <Text className="text-sm font-mono font-bold bg-blue-50 px-3 py-1 rounded-full text-blue-600 border border-blue-100">{brushSize}px</Text>
                </div>
                <Slider 
                  min={1} 
                  max={100} 
                  value={brushSize} 
                  onChange={setBrushSize} 
                  tooltip={{ open: false }}
                  className="mx-2"
                />
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
                  disabled={!hasBackground}
               >
                  다운로드
               </Button>
                  
               <Button 
                  icon={<Icon path={mdiContentCopy} size={0.9} />} 
                  onClick={copyToClipboard}
                  size="large"
                  block
                  className="h-16 text-lg font-bold rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-slate-800 hover:border-slate-300"
                  disabled={!hasBackground}
               >
                  클립보드 복사
               </Button>
            </div>
          </div>
        );
    }
  };

    return (
    <div className="flex-1 h-full flex flex-col bg-white overflow-hidden">
      {/* 1. Property Section (Scrollable) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-8 md:px-8 md:py-8">
        <div className="w-full max-w-full animate-in fade-in slide-in-from-top-4 duration-500">
          {renderPanelContent()}
        </div>
      </div>

      {/* 2. Layer Management Section (Fixed/Separated) */}
      {showLayers && (
        <div className="h-[42%] flex flex-col bg-slate-50 border-t-2 border-slate-100 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)] animate-in slide-in-from-bottom-8 duration-500">
          {/* Header */}
          <div className="px-4 py-4 md:px-8 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-900 rounded-lg shadow-lg shadow-slate-900/10">
                <Icon path={mdiLayers} size={0.7} className="text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-1">Management</span>
                <span className="text-sm font-black text-slate-800 leading-none">Layers Stack</span>
              </div>
              <span className="ml-2 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black">{layers.length}</span>
            </div>
            <Button 
              type="text" 
              size="small" 
              icon={<Icon path={mdiClose} size={0.6} />} 
              onClick={() => setShowLayers(false)}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl w-8 h-8 flex items-center justify-center"
            />
          </div>

          {/* Layer List (Scrollable) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-6 md:px-8">
            <div className="flex flex-col gap-3 pb-4">
              {[...layers].reverse().map((obj, index) => {
                const isSelected = activeObject === obj;
                let icon = mdiShape;
                let name = '도형';
                if (obj instanceof fabric.IText) { 
                  icon = mdiFormatColorText; 
                  name = (obj as fabric.IText).text?.substring(0, 10) || '텍스트'; 
                } else if (obj instanceof fabric.Image || obj.type === 'image') { 
                  icon = mdiImage; 
                  name = '이미지'; 
                }
                
                return (
                  <div 
                    key={index}
                    className={`
                      flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group
                      ${isSelected ? 'border-blue-500 bg-white shadow-md ring-4 ring-blue-500/5' : 'border-slate-100 bg-white hover:border-blue-200 shadow-sm hover:shadow-md'}
                    `}
                    onClick={() => selectLayer(obj)}
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className={`p-2 rounded-xl transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                        <Icon path={icon} size={0.7} />
                      </div>
                      <span className={`text-sm font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-600'}`}>{name}</span>
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="앞으로">
                          <Button size="small" type="text" icon={<Icon path={mdiArrowUp} size={0.6} />} onClick={() => moveLayer('forward')} className="hover:bg-blue-50 hover:text-blue-600" />
                        </Tooltip>
                        <Tooltip title="뒤로">
                          <Button size="small" type="text" icon={<Icon path={mdiArrowDown} size={0.6} />} onClick={() => moveLayer('backward')} className="hover:bg-blue-50 hover:text-blue-600" />
                        </Tooltip>
                        <Tooltip title="삭제">
                          <Button size="small" type="text" danger icon={<Icon path={mdiDelete} size={0.6} />} onClick={deleteActiveObject} className="hover:bg-red-50" />
                        </Tooltip>
                      </div>
                    )}
                  </div>
                )
              })}
              {layers.length === 0 && (
                <div className="py-12">
                  <Empty description="레이어가 없습니다" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemePropertyPanel;
