import { useEffect } from 'react';

/**
 * useKeyboardShortcuts
 * ─────────────────────────────────────────────────────────────────────
 * Registers global keyboard shortcuts. Receives action callbacks from
 * other hooks so it stays a pure "wiring" layer with zero internal state.
 *
 * @param {object} params
 * @param {object} params.viewport   — { resetViewport, setZoom, setActiveTool }
 * @param {object} params.settings   — { setInvertBrightness, setColoredAscii, setResolution }
 * @param {object} params.playback   — { togglePlay, handleSeek, duration }
 * @param {object} params.modals     — { setIsShortcutsOpen }
 * @param {React.RefObject} params.mediaSourceRef
 */
export default function useKeyboardShortcuts({
  viewport,
  settings,
  playback,
  modals,
  mediaSourceRef,
}) {
  const { resetViewport, setZoom, setActiveTool } = viewport;
  const { setInvertBrightness, setColoredAscii, setResolution } = settings;
  const { togglePlay, handleSeek, duration } = playback;
  const { setIsShortcutsOpen } = modals;

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      const video = mediaSourceRef.current?.videoElement;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'r':
          resetViewport();
          break;
        case '+':
        case '=':
          setZoom((z) => Math.min(5, z + 0.1));
          break;
        case '-':
        case '_':
          setZoom((z) => Math.max(0.1, z - 0.1));
          break;
        case 'm':
          setActiveTool('move');
          break;
        case 'z':
          setActiveTool('zoom');
          break;
        case 'i':
          setInvertBrightness((v) => !v);
          break;
        case 'c':
          setColoredAscii((v) => !v);
          break;
        case '0':
          if (video) handleSeek(0);
          break;
        case 'arrowleft':
          if (video) handleSeek(Math.max(0, video.currentTime - 1));
          break;
        case 'arrowright':
          if (video) handleSeek(Math.min(duration, video.currentTime + 1));
          break;
        case '[':
          setResolution((r) => Math.max(0.5, r - 0.1));
          break;
        case ']':
          setResolution((r) => Math.min(3, r + 0.1));
          break;
        case '?':
          setIsShortcutsOpen(true);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlay, handleSeek, duration, resetViewport,
    setZoom, setActiveTool, setInvertBrightness, setColoredAscii,
    setResolution, setIsShortcutsOpen, mediaSourceRef,
  ]);
}
