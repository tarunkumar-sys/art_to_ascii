import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Play, Pause, SkipBack, SkipForward,
  ChevronUp, ChevronDown, Scissors, Check, X
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

// ─── Dual-handle Trim Slider ─────────────────────────────────────────────────

const TrimSlider = ({ duration, trimStart, trimEnd, onTrimStartChange, onTrimEnd, onSave, onCancel, isPlaying, togglePlay, currentTime, handleSeek }) => {
  const trackRef = useRef(null);
  const dragging = useRef(null); // 'start' | 'end' | null

  const startPct = duration > 0 ? (trimStart / duration) * 100 : 0;
  const endPct   = duration > 0 ? (trimEnd   / duration) * 100 : 100;

  const clampToTrack = useCallback((clientX) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleMouseDown = (handle) => (e) => {
    e.preventDefault();
    dragging.current = handle;
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const pct = clampToTrack(e.clientX);
      const time = pct * duration;

      if (dragging.current === 'start') {
        // Start can never exceed end (leave at least 0.1s gap)
        const clamped = Math.min(time, trimEnd - 0.1);
        onTrimStartChange(Math.max(0, clamped));
      } else {
        // End can never go below start
        const clamped = Math.max(time, trimStart + 0.1);
        onTrimEnd(Math.min(duration, clamped));
      }
    };

    const onUp = () => { dragging.current = null; };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [duration, trimStart, trimEnd, onTrimStartChange, onTrimEnd, clampToTrack]);

  // Playhead position % inside trim rail
  const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col gap-2 px-3 pb-3 pt-2 bg-[#141414] border-b border-blender-border">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors className="w-3 h-3 text-amber-400" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400">Trim Region</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Loop preview play/pause */}
          <button
            id="trim-play-btn"
            onClick={togglePlay}
            title={isPlaying ? 'Pause trim preview' : 'Play trim preview (loops)'}
            className="flex items-center gap-1 h-[20px] px-2 rounded-[2px] bg-blender-active/20 border border-blender-active/40 text-white text-[9px] font-bold hover:bg-blender-active/30 transition-colors"
          >
            {isPlaying
              ? <Pause className="w-2.5 h-2.5 fill-current" />
              : <Play  className="w-2.5 h-2.5 fill-current" />}
            {isPlaying ? 'Pause' : 'Preview'}
          </button>
          {/* Save Trim */}
          <button
            id="trim-save-btn"
            onClick={onSave}
            className="flex items-center gap-1 h-[20px] px-2 rounded-[2px] bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[9px] font-bold hover:bg-amber-500/35 transition-colors"
          >
            <Check className="w-2.5 h-2.5" />
            Save Trim
          </button>
          {/* Cancel */}
          <button
            id="trim-cancel-btn"
            onClick={onCancel}
            className="flex items-center gap-1 h-[20px] px-2 rounded-[2px] bg-[#1d1d1d] border border-[#333] text-gray-400 text-[9px] hover:text-white transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* Time readouts */}
      <div className="flex items-center justify-between text-[9px] font-mono">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-gray-400">IN&nbsp;</span>
          <span className="text-emerald-300 font-bold">{formatTime(trimStart)}</span>
        </div>
        <div className="text-amber-400 font-bold">
          {formatTime(currentTime)}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-red-300 font-bold">{formatTime(trimEnd)}</span>
          <span className="text-gray-400">OUT</span>
          <div className="w-2 h-2 rounded-full bg-red-400" />
        </div>
      </div>

      {/* Track */}
      <div ref={trackRef} className="relative h-6 flex items-center select-none">
        {/* Background rail */}
        <div className="absolute inset-x-0 h-2 rounded-full bg-[#1d1d1d] border border-[#333]" />
        {/* Dimmed — before start */}
        <div className="absolute top-0 bottom-0 bg-black/30" style={{ left: 0, width: `${startPct}%` }} />
        {/* Active zone */}
        <div
          className="absolute h-2 bg-amber-500/40 border-t border-b border-amber-500/60"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />
        {/* Dimmed — after end */}
        <div className="absolute top-0 bottom-0 bg-black/30" style={{ left: `${endPct}%`, right: 0 }} />

        {/* Playhead inside trim rail */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-blender-active/80 z-20 pointer-events-none"
          style={{ left: `${playheadPct}%` }}
        />

        {/* Start handle */}
        <div
          id="trim-handle-start"
          onMouseDown={handleMouseDown('start')}
          className="absolute z-10 flex flex-col items-center cursor-ew-resize group"
          style={{ left: `${startPct}%`, transform: 'translateX(-50%)' }}
        >
          <div className="w-3 h-6 rounded-sm bg-emerald-500 border border-emerald-300 shadow-lg group-hover:bg-emerald-400 group-hover:scale-110 transition-all flex items-center justify-center text-[6px] text-white font-black">‹</div>
        </div>

        {/* End handle */}
        <div
          id="trim-handle-end"
          onMouseDown={handleMouseDown('end')}
          className="absolute z-10 flex flex-col items-center cursor-ew-resize group"
          style={{ left: `${endPct}%`, transform: 'translateX(-50%)' }}
        >
          <div className="w-3 h-6 rounded-sm bg-red-500 border border-red-300 shadow-lg group-hover:bg-red-400 group-hover:scale-110 transition-all flex items-center justify-center text-[6px] text-white font-black">›</div>
        </div>
      </div>

      <p className="text-[8px] text-gray-700 leading-tight">
        Drag handles to set IN/OUT. Press Preview to loop the trimmed segment.
      </p>
    </div>
  );
};

// ─── component ───────────────────────────────────────────────────────────────

const BottomPanel = ({
  isPlaying, togglePlay, currentTime, duration, handleSeek,
  playbackSpeed, handleSpeedChange, isVisible, onClose, onOpen, height, setHeight,
  // Trim props (passed from App)
  trimRegion, onSaveTrim,
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [timelineWidth, setTimelineWidth] = useState(0);

  // ── Trim state (local, ephemeral until Save is clicked) ───────────────────
  const [showTrim,    setShowTrim]    = useState(false);
  const [trimStart,   setTrimStart]   = useState(0);
  const [trimEnd,     setTrimEnd]     = useState(0);

  // Sync trimEnd to duration when video loads / trim panel opens
  useEffect(() => {
    if (duration > 0) {
      setTrimStart(prev => Math.min(prev, duration));
      setTrimEnd(duration);
    }
  }, [duration]);

  // When trim panel opens, reset to full range and seek to start
  const openTrim = () => {
    setTrimStart(0);
    setTrimEnd(duration);
    setShowTrim(true);
    handleSeek(0);
  };

  const handleTrimStartChange = useCallback((val) => {
    setTrimStart(val);
    handleSeek(val);
  }, [handleSeek]);

  const handleTrimEndChange = useCallback((val) => {
    setTrimEnd(val);
    handleSeek(val);
  }, [handleSeek]);

  const handleSaveTrim = () => {
    onSaveTrim?.({ startTime: trimStart, endTime: trimEnd });
    setShowTrim(false);
  };

  // Loop playback within trim region when trim panel is open
  useEffect(() => {
    if (!showTrim || !isPlaying) return;
    if (currentTime >= trimEnd - 0.05) {
      handleSeek(trimStart);
    }
  }, [currentTime, showTrim, isPlaying, trimStart, trimEnd, handleSeek]);

  const progressBarRef = useRef(null);
  const speedBarRef    = useRef(null);

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


  // Time-driven marker generation
  const { markers, timeStep } = useMemo(() => {
    const step = calcTimeStep(timelineWidth, duration);
    const m = [];
    for (let t = 0; t <= duration; t += step) {
      m.push(t);
    }
    if (m.length > 0 && duration - m[m.length - 1] > step * 0.1) {
      m.push(duration);
    }
    return { markers: m, timeStep: step };
  }, [timelineWidth, duration]);

  // ── interaction handlers ─────────────────────────────────────────────────

  const handleTimelineInteraction = (e) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = pct * duration;
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
    const onUp   = () => setIsScrubbing(false);
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
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    handleSpeedChange(parseFloat((0.25 + pct * 3.75).toFixed(2)));
  };

  const handleResizeStart = (e) => { setIsResizing(true); e.preventDefault(); };

  useEffect(() => {
    const onMove = (e) => {
      if (!isResizing) return;
      const newH = window.innerHeight - e.clientY;
      if (!isVisible && newH > 25) onOpen();
      if (isVisible && newH < 40)  { onClose(); setIsResizing(false); }
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
    if (leftPct <= 3)  return '0%';
    if (leftPct >= 97) return '-100%';
    return '-50%';
  };

  // Saved trim indicator visibility
  const hasSavedTrim = trimRegion && duration > 0;

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

          {/* ── Trim Slider Panel ───────────────────────────────────────── */}
          {showTrim && (
            <TrimSlider
              duration={duration}
              trimStart={trimStart}
              trimEnd={trimEnd}
              onTrimStartChange={handleTrimStartChange}
              onTrimEnd={handleTrimEndChange}
              onSave={handleSaveTrim}
              onCancel={() => { setShowTrim(false); }}
              isPlaying={isPlaying}
              togglePlay={togglePlay}
              currentTime={currentTime}
              handleSeek={handleSeek}
            />
          )}

          {/* Header bar */}
          <div className="h-8 bg-blender-header border-b border-blender-border flex items-center px-3 shrink-0 gap-4">

            {/* Left: Trim button */}
            <div className="flex-1 flex items-center gap-2">
              <button
                id="trim-toggle-btn"
                onClick={showTrim ? () => setShowTrim(false) : openTrim}
                title="Toggle trim region"
                className={`flex items-center gap-1.5 h-[22px] px-2 rounded-[2px] border text-[9px] font-bold
                  transition-all ${showTrim
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-[0_0_6px_rgba(245,158,11,0.2)]'
                    : 'bg-[#1d1d1d] border-[#333] text-gray-500 hover:border-amber-500/40 hover:text-amber-400'
                  }`}
              >
                <Scissors className="w-3 h-3" />
                Trim
              </button>

              {/* Saved trim badge */}
              {hasSavedTrim && !showTrim && (
                <div
                  className="flex items-center gap-1 h-[18px] px-1.5 rounded-[2px] bg-amber-500/10 border border-amber-500/30 text-[8px] font-mono text-amber-400"
                  title={`Saved trim: ${formatTime(trimRegion.startTime)} → ${formatTime(trimRegion.endTime)}`}
                >
                  ✂ {formatTime(trimRegion.startTime)}–{formatTime(trimRegion.endTime)}
                </div>
              )}
            </div>

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

              {/* Time Readout */}
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

            {/* Saved Trim region overlay on timeline */}
            {hasSavedTrim && duration > 0 && (
              <div
                className="absolute inset-y-0 bg-amber-500/10 border-l border-r border-amber-500/40 pointer-events-none"
                style={{
                  left:  `${(trimRegion.startTime / duration) * 100}%`,
                  width: `${((trimRegion.endTime - trimRegion.startTime) / duration) * 100}%`,
                }}
              />
            )}

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