import { useCallback, useEffect, useState } from 'react';

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.1;

const clampZoom = (value: number) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value));
const roundZoom = (value: number) => Math.round(value * 100) / 100;

export const useEditorZoom = () => {
  const [zoom, setZoom] = useState(1);

  const updateZoom = useCallback((updater: (prev: number) => number) => {
    setZoom((prev) => roundZoom(clampZoom(updater(prev))));
  }, []);

  const zoomIn = useCallback(() => {
    updateZoom((prev) => prev + ZOOM_STEP);
  }, [updateZoom]);

  const zoomOut = useCallback(() => {
    updateZoom((prev) => prev - ZOOM_STEP);
  }, [updateZoom]);

  const resetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  const zoomByWheelDelta = useCallback((deltaY: number) => {
    if (!Number.isFinite(deltaY) || deltaY === 0) return;
    if (deltaY < 0) {
      zoomIn();
      return;
    }
    zoomOut();
  }, [zoomIn, zoomOut]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;

      const target = e.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName;
        if (tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
      }

      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        zoomIn();
        return;
      }

      if (e.key === '-') {
        e.preventDefault();
        zoomOut();
        return;
      }

      if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetZoom, zoomIn, zoomOut]);

  return {
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    zoomByWheelDelta,
  };
};
