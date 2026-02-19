import React from 'react';
import Icon from '@mdi/react';
import { mdiUndo, mdiRedo, mdiPencil, mdiShareVariant } from '@mdi/js';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import MainHeader from './layout/MainHeader';
import MemePropertyPanel from './editor/MemePropertyPanel';
import MemeCanvas from './editor/MemeCanvas';
import { useMemeEditor } from '../hooks/useMemeEditor';
import type { TemplateRecord } from '../types/template';

interface MemeEditorProps {
  initialTemplate?: TemplateRecord | null;
  initialTemplateMode?: 'mine' | 'public';
}

type StudioTool = 'edit' | 'share';

const STUDIO_TOOLS: Array<{ key: StudioTool; label: string; icon: string; requiresBackground?: boolean }> = [
  { key: 'edit', label: '편집', icon: mdiPencil, requiresBackground: true },
  { key: 'share', label: '공유', icon: mdiShareVariant, requiresBackground: true },
];

const MemeEditor: React.FC<MemeEditorProps> = ({ initialTemplate, initialTemplateMode }) => {
  const canvasAreaRef = React.useRef<HTMLDivElement>(null);

  const {
    canvasRef,
    containerRef,
    activeTool,
    setActiveTool,
    activeObject,
    layers,
    hasBackground,
    workspaceSize,
    historyIndex,
    history,
    undo,
    redo,
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
    changeZIndex,
  };

  const activeToolLabel = activeTool === 'edit'
      ? '편집'
      : activeTool === 'share'
        ? '공유'
        : '도구 선택';

  const renderToolButton = (tool: { key: StudioTool; label: string; icon: string; requiresBackground?: boolean }, compact = false) => {
    const disabled = Boolean(tool.requiresBackground && !hasBackground);
    const isActive = activeTool === tool.key;
    return (
      <Button
        key={tool.key}
        type="button"
        variant="ghost"
        disabled={disabled}
        onClick={() => setActiveTool(tool.key)}
        className={`${
          compact ? 'h-11 rounded-lg px-2' : 'h-14 rounded-xl px-2'
        } flex w-full flex-col gap-1 border border-transparent ${
          isActive
            ? 'bg-muted text-foreground shadow-sm ring-1 ring-ring/40'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <Icon path={tool.icon} size={compact ? 0.85 : 0.95} />
        <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-black uppercase tracking-tight`}>
          {tool.label}
        </span>
      </Button>
    );
  };

  return (
    <TooltipProvider>
      <div className="flex min-h-screen flex-col bg-app-surface md:h-screen">
        <MainHeader />

        <div className="relative flex min-h-0 flex-col md:flex-1 md:flex-row md:overflow-hidden">
          <aside className="hidden h-full min-h-0 w-[88px] shrink-0 border-r border-editor-divider bg-editor-sidebar-bg/85 md:flex">
            <div className="flex h-full w-full flex-col justify-between px-3 py-4">
              <div className="space-y-2">
                {STUDIO_TOOLS.map((tool) => renderToolButton(tool))}
              </div>
              {hasBackground ? (
                <div className="space-y-2 border-t border-border/70 pt-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={undo}
                        disabled={historyIndex <= 0}
                        className="h-10 w-full rounded-xl border-border bg-muted text-foreground hover:bg-accent"
                      >
                        <Icon path={mdiUndo} size={0.9} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">실행 취소 (Ctrl+Z)</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={redo}
                        disabled={historyIndex >= history.length - 1}
                        className="h-10 w-full rounded-xl border-border bg-muted text-foreground hover:bg-accent"
                      >
                        <Icon path={mdiRedo} size={0.9} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">다시 실행 (Ctrl+Y)</TooltipContent>
                  </Tooltip>
                </div>
              ) : null}
            </div>
          </aside>

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
                onUploadImage={handleImageUpload}
              />
            </div>
          </div>

          <aside className="hidden h-full min-h-0 w-[360px] shrink-0 border-l border-editor-divider bg-editor-sidebar-bg md:flex md:flex-col">
            <div className="border-b border-editor-divider px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Context Panel</p>
              <p className="mt-1 text-sm font-bold text-foreground">{activeToolLabel}</p>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <MemePropertyPanel {...panelProps} />
            </div>
          </aside>

          <div className="border-t border-editor-divider bg-editor-sidebar-bg/95 md:hidden">
            <div className="border-b border-border/70 px-3 py-2">
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/70 p-1">
                {STUDIO_TOOLS.map((tool) => renderToolButton(tool, true))}
              </div>
            </div>

            {hasBackground ? (
              <div className="border-b border-border/70 px-3 py-2">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/70 p-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className="h-8 w-8 rounded-full border-border bg-muted text-foreground hover:bg-accent"
                  >
                    <Icon path={mdiUndo} size={0.8} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    className="h-8 w-8 rounded-full border-border bg-muted text-foreground hover:bg-accent"
                  >
                    <Icon path={mdiRedo} size={0.8} />
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="px-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2">
              <MemePropertyPanel {...panelProps} />
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default MemeEditor;
