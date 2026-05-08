import { useState, useCallback } from 'react';

/**
 * useViewport
 * ─────────────────────────────────────────────────────────────────────
 * Manages the canvas viewport: zoom, pan, drag, and active tool.
 * Provides mouse-event handlers ready to bind on the viewer container.
 */
export default function useViewport() {
  const [zoom, setZoom]             = useState(1);
  const [pan, setPan]               = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart]   = useState({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState('move');

  // ── Reset helpers ───────────────────────────────────────────────────

  const resetViewport = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // ── Mouse handlers ──────────────────────────────────────────────────

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.1, Math.min(5, z - e.deltaY * 0.0005)));
  }, []);

  const handleMouseDown = useCallback((e) => {
    if ((e.button === 0 && activeTool === 'move') || e.button === 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [activeTool, pan]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  return {
    zoom, setZoom,
    pan, setPan,
    isDragging,
    activeTool, setActiveTool,
    resetViewport,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
