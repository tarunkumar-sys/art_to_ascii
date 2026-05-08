import { useState, useCallback } from 'react';

/**
 * usePlayback
 * ─────────────────────────────────────────────────────────────────────
 * Manages video playback state: play/pause, seek, speed, trim region,
 * panel visibility, and panel height.
 *
 * Requires `mediaSourceRef` and an optional `renderFrame` callback for
 * re-rendering a single frame after seeking while paused.
 */
export default function usePlayback(mediaSourceRef, renderFrame) {
  // ── Playback state ──────────────────────────────────────────────────
  const [isPlaying, setIsPlaying]         = useState(false);
  const [currentTime, setCurrentTime]     = useState(0);
  const [duration, setDuration]           = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // ── Panel state ─────────────────────────────────────────────────────
  const [panelHeight, setPanelHeight]       = useState(110);
  const [isPanelVisible, setIsPanelVisible] = useState(false);

  // ── Trim region ─────────────────────────────────────────────────────
  const [trimRegion, setTrimRegion] = useState(null);

  const handleSaveTrim = useCallback(({ startTime, endTime }) => {
    setTrimRegion({ startTime, endTime });
    console.log('[Trim] Saved region:', { startTime, endTime });
  }, []);

  // ── Playback helpers ────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    const video = mediaSourceRef.current?.videoElement;
    if (video) {
      if (isPlaying) video.pause();
      else video.play();
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying, mediaSourceRef]);

  const handleSeek = useCallback((time) => {
    const video = mediaSourceRef.current?.videoElement;
    if (video) {
      video.currentTime = time;
      setCurrentTime(time);
      if (!isPlaying && renderFrame) renderFrame();
    }
  }, [isPlaying, mediaSourceRef, renderFrame]);

  const handleSpeedChange = useCallback((speed) => {
    setPlaybackSpeed(speed);
    const video = mediaSourceRef.current?.videoElement;
    if (video) video.playbackRate = speed;
  }, [mediaSourceRef]);

  return {
    isPlaying, setIsPlaying,
    currentTime, setCurrentTime,
    duration, setDuration,
    playbackSpeed, handleSpeedChange,
    panelHeight, setPanelHeight,
    isPanelVisible, setIsPanelVisible,
    trimRegion, handleSaveTrim,
    togglePlay,
    handleSeek,
  };
}
