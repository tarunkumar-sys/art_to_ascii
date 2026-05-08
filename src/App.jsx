import React, { useState, useRef, useCallback } from 'react';
import Layout from './components/Layout';
import Sidebar from './components/Sidebar';
import AsciiViewer from './components/AsciiViewer';
import HelpModal from './components/HelpModal';
import BottomPanel from './components/BottomPanel';
import ExportDropdown from './components/ExportDropdown';
import MediaSource from './components/MediaSource';
import ShortcutsDropdown from './components/ShortcutsDropdown';
import { Analytics } from '@vercel/analytics/react';

import {
  useRenderSettings,
  useMediaManager,
  usePlayback,
  useViewport,
  useAsciiRenderer,
  useKeyboardShortcuts,
  useVideoPreview,
} from './hooks';

function App() {
  // ── Refs ─────────────────────────────────────────────────────────────
  const mediaSourceRef = useRef(null);

  // ── Modal state ─────────────────────────────────────────────────────
  const [isHelpOpen, setIsHelpOpen]         = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // ── Hook composition ────────────────────────────────────────────────
  const settings = useRenderSettings();
  const media    = useMediaManager(mediaSourceRef);
  const viewport = useViewport();

  // Playback needs a renderFrame reference — created by useAsciiRenderer.
  // We use a two-phase init: create playback first (renderFrame = null),
  // then supply the real renderFrame after useAsciiRenderer initialises.
  const playback = usePlayback(mediaSourceRef, null);
  const renderer = useAsciiRenderer(mediaSourceRef, settings, playback);

  // Patch playback's seek to use the real renderFrame
  const handleSeek = useCallback((time) => {
    const video = mediaSourceRef.current?.videoElement;
    if (video) {
      video.currentTime = time;
      playback.setCurrentTime(time);
      if (!playback.isPlaying) renderer.renderFrame();
    }
  }, [playback.isPlaying, renderer.renderFrame, mediaSourceRef]);

  // ── Media-ready callback ────────────────────────────────────────────
  const handleMediaReady = useCallback((type, url) => {
    media.setMediaType(type);
    media.setMediaUrl(url);
    media.setFetchError('');
    media.setIsFetchingUrl(false);

    if (type === 'image') {
      setTimeout(renderer.renderFrame, 50);
      playback.setIsPlaying(false);
      playback.setIsPanelVisible(false);
    } else if (type === 'video' || type === 'webcam') {
      const video = mediaSourceRef.current?.videoElement;
      if (video) {
        playback.setDuration(video.duration || 0);
        playback.setIsPlaying(type === 'webcam');
        playback.setIsPanelVisible(type === 'video');
      }
    }
  }, [renderer.renderFrame, media, playback, mediaSourceRef]);

  // ── Video first-frame preview ───────────────────────────────────────
  useVideoPreview({
    mediaUrl: media.mediaUrl,
    mediaType: media.mediaType,
    previewCanvasRef: renderer.previewCanvasRef,
    settings,
    setAsciiOutput: (v) => {/* renderer owns asciiOutput internally */},
  });

  // ── Keyboard shortcuts ──────────────────────────────────────────────
  useKeyboardShortcuts({
    viewport,
    settings,
    playback: { ...playback, handleSeek },
    modals: { setIsShortcutsOpen },
    mediaSourceRef,
  });

  // ── Webcam stop wrapper (also resets playback) ──────────────────────
  const stopWebcam = useCallback(() => {
    media.stopWebcam();
    playback.setIsPlaying(false);
  }, [media, playback]);

  // ── Prop bundles ────────────────────────────────────────────────────
  const sidebarProps = {
    mediaUrl: media.mediaUrl,
    mediaType: media.mediaType,
    videoRef: { current: null },
    handleFileUpload: media.handleFileUpload,
    asciiMode: settings.asciiMode,         setAsciiMode: settings.setAsciiMode,
    customChars: settings.customChars,     setCustomChars: settings.setCustomChars,
    resolution: settings.resolution,       setResolution: settings.setResolution,
    invertBrightness: settings.invertBrightness, setInvertBrightness: settings.setInvertBrightness,
    coloredAscii: settings.coloredAscii,   setColoredAscii: settings.setColoredAscii,
    edgeDetection: settings.edgeDetection, setEdgeDetection: settings.setEdgeDetection,
    edgeThreshold: settings.edgeThreshold, setEdgeThreshold: settings.setEdgeThreshold,
    brightness: settings.brightness,       setBrightness: settings.setBrightness,
    contrast: settings.contrast,           setContrast: settings.setContrast,
    aspectRatioCorrection: settings.aspectRatioCorrection, setAspectRatioCorrection: settings.setAspectRatioCorrection,
    asciiColor: settings.asciiColor,       setAsciiColor: settings.setAsciiColor,
    asciiOpacity: settings.asciiOpacity,   setAsciiOpacity: settings.setAsciiOpacity,
    fontFamily: settings.fontFamily,       setFontFamily: settings.setFontFamily,
    totalChars: renderer.totalChars,       handleTotalCharsChange: renderer.handleTotalCharsChange,
    recentColors: settings.recentColors,   setRecentColors: settings.setRecentColors,
    isWebcam: media.mediaType === 'webcam',
    startWebcam: media.startWebcam,
    stopWebcam,
    mediaUrlInput: media.mediaUrlInput,    setMediaUrlInput: media.setMediaUrlInput,
    fetchMediaUrl: media.fetchMediaUrl,
    isFetchingUrl: media.isFetchingUrl,
    fetchError: media.fetchError,
  };

  const viewerProps = {
    asciiOutput: renderer.asciiOutput,
    coloredAscii: settings.coloredAscii,
    mediaType: media.mediaType,
    previewCanvasRef: renderer.previewCanvasRef,
    zoom: viewport.zoom,           setZoom: viewport.setZoom,
    pan: viewport.pan,             setPan: viewport.setPan,
    isDragging: viewport.isDragging,
    activeTool: viewport.activeTool, setActiveTool: viewport.setActiveTool,
    handleWheel: viewport.handleWheel,
    handleMouseDown: viewport.handleMouseDown,
    handleMouseMove: viewport.handleMouseMove,
    handleMouseUp: viewport.handleMouseUp,
    asciiColor: settings.asciiColor,
    asciiOpacity: settings.asciiOpacity,
    fontFamily: settings.fontFamily,
  };

  const bottomPanelProps = {
    isPlaying: playback.isPlaying,
    togglePlay: playback.togglePlay,
    currentTime: playback.currentTime,
    duration: playback.duration,
    handleSeek,
    playbackSpeed: playback.playbackSpeed,
    handleSpeedChange: playback.handleSpeedChange,
    isVisible: playback.isPanelVisible,
    onClose: () => playback.setIsPanelVisible(false),
    onOpen:  () => playback.setIsPanelVisible(true),
    height: playback.panelHeight,
    setHeight: playback.setPanelHeight,
    trimRegion: playback.trimRegion,
    onSaveTrim: playback.handleSaveTrim,
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <>
      <Analytics />
      <Layout
        sidebar={<Sidebar {...sidebarProps} />}
        viewer={<AsciiViewer {...viewerProps} />}
        bottomPanel={media.mediaType === 'video' && <BottomPanel {...bottomPanelProps} />}
        shortcutsDropdown={
          <div className="relative">
            <div
              onClick={() => setIsShortcutsOpen(!isShortcutsOpen)}
              className="px-2.5 py-0.5 rounded-sm cursor-pointer transition-colors text-gray-300 hover:bg-blender-hover hover:text-white"
            >
              Window
            </div>
            <ShortcutsDropdown
              isOpen={isShortcutsOpen}
              setIsOpen={setIsShortcutsOpen}
            />
          </div>
        }
        exportDropdown={
          <ExportDropdown
            asciiOutput={renderer.asciiOutput}
            coloredAscii={settings.coloredAscii}
            mediaSourceRef={mediaSourceRef}
            getActiveAsciiString={settings.getActiveAsciiString}
            renderOpts={settings.renderOpts}
            duration={playback.duration}
            trimRegion={playback.trimRegion}
            zoom={viewport.zoom}
            pan={viewport.pan}
            activeTool={viewport.activeTool}
            asciiColor={settings.asciiColor}
            asciiOpacity={settings.asciiOpacity}
          />
        }
        onHelpClick={() => setIsHelpOpen(true)}
      />
      <MediaSource
        ref={mediaSourceRef}
        onMediaReady={handleMediaReady}
        onFetchError={media.handleFetchError}
      />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
}

export default App;
