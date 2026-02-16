import React from 'react';
import { Layout, message, Button, Tooltip } from 'antd';
import Icon from '@mdi/react';
import { mdiUndo, mdiRedo } from '@mdi/js';

import MainHeader from './layout/MainHeader';
import EditorLayout from './editor/EditorLayout';
import MemeToolbar from './editor/MemeToolbar';
import MemePropertyPanel from './editor/MemePropertyPanel';
import MemeCanvas from './editor/MemeCanvas';
import { useMemeEditor } from '../hooks/useMemeEditor';
import type { TemplateRecord } from '../types/template';

interface MemeEditorProps {
  initialTemplate?: TemplateRecord | null;
  initialTemplateMode?: 'mine' | 'public';
}

const MemeEditor: React.FC<MemeEditorProps> = ({ initialTemplate, initialTemplateMode }) => {
  const [messageApi, contextHolder] = message.useMessage();
  
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
    saveTemplate,
    copyTemplateShareLink,
    savedTemplate,
    isTemplateSaving,
    isTemplateSaveDisabled,
    changeZIndex,
    canvasInstance,
    editingTextId,
    completeTextEdit
  } = useMemeEditor(messageApi, { initialTemplate, initialTemplateMode });

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
    saveTemplate,
    copyTemplateShareLink,
    savedTemplate,
    isTemplateSaving,
    isTemplateSaveDisabled,
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
                  </div>
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <MemePropertyPanel {...panelProps} />
              </div>
            </div>
          }
        >
          <div className="flex-1 min-w-0 flex flex-col min-h-0">
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
