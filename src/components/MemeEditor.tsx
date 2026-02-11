import React from 'react';
import { Layout, message } from 'antd';

import MainHeader from './layout/MainHeader';
import EditorLayout from './editor/EditorLayout';
import MemeToolbar from './editor/MemeToolbar';
import MemePropertyPanel from './editor/MemePropertyPanel';
import MemeCanvas from './editor/MemeCanvas';
import { useMemeEditor } from '../hooks/useMemeEditor';

const MemeEditor: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  
  const {
    canvasRef,
    containerRef,
    activeTool,
    setActiveTool,
    isPanelOpen,
    setIsPanelOpen,
    activeObject,
    layers,
    color,
    bgUrl,
    setBgUrl,
    hasBackground,
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
    canvasInstance
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

  return (
    <Layout className="h-screen overflow-hidden bg-white relative">
      {contextHolder}
      <MainHeader />
      
      <div className="flex-1 flex overflow-hidden relative">
        <EditorLayout
          sidebar={
            <div className="hidden md:flex flex-col h-full w-[400px] bg-white border-r border-slate-200 shrink-0 relative z-20">
              <MemeToolbar 
                activeTool={activeTool} 
                setActiveTool={setActiveTool}
                hasBackground={hasBackground}
              />
              <div className="flex-1 overflow-hidden">
                <MemePropertyPanel {...panelProps} />
              </div>
            </div>
          }
        >
          <div 
            className="flex-1 flex flex-col overflow-hidden order-1 md:order-2 relative"
            onClick={(e) => {
              if ((e.target as HTMLElement).tagName.toLowerCase() === 'canvas') return;
              if (canvasInstance) { 
                  canvasInstance.discardActiveObject(); 
              }
              if (window.innerWidth < 768) setIsPanelOpen(false);
            }}
          >
              <MemeCanvas 
                canvasRef={canvasRef} 
                containerRef={containerRef} 
                hasBackground={hasBackground}
                undo={undo}
                redo={redo}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
              />
          </div>
        </EditorLayout>

        <div 
          className="md:hidden fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none flex flex-col justify-end" 
          style={{ height: '100vh' }}
          onClick={(e) => e.stopPropagation()}
        >
            <div 
              className={`bg-white border-t border-slate-200 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.1)] transition-all duration-300 ease-in-out rounded-t-3xl overflow-hidden pointer-events-auto ${isPanelOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}
              style={{ height: '45vh' }}
            >
                <div className="h-10 flex items-center justify-center bg-white cursor-pointer border-b border-slate-50 shrink-0" onClick={() => setIsPanelOpen(false)}>
                  <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                </div>
                <div className="h-full overflow-hidden" style={{ height: 'calc(45vh - 40px)' }}>
                    <MemePropertyPanel {...panelProps} />
                </div>
            </div>

            <div className="bg-white border-t border-slate-100 relative z-10 pointer-events-auto" style={{ height: '80px' }}>
                <MemeToolbar activeTool={activeTool} setActiveTool={setActiveTool} hasBackground={hasBackground} />
            </div>
        </div>
      </div>
    </Layout>
  );
};

export default MemeEditor;
