import React from 'react';
import Icon from '@mdi/react';
import { mdiUndo, mdiRedo, mdiPencil, mdiShareVariant } from '@mdi/js';
import { Button } from '@/components/ui/button';

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

  const renderToolButton = (
    tool: { key: StudioTool; label: string; icon: string; requiresBackground?: boolean },
    compact = false,
    desktopPanel = false,
  ) => {
    const disabled = Boolean(tool.requiresBackground && !hasBackground);
    const isActive = activeTool === tool.key;
    const baseClassName = compact
      ? desktopPanel
        ? 'h-10 rounded-xl px-3 border border-transparent'
        : 'h-11 rounded-lg px-2 border border-transparent'
      : 'h-[60px] rounded-2xl px-2.5 border border-border/65 bg-editor-sidebar-subtle-bg/65';
    const stateClassName = isActive
      ? compact
        ? desktopPanel
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'bg-muted text-foreground shadow-sm ring-1 ring-ring/40'
        : 'bg-gradient-to-b from-primary/20 to-primary/8 text-foreground shadow-sm ring-1 ring-primary/35'
      : compact
        ? desktopPanel
          ? 'bg-transparent text-foreground/90 hover:border-border hover:bg-card/70 hover:text-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        : 'text-muted-foreground hover:bg-editor-sidebar-subtle-bg/90 hover:text-foreground';
    return (
      <Button
        key={tool.key}
        type="button"
        variant="ghost"
        disabled={disabled}
        onClick={() => setActiveTool(tool.key)}
        className={`${baseClassName} flex w-full flex-col gap-1 ${stateClassName}`}
      >
        <Icon path={tool.icon} size={compact ? 0.85 : 0.95} />
        <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-black uppercase tracking-tight`}>
          {tool.label}
        </span>
      </Button>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-app-surface md:h-screen">
      <MainHeader />

      <div className="relative flex min-h-0 flex-col md:flex-1 md:flex-row md:overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col md:py-3 md:pl-3 md:pr-2">
            <div
              className="relative flex min-h-0 flex-1 flex-col overflow-hidden md:rounded-[28px]"
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

        <aside className="editor-desktop-glass hidden h-full min-h-0 w-[336px] shrink-0 md:my-3 md:mr-3 md:h-[calc(100%-1.5rem)] md:rounded-2xl md:bg-editor-sidebar-bg/88 md:flex md:flex-col">
          <div className="space-y-3 px-4 py-4">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/70 p-1">
              {STUDIO_TOOLS.map((tool) => renderToolButton(tool, true, true))}
            </div>
            {hasBackground ? (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  className="h-10 rounded-xl border-transparent bg-muted text-foreground hover:border-border hover:bg-accent"
                >
                  <Icon path={mdiUndo} size={0.85} />
                  실행 취소
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  className="h-10 rounded-xl border-transparent bg-muted text-foreground hover:border-border hover:bg-accent"
                >
                  <Icon path={mdiRedo} size={0.85} />
                  다시 실행
                </Button>
              </div>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <MemePropertyPanel {...panelProps} />
          </div>
        </aside>

        <div className="editor-desktop-glass md:hidden px-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2">
          <div className="overflow-hidden rounded-2xl bg-editor-sidebar-bg/88">
            <div className="space-y-3 px-4 py-4">
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/70 p-1">
                {STUDIO_TOOLS.map((tool) => renderToolButton(tool, true, true))}
              </div>
              {hasBackground ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className="h-10 rounded-xl border-transparent bg-muted text-foreground hover:border-border hover:bg-accent"
                  >
                    <Icon path={mdiUndo} size={0.85} />
                    실행 취소
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    className="h-10 rounded-xl border-transparent bg-muted text-foreground hover:border-border hover:bg-accent"
                  >
                    <Icon path={mdiRedo} size={0.85} />
                    다시 실행
                  </Button>
                </div>
              ) : null}
            </div>
            <MemePropertyPanel {...panelProps} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemeEditor;
