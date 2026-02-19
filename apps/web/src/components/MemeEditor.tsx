import React from 'react';
import Icon from '@mdi/react';
import { mdiUndo, mdiRedo } from '@mdi/js';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
    completeTextEdit,
  } = useMemeEditor({ initialTemplate, initialTemplateMode });

  const panelProps = {
    layers: layers.filter((l) => l.name !== 'background'),
    selectLayer,
    activeTool,
    hasBackground,
    bgUrl,
    setBgUrl,
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
    changeZIndex,
  };

  return (
    <TooltipProvider>
      <div className="flex min-h-screen flex-col bg-app-surface md:h-screen">
        <MainHeader />

        <div className="relative flex flex-1 flex-col md:flex-row md:overflow-hidden">
          <EditorLayout
            sidebar={(
              <div
                className="relative z-20 hidden h-full min-h-0 w-[400px] shrink-0 flex-col border-r border-editor-divider bg-editor-sidebar-bg md:flex"
              >
                <MemeToolbar
                  activeTool={activeTool}
                  setActiveTool={setActiveTool}
                  hasBackground={hasBackground}
                />
                {hasBackground && (
                  <div className="border-b border-slate-100 px-6 py-4">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={undo}
                            disabled={historyIndex <= 0}
                            className="h-9 w-9 rounded-full border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                          >
                            <Icon path={mdiUndo} size={0.8} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>실행 취소 (Ctrl+Z)</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={redo}
                            disabled={historyIndex >= history.length - 1}
                            className="h-9 w-9 rounded-full border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                          >
                            <Icon path={mdiRedo} size={0.8} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>다시 실행 (Ctrl+Y)</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}
                <div className="min-h-0 flex-1 overflow-hidden">
                  <MemePropertyPanel {...panelProps} />
                </div>
              </div>
            )}
          >
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div
                className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
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

              <div className="shrink-0 flex-col border-t border-editor-divider bg-editor-sidebar-bg md:hidden">
                <div className="sticky top-0 z-10 border-b border-slate-100 bg-editor-sidebar-subtle-bg">
                  <MemeToolbar activeTool={activeTool} setActiveTool={setActiveTool} hasBackground={hasBackground} />
                </div>
                {hasBackground && (
                  <div className="border-b border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={undo}
                            disabled={historyIndex <= 0}
                            className="h-8 w-8 rounded-full border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                          >
                            <Icon path={mdiUndo} size={0.8} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>실행 취소 (Ctrl+Z)</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={redo}
                            disabled={historyIndex >= history.length - 1}
                            className="h-8 w-8 rounded-full border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                          >
                            <Icon path={mdiRedo} size={0.8} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>다시 실행 (Ctrl+Y)</TooltipContent>
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
      </div>
    </TooltipProvider>
  );
};

export default MemeEditor;
