import React from 'react';
import { Layout, message, Button, Tooltip, InputNumber } from 'antd';
import Icon from '@mdi/react';
import { mdiUndo, mdiRedo, mdiMinus, mdiPlus } from '@mdi/js';

import MainHeader from './layout/MainHeader';
import EditorLayout from './editor/EditorLayout';
import MemeToolbar from './editor/MemeToolbar';
import MemePropertyPanel from './editor/MemePropertyPanel';
import MemeCanvas from './editor/MemeCanvas';
import { useMemeEditor } from '../hooks/useMemeEditor';

const MemeEditor: React.FC = () => {
  const ZOOM_MIN = 20;
  const ZOOM_MAX = 400;
  const ZOOM_STEP = 10;
  const WHEEL_ZOOM_FACTOR = 0.08;

  const [messageApi, contextHolder] = message.useMessage();
  const [zoomMode, setZoomMode] = React.useState<'fit' | 'manual'>('fit');
  const [zoomPercent, setZoomPercent] = React.useState(100);
  
  const {
    canvasRef,
    containerRef,
    activeTool,
    setActiveTool,
    activeObject,
    layers,
    color,
    bgUrl,
    setBgUrl,
    hasBackground,
    workspaceSize,
    historyIndex,
    history,
    undo,
    redo,
    setBackgroundImage,
    selectLayer,
    handleImageUpload,
    addText,
    updateProperty,
    deleteActiveObject,
    addShape,
    downloadImage,
    copyToClipboard,
    changeZIndex,
    canvasInstance,
    editingTextId,
    completeTextEdit
  } = useMemeEditor(messageApi);

  const panelProps = {
    layers: layers.filter(l => l.name !== 'background'), 
    selectLayer,
    activeTool, hasBackground, bgUrl, setBgUrl,
    handleImageUpload,
    setBackgroundImage,
    addText,
    color, 
    updateProperty,
    activeObject,
    deleteActiveObject,
    addShape,
    downloadImage,
    copyToClipboard,
    changeZIndex
  };

  React.useEffect(() => {
    if (!hasBackground) {
      setZoomMode('fit');
      setZoomPercent(100);
    }
  }, [hasBackground]);

  const clampZoomPercent = React.useCallback((value: number) => {
    if (!isFinite(value)) return 100;
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value)));
  }, [ZOOM_MAX, ZOOM_MIN]);

  const setManualZoom = React.useCallback((value: number) => {
    setZoomMode('manual');
    setZoomPercent(clampZoomPercent(value));
  }, [clampZoomPercent]);

  const nudgeZoom = React.useCallback((delta: number) => {
    setManualZoom(zoomPercent + delta);
  }, [setManualZoom, zoomPercent]);

  const handleWheelZoom = React.useCallback((deltaY: number) => {
    const next = zoomPercent - (deltaY * WHEEL_ZOOM_FACTOR);
    setManualZoom(next);
  }, [WHEEL_ZOOM_FACTOR, setManualZoom, zoomPercent]);

  React.useEffect(() => {
    const handleZoomReset = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key !== '0') return;
      e.preventDefault();
      setZoomMode('fit');
    };
    window.addEventListener('keydown', handleZoomReset);
    return () => window.removeEventListener('keydown', handleZoomReset);
  }, []);

  return (
    <Layout className="h-screen flex flex-col bg-white">
      {contextHolder}
      <MainHeader />
      
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <EditorLayout
          sidebar={
            <div className="hidden md:flex flex-col h-full w-[400px] bg-white border-r border-slate-200 shrink-0 relative z-20">
              <MemeToolbar 
                activeTool={activeTool} 
                setActiveTool={setActiveTool}
                hasBackground={hasBackground}
              />
              {hasBackground && (
                <div className="px-6 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-2">
                    <Tooltip title="실행 취소 (Ctrl+Z)">
                      <Button
                        shape="circle"
                        icon={<Icon path={mdiUndo} size={0.8} />}
                        onClick={undo}
                        disabled={historyIndex <= 0}
                      />
                    </Tooltip>
                    <Tooltip title="다시 실행 (Ctrl+Y)">
                      <Button
                        shape="circle"
                        icon={<Icon path={mdiRedo} size={0.8} />}
                        onClick={redo}
                        disabled={historyIndex >= history.length - 1}
                      />
                    </Tooltip>
                    <div className="mx-1 h-6 w-px bg-slate-200" />
                    <Tooltip title="축소">
                      <Button
                        size="small"
                        shape="circle"
                        icon={<Icon path={mdiMinus} size={0.62} />}
                        onClick={() => nudgeZoom(-ZOOM_STEP)}
                      />
                    </Tooltip>
                    <InputNumber
                      size="small"
                      min={ZOOM_MIN}
                      max={ZOOM_MAX}
                      step={ZOOM_STEP}
                      controls={false}
                      value={zoomPercent}
                      suffix="%"
                      className="w-20"
                      onChange={(value) => {
                        if (typeof value !== 'number') return;
                        setManualZoom(value);
                      }}
                      onStep={(value) => {
                        setManualZoom(value);
                      }}
                    />
                    <Tooltip title="확대">
                      <Button
                        size="small"
                        shape="circle"
                        icon={<Icon path={mdiPlus} size={0.62} />}
                        onClick={() => nudgeZoom(ZOOM_STEP)}
                      />
                    </Tooltip>
                  </div>
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <MemePropertyPanel {...panelProps} />
              </div>
            </div>
          }
        >
          <div className="flex-1 flex flex-col min-h-0">
            {/* Canvas Area */}
            <div 
              className="flex-1 flex flex-col relative"
              onClick={() => {
                if (canvasInstance) { 
                    canvasInstance.discardActiveObject(); 
                }
              }}
            >
                <MemeCanvas 
                  canvasRef={canvasRef} 
                  containerRef={containerRef} 
                  hasBackground={hasBackground}
                  editingTextId={editingTextId}
                  completeTextEdit={completeTextEdit}
                  canvasInstance={canvasInstance}
                  workspaceSize={workspaceSize}
                  zoomMode={zoomMode}
                  zoomPercent={zoomPercent}
                  onZoomPercentChange={setZoomPercent}
                  onWheelZoom={handleWheelZoom}
                />
            </div>

            {/* Mobile Only: Toolbar & Property Panel (Stacked below canvas) */}
            <div className="md:hidden flex flex-col bg-white border-t border-slate-200">
                <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
                    <MemeToolbar activeTool={activeTool} setActiveTool={setActiveTool} hasBackground={hasBackground} />
                </div>
                {hasBackground && (
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
                      <Tooltip title="실행 취소 (Ctrl+Z)">
                        <Button
                          shape="circle"
                          icon={<Icon path={mdiUndo} size={0.8} />}
                          onClick={undo}
                          disabled={historyIndex <= 0}
                          size="small"
                        />
                      </Tooltip>
                      <Tooltip title="다시 실행 (Ctrl+Y)">
                        <Button
                          shape="circle"
                          icon={<Icon path={mdiRedo} size={0.8} />}
                          onClick={redo}
                          disabled={historyIndex >= history.length - 1}
                          size="small"
                        />
                      </Tooltip>
                      <div className="mx-1 h-5 w-px bg-slate-200" />
                      <Button
                        size="small"
                        shape="circle"
                        icon={<Icon path={mdiMinus} size={0.62} />}
                        onClick={() => nudgeZoom(-ZOOM_STEP)}
                      />
                      <InputNumber
                        size="small"
                        min={ZOOM_MIN}
                        max={ZOOM_MAX}
                        step={ZOOM_STEP}
                        controls={false}
                        value={zoomPercent}
                        suffix="%"
                        className="w-20"
                        onChange={(value) => {
                          if (typeof value !== 'number') return;
                          setManualZoom(value);
                        }}
                        onStep={(value) => {
                          setManualZoom(value);
                        }}
                      />
                      <Button
                        size="small"
                        shape="circle"
                        icon={<Icon path={mdiPlus} size={0.62} />}
                        onClick={() => nudgeZoom(ZOOM_STEP)}
                      />
                    </div>
                  </div>
                )}
                <div className="p-4">
                    <MemePropertyPanel {...panelProps} />
                </div>
            </div>
          </div>
        </EditorLayout>
      </div>
    </Layout>
  );
};

export default MemeEditor;
