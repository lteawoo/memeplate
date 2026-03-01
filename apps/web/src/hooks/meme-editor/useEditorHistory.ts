import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { Canvas, type CanvasObject } from '../../core/canvas';

export interface HistoryItem {
  json: string;
  selectedId: string | null;
}

type UseEditorHistoryOptions = {
  canvasInstanceRef: MutableRefObject<Canvas | null>;
  setLayers: Dispatch<SetStateAction<CanvasObject[]>>;
};

export const useEditorHistory = ({ canvasInstanceRef, setLayers }: UseEditorHistoryOptions) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const isHistoryLockedRef = useRef(false);
  const historyRef = useRef<HistoryItem[]>([]);
  const indexRef = useRef(-1);
  const historyDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetHistory = useCallback((json: string, selectedId: string | null = null) => {
    const initialItem: HistoryItem = { json, selectedId };
    historyRef.current = [initialItem];
    indexRef.current = 0;
    setHistory([initialItem]);
    setHistoryIndex(0);
  }, []);

  const saveHistoryNow = useCallback(() => {
    if (isHistoryLockedRef.current || !canvasInstanceRef.current) return;

    const canvas = canvasInstanceRef.current;
    const json = JSON.stringify(canvas.toJSON(false));
    const activeObj = canvas.getActiveObject();
    const selectedId = activeObj ? activeObj.id : null;

    if (historyRef.current.length > 0 && indexRef.current > -1) {
      if (historyRef.current[indexRef.current].json === json) return;
    }

    const newItem: HistoryItem = { json, selectedId };
    const newHistory = historyRef.current.slice(0, indexRef.current + 1);
    newHistory.push(newItem);

    if (newHistory.length > 50) newHistory.shift();

    historyRef.current = newHistory;
    indexRef.current = newHistory.length - 1;

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [canvasInstanceRef]);

  const saveHistoryDebounced = useCallback((delayMs = 200) => {
    if (historyDebounceTimerRef.current) {
      clearTimeout(historyDebounceTimerRef.current);
    }
    historyDebounceTimerRef.current = setTimeout(() => {
      historyDebounceTimerRef.current = null;
      saveHistoryNow();
    }, delayMs);
  }, [saveHistoryNow]);

  const loadHistoryItem = useCallback((item: HistoryItem, newIndex: number) => {
    if (!canvasInstanceRef.current) return;

    const canvas = canvasInstanceRef.current;
    isHistoryLockedRef.current = true;
    canvas.loadFromJSON(JSON.parse(item.json), true).then(() => {
      const currentCanvas = canvasInstanceRef.current;
      if (!currentCanvas) return;

      if (item.selectedId) {
        const obj = currentCanvas.getObjectById(item.selectedId);
        if (obj) {
          currentCanvas.setActiveObject(obj);
        }
      } else {
        currentCanvas.discardActiveObject();
      }

      indexRef.current = newIndex;
      setHistoryIndex(newIndex);
      setLayers([...currentCanvas.getObjects()]);

      isHistoryLockedRef.current = false;
    }).catch((err) => {
      console.error('Failed to load history item:', err);
      isHistoryLockedRef.current = false;
    });
  }, [canvasInstanceRef, setLayers]);

  const undo = useCallback(() => {
    if (isHistoryLockedRef.current) return;
    if (indexRef.current <= 0 || !canvasInstanceRef.current) return;

    const newIndex = indexRef.current - 1;
    const prevState = historyRef.current[newIndex];
    if (!prevState) return;
    loadHistoryItem(prevState, newIndex);
  }, [canvasInstanceRef, loadHistoryItem]);

  const redo = useCallback(() => {
    if (isHistoryLockedRef.current) return;
    if (indexRef.current >= historyRef.current.length - 1 || !canvasInstanceRef.current) return;

    const newIndex = indexRef.current + 1;
    const nextState = historyRef.current[newIndex];
    if (!nextState) return;
    loadHistoryItem(nextState, newIndex);
  }, [canvasInstanceRef, loadHistoryItem]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [redo, undo]);

  const clearPendingHistorySave = useCallback(() => {
    if (!historyDebounceTimerRef.current) return;
    clearTimeout(historyDebounceTimerRef.current);
    historyDebounceTimerRef.current = null;
  }, []);

  return {
    history,
    historyIndex,
    isHistoryLockedRef,
    resetHistory,
    saveHistoryNow,
    saveHistoryDebounced,
    undo,
    redo,
    clearPendingHistorySave,
  };
};
