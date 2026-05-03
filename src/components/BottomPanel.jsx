import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Play, Pause, SkipBack, SkipForward,
  ChevronUp, ChevronDown
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

const FPS = 30;
const NICE_TIME_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60];

/**
 * Formats seconds into mm:ss.xx for a professional readout
 */
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

/**
 * Adaptive marker step calculation based on time, not frames.
 */
function calcTimeStep(width, duration) {
  if (!width || !duration) return 1;
  const pxPerSecond = width / duration;
  for (const step of NICE_TIME_STEPS) {
    if (step * pxPerSecond >= 60) return step; // Minimum 60px gap for clarity
  }
  return NICE_TIME_STEPS[NICE_TIME_STEPS.length - 1];
}

// ─── component ───────────────────────────────────────────────────────────────

const BottomPanel = ({
  isPlaying, togglePlay, currentTime, duration, handleSeek,
  playbackSpeed, handleSpeedChange, isVisible, onClose, onOpen, height, setHeight
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [timelineWidth, setTimelineWidth] = useState(0);

  const progressBarRef = useRef(null);
  const speedBarRef = useRef(null);

  // Measure timeline width with ResizeObserver
  useEffect(() => {
    if (!progressBarRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setTimelineWidth(entry.contentRect.width);
    });
    ro.observe(progressBarRef.current);
    return () => ro.disconnect();
  }, [isVisible]);

  // Derived Info (Frames are only for display)
  const currentFrame = Math.floor(currentTime * FPS);
  const totalFrames = Math.floor(duration * FPS);

  // Time-driven marker generation
  const { markers, timeStep } = useMemo(() => {
    const step = calcTimeStep(timelineWidth, duration);
    const m = [];
    for (let t = 0; t <= duration; t += step) {
      m.push(t);
    }
    // Ensure the end duration is always marked
    if (m.length > 0 && duration - m[m.length - 1] > step * 0.1) {
      m.push(duration);
    }
    return { markers: m, timeStep: step };
  }, [timelineWidth, duration]);

  // ── interaction handlers ─────────────────────────────────────────────────

  const handleTimelineInteraction = (e) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    // Core interaction: pixel -> time
    const time = pct * duration;

    // Industry behavior: optional snap to nearest frame for precision
    const snappedTime = Math.round(time * FPS) / FPS;
    handleSeek(snappedTime);
  };

  const [isScrubbing, setIsScrubbing] = useState(false);
  const handleMouseDown = (e) => {
    setIsScrubbing(true);
    handleTimelineInteraction(e);
  };

  useEffect(() => {
    const onMove = (e) => { if (isScrubbing) handleTimelineInteraction(e); };
    const onUp = () => setIsScrubbing(false);
    if (isScrubbing) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isScrubbing, duration]);

  const handleSpeedClick = (e) => {
    if (!speedBarRef.current) return;
    const rect = speedBarRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    handleSpeedChange(parseFloat((0.25 + pct * 3.75).toFixed(2)));
  };

  const handleResizeStart = (e) => { setIsResizing(true); e.preventDefault(); };

  useEffect(() => {
    const onMove = (e) => {
      if (!isResizing) return;
      const newH = window.innerHeight - e.clientY;
      if (!isVisible && newH > 25) onOpen();
      if (isVisible && newH < 40) { onClose(); setIsResizing(false); }
      else setHeight(Math.max(20, Math.min(600, newH)));
    };
    const onUp = () => setIsResizing(false);
    if (isResizing) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizing, setHeight, onClose, onOpen, isVisible]);

  const actualHeight = isVisible ? height : 20;

  // Shift label anchor so it never overflows the container edges
  const labelShift = (leftPct) => {
    if (leftPct <= 3) return '0%';
    if (leftPct >= 97) return '-100%';
    return '-50%';
  };

  return (
    <div
      style={{ height: `${actualHeight}px` }}
      className={`bg-blender-panel border-t border-blender-border flex flex-col z-20
        shadow-[0_-4px_10px_rgba(0,0,0,0.3)] transition-[height] duration-75 ease-out
        select-none relative ${!isVisible ? 'overflow-hidden' : ''}`}
    >
      {/* Resize handle */}
      <div
        className="h-1 bg-blender-border hover:bg-blender-active cursor-ns-resize
          transition-colors shrink-0 absolute top-0 left-0 right-0 z-30"
        onMouseDown={handleResizeStart}
      />

      {/* Main content */}
      {isVisible && (
        <div className="flex-1 flex flex-col pt-1 overflow-hidden">

          {/* Header bar */}
          <div className="h-8 bg-blender-header border-b border-blender-border flex items-center px-3 shrink-0 gap-4">

            {/* Left: Spacer to ensure absolute centering of the middle section */}
            <div className="flex-1" />

            {/* Center: Player Controls */}
            <div className="flex-1 flex justify-center items-center gap-0.5">
              {/* Jump to Start */}
              <button
                onClick={() => handleSeek(0)}
                className="p-1.5 hover:bg-blender-hover rounded-sm text-gray-400"
              >
                <SkipBack className="w-3 h-3" />
              </button>

              {/* Previous Frame */}
              <button
                onClick={() => handleSeek(Math.max(0, currentTime - 1 / FPS))}
                className="p-1.5 hover:bg-blender-hover rounded-sm text-gray-400"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18V6h2v12H6zm3.5-6L18 6v12l-8.5-6z" />
                </svg>
              </button>

              {/* Play / Pause */}
              <button
                onClick={togglePlay}
                className="p-1.5 hover:bg-blender-hover rounded-sm text-white bg-blender-active/20"
              >
                {isPlaying ? (
                  <Pause className="w-3 h-3 fill-current" />
                ) : (
                  <Play className="w-3 h-3 fill-current" />
                )}
              </button>

              {/* Next Frame */}
              <button
                onClick={() => handleSeek(Math.min(duration, currentTime + 1 / FPS))}
                className="p-1.5 hover:bg-blender-hover rounded-sm text-gray-400 rotate-180"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18V6h2v12H6zm3.5-6L18 6v12l-8.5-6z" />
                </svg>
              </button>

              {/* Jump to End */}
              <button
                onClick={() => handleSeek(duration)}
                className="p-1.5 hover:bg-blender-hover rounded-sm text-gray-400"
              >
                <SkipForward className="w-3 h-3" />
              </button>
            </div>

            {/* Right: Time Readout + Speed + Range */}
            <div className="flex-1 flex items-center justify-end gap-3">

              {/* Speed Controller */}
              <div className="flex items-center gap-2">
                <span className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter">Speed</span>
                <div
                  ref={speedBarRef}
                  onClick={handleSpeedClick}
                  className="w-16 h-1 bg-blender-input border border-blender-border relative cursor-pointer group/bar overflow-hidden"
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-blender-active/60 group-hover/bar:bg-blender-active transition-colors"
                    style={{ width: `${((playbackSpeed - 0.25) / 3.75) * 100}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-blender-active font-bold min-w-[24px]">
                  {playbackSpeed.toFixed(1)}
                </span>
              </div>

              {/* Time Readout (Now on Right) */}
              <div className="flex items-center gap-2 bg-black/20 px-2 py-0.5 rounded border border-white/5 h-6">
                <span className="text-[10px] font-mono text-blender-active font-bold min-w-[65px] text-center">
                  {formatTime(currentTime)}
                </span>
                <span className="text-[8px] text-gray-500 font-mono border-l border-white/10 pl-2">
                  {currentFrame}f
                </span>
                <span className="text-[8px] text-gray-500 font-mono border-l border-white/10 pl-2">
                  {duration.toFixed(1)}s
                </span>
              </div>
            </div>
          </div>

          {/* Timeline viewport */}
          <div
            ref={progressBarRef}
            onMouseDown={handleMouseDown}
            className="flex-1 bg-[#161616] relative overflow-hidden cursor-crosshair"
          >
            {/* Ruler (Time-based Markers) */}
            <div className="absolute inset-0 pointer-events-none">
              {markers.map((t) => {
                const leftPct = duration > 0 ? (t / duration) * 100 : 0;
                return (
                  <div
                    key={t}
                    className="absolute flex flex-col items-start pt-1"
                    style={{ left: `${leftPct}%` }}
                  >
                    <div className="h-1.5 w-px bg-gray-700" />
                    <span
                      className="text-[8px] text-gray-600 mt-0.5 font-mono block whitespace-nowrap"
                      style={{ transform: `translateX(${labelShift(leftPct)})` }}
                    >
                      {t.toFixed(1)}s
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blender-active
                shadow-[0_0_10px_rgba(75,137,234,0.3)] z-10 pointer-events-none"
              style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className="h-5 bg-blender-header border-t border-blender-border flex items-center px-2 shrink-0 mt-auto">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blender-active" />
          <span className="text-[8px] text-gray-500 font-mono tracking-widest uppercase">Video Controller</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <button
            onClick={isVisible ? onClose : onOpen}
            className="p-0.5 hover:bg-blender-hover rounded-sm text-gray-400 hover:text-white transition-colors"
          >
            {isVisible ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          <div className="font-mono text-[8px] opacity-30 pl-2">v1.1.2-PRO</div>
        </div>
      </div>
    </div>
  );
};

export default BottomPanel;