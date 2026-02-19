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
  const canvasAreaRef = React.useRef<HTMLDivElement>(null);
  
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
    publishImage,
    saveTemplate,
    copyTemplateShareLink,
    savedTemplate,
    isTemplateSaving,
    isImagePublishing,
    isBackgroundApplying,
    canPublishRemix,
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
    publishImage,
    saveTemplate,
    copyTemplateShareLink,
    savedTemplate,
    isTemplateSaving,
    isImagePublishing,
    isBackgroundApplying,
    canPublishRemix,
    isTemplateSaveDisabled,
    changeZIndex
  };
  const historyButtonClassName = '!bg-slate-50 !text-slate-700 !border-slate-200 hover:!bg-slate-100 hover:!text-slate-900 disabled:!bg-slate-50/60 disabled:!text-slate-500 disabled:!border-slate-200/70';

  return (
    <Layout
      className="min-h-screen md:h-screen flex flex-col bg-slate-100"
      style={{ backgroundColor: 'var(--app-surface)' }}
    >
      {contextHolder}
      <MainHeader />
      
      <div className="flex-1 flex flex-col md:flex-row relative md:overflow-hidden">
        <EditorLayout
          sidebar={
            <div className="hidden md:flex flex-col h-full min-h-0 w-[400px] bg-slate-50 border-r border-slate-200 shrink-0 relative z-20">
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
                        className={historyButtonClassName}
                      />
                    </Tooltip>
                    <Tooltip title="다시 실행 (Ctrl+Y)">
                      <Button
                        shape="circle"
                        icon={<Icon path={mdiRedo} size={0.8} />}
                        onClick={redo}
                        disabled={historyIndex >= history.length - 1}
                        className={historyButtonClassName}
                      />
                    </Tooltip>
                  </div>
                </div>
              )}
              <div className="flex-1 min-h-0 overflow-hidden">
                <MemePropertyPanel {...panelProps} />
              </div>
            </div>
          }
        >
          <div className="flex-1 min-w-0 flex flex-col min-h-0">
            {/* Canvas Area */}
            <div 
              className="flex-1 min-h-0 flex flex-col relative overflow-hidden"
              ref={canvasAreaRef}
              onClick={() => {
                if (canvasInstance) { 
                    canvasInstance.discardActiveObject(); 
                }
              }}
            >
                <MemeCanvas 
                  canvasRef={canvasRef} 
                  containerRef={containerRef} 
                  viewportRef={canvasAreaRef}
                  hasBackground={hasBackground}
                  editingTextId={editingTextId}
                  completeTextEdit={completeTextEdit}
                  canvasInstance={canvasInstance}
                  workspaceSize={workspaceSize}
                  isBackgroundLoading={isBackgroundApplying}
                />
            </div>

            {/* Mobile Only: Toolbar & Property Panel (Stacked below canvas) */}
            <div className="md:hidden shrink-0 flex flex-col bg-slate-50 border-t border-slate-200">
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
                          className={historyButtonClassName}
                        />
                      </Tooltip>
                      <Tooltip title="다시 실행 (Ctrl+Y)">
                        <Button
                          shape="circle"
                          icon={<Icon path={mdiRedo} size={0.8} />}
                          onClick={redo}
                          disabled={historyIndex >= history.length - 1}
                          size="small"
                          className={historyButtonClassName}
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
