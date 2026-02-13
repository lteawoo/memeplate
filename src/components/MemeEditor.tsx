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
                  undo={undo}
                  redo={redo}
                  canUndo={historyIndex > 0}
                  canRedo={historyIndex < history.length - 1}
                />
            </div>

            {/* Mobile Only: Toolbar & Property Panel (Stacked below canvas) */}
            <div className="md:hidden flex flex-col bg-white border-t border-slate-200">
                <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
                    <MemeToolbar activeTool={activeTool} setActiveTool={setActiveTool} hasBackground={hasBackground} />
                </div>
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
