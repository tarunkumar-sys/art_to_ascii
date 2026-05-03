import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from './components/Layout';
import Sidebar from './components/Sidebar';
import AsciiViewer from './components/AsciiViewer';
import HelpModal from './components/HelpModal';
import BottomPanel from './components/BottomPanel';
import ExportDropdown from './components/ExportDropdown';
import MediaSource from './components/MediaSource';
import {
  DEFAULT_ASCII,
  convertToGrayScales,
  drawVideoAscii,
  convertImageToAscii,
} from './utils/ascii-engine';

function App() {
  // ── Media state ──────────────────────────────────────────────────────────
  const [mediaType,  setMediaType]  = useState('');   // 'image' | 'video' | 'webcam'
  const [mediaUrl,   setMediaUrl]   = useState('');

  // ── Render: character settings ───────────────────────────────────────────
  const [asciiMode,   setAsciiMode]   = useState('custom');
  const [customChars, setCustomChars] = useState(DEFAULT_ASCII);
  const [resolution,  setResolution]  = useState(2);

  // ── Render: new visual options ───────────────────────────────────────────
  const [invertBrightness,      setInvertBrightness]      = useState(false);
  const [coloredAscii,          setColoredAscii]           = useState(false);
  const [edgeDetection,         setEdgeDetection]          = useState(false);
  const [edgeThreshold,         setEdgeThreshold]          = useState(0.3);
  const [brightness,            setBrightness]             = useState(1.0);
  const [contrast,              setContrast]               = useState(1.0);
  const [aspectRatioCorrection, setAspectRatioCorrection]  = useState(true);
  const [asciiColor,            setAsciiColor]             = useState('#ffffff');
  const [asciiOpacity,          setAsciiOpacity]           = useState(100);
  const [recentColors,          setRecentColors]           = useState(['#ffffff', '#000000']);

  // ── Source: URL fetch ────────────────────────────────────────────────────
  const [mediaUrlInput,  setMediaUrlInput]  = useState('');
  const [isFetchingUrl,  setIsFetchingUrl]  = useState(false);
  const [fetchError,     setFetchError]     = useState('');

  // ── Video playback ───────────────────────────────────────────────────────
  const [isPlaying,      setIsPlaying]      = useState(false);
  const [currentTime,    setCurrentTime]    = useState(0);
  const [duration,       setDuration]       = useState(0);
  const [playbackSpeed,  setPlaybackSpeed]  = useState(1);

  // ── Output ───────────────────────────────────────────────────────────────
  const [asciiOutput, setAsciiOutput] = useState('');

  // ── Panel state ──────────────────────────────────────────────────────────
  const [panelHeight,    setPanelHeight]    = useState(110);
  const [isPanelVisible, setIsPanelVisible] = useState(false);

  // ── Viewport ─────────────────────────────────────────────────────────────
  const [zoom,       setZoom]       = useState(1);
  const [pan,        setPan]        = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart,  setDragStart]  = useState({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState('move');

  // ── Modal ────────────────────────────────────────────────────────────────
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const mediaSourceRef   = useRef(null);
  const previewCanvasRef = useRef(null);
  const reqRef           = useRef();

  // ── Render option bundle (passed to ascii-engine) ────────────────────────
  const renderOpts = {
    invertBrightness,
    brightness,
    contrast,
    edgeDetection,
    edgeThreshold,
    coloredAscii,
    aspectRatioCorrection,
  };

  // ── Active ASCII string ──────────────────────────────────────────────────
  const getActiveAsciiString = useCallback(() => {
    if (asciiMode === 'balanced') return '$@08GCLft1i;:.,:;i1tfLCG0 ';
    if (asciiMode === 'dark')     return '$@08;:.,:;i1tfLCG0 ';
    return customChars || DEFAULT_ASCII;
  }, [asciiMode, customChars]);

  // ── Processing Logic ─────────────────────────────────────────────────────
  const renderFrame = useCallback(() => {
    const { videoElement, imageElement, activeType } = mediaSourceRef.current || {};
    if (!previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const asciiStr = getActiveAsciiString();

    if (activeType === 'image' && imageElement) {
      const w = Math.floor(80 + resolution * 80);
      // Double the target height if aspect correction is on, 
      // because the engine will scale it by 0.5 to fit monospace chars.
      const h = aspectRatioCorrection ? w * 2 : w; 
      const result = convertImageToAscii(imageElement, asciiStr, w, h, renderOpts);
      setAsciiOutput(result);
    } else if ((activeType === 'video' || activeType === 'webcam') && videoElement) {
      const multiplier = 4 - resolution;
      const baseWidth = Math.floor(window.innerWidth / 3 / multiplier);
      const width = Math.min(baseWidth, 200); 
      let height = Math.round((videoElement.videoHeight / videoElement.videoWidth) * width) || 80;
      
      // Similarly for video, if correction is on, we need more "rows" of characters 
      // to maintain the visual aspect ratio.
      const processHeight = aspectRatioCorrection ? height * 2 : height;

      if (!width || !height || isNaN(width) || isNaN(height)) return;

      canvas.width = width;
      canvas.height = processHeight;
      ctx.drawImage(videoElement, 0, 0, width, processHeight);

      const grayScales = convertToGrayScales(ctx, width, processHeight, {
        invertBrightness,
        brightness,
        contrast,
      });
      const asciiText = drawVideoAscii(grayScales, width, asciiStr);
      setAsciiOutput(asciiText);
      
      if (activeType === 'video') setCurrentTime(videoElement.currentTime);
    }
  }, [resolution, getActiveAsciiString, invertBrightness, brightness, contrast, renderOpts]);

  const processLoop = useCallback(() => {
    const type = mediaSourceRef.current?.activeType;
    if (type === 'video' || type === 'webcam') {
      const video = mediaSourceRef.current.videoElement;
      if (video && (type === 'webcam' || (!video.paused && !video.ended))) {
        renderFrame();
      }
      reqRef.current = requestAnimationFrame(processLoop);
    } else if (type === 'image') {
      renderFrame();
    }
  }, [renderFrame]);

  // ── Media Callbacks ──────────────────────────────────────────────────────
  const handleMediaReady = useCallback((type) => {
    setMediaType(type);
    setFetchError('');
    setIsFetchingUrl(false);
    
    // Explicitly trigger a render for images or start the loop for video
    if (type === 'image') {
      // Delay slightly to ensure image is truly ready for canvas drawing
      setTimeout(renderFrame, 50);
      setIsPlaying(false);
      setIsPanelVisible(false);
    } else if (type === 'video' || type === 'webcam') {
      const video = mediaSourceRef.current?.videoElement;
      if (video) {
        setDuration(video.duration || 0);
        setIsPlaying(true);
        setIsPanelVisible(type === 'video');
      }
    }
  }, [renderFrame]);

  const handleFetchError = useCallback((err) => {
    setFetchError(err);
    setIsFetchingUrl(false);
    setMediaType('');
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target?.files?.[0] || e.dataTransfer?.files?.[0];
    if (file) {
      mediaSourceRef.current?.loadFromFile(file);
    }
  };

  const fetchMediaUrl = () => {
    if (!mediaUrlInput.trim()) return;
    setIsFetchingUrl(true);
    setFetchError('');
    mediaSourceRef.current?.loadFromUrl(mediaUrlInput.trim());
  };

  const startWebcam = () => mediaSourceRef.current?.startWebcam();
  const stopWebcam = () => {
    mediaSourceRef.current?.stopWebcam();
    setMediaType('');
    setIsPlaying(false);
  };

  useEffect(() => {
    if (isPlaying || mediaType === 'image') {
      reqRef.current = requestAnimationFrame(processLoop);
    } else {
      cancelAnimationFrame(reqRef.current);
    }
    return () => cancelAnimationFrame(reqRef.current);
  }, [isPlaying, mediaType, processLoop]);

  // ── Playback helpers ─────────────────────────────────────────────────────
  const togglePlay = () => {
    const video = mediaSourceRef.current?.videoElement;
    if (video) {
      if (isPlaying) video.pause();
      else video.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (time) => {
    const video = mediaSourceRef.current?.videoElement;
    if (video) {
      video.currentTime = time;
      setCurrentTime(time);
      if (!isPlaying) renderFrame();
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    const video = mediaSourceRef.current?.videoElement;
    if (video) video.playbackRate = speed;
  };

  // ── Viewport Helpers ─────────────────────────────────────────────────────
  const handleWheel = (e) => {
    e.preventDefault();
    setZoom(z => Math.max(0.1, Math.min(5, z - e.deltaY * 0.0005)));
  };

  const handleMouseDown = (e) => {
    if ((e.button === 0 && activeTool === 'move') || e.button === 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  // ── Props ────────────────────────────────────────────────────────────────
  const sidebarProps = {
    mediaUrl, mediaType, 
    videoRef: { current: mediaSourceRef.current?.videoElement }, // For preview in Sidebar
    handleFileUpload,
    asciiMode, setAsciiMode,
    customChars, setCustomChars,
    resolution, setResolution,
    invertBrightness, setInvertBrightness,
    coloredAscii, setColoredAscii,
    edgeDetection, setEdgeDetection,
    edgeThreshold, setEdgeThreshold,
    brightness, setBrightness,
    contrast, setContrast,
    aspectRatioCorrection, setAspectRatioCorrection,
    asciiColor, setAsciiColor,
    asciiOpacity, setAsciiOpacity,
    recentColors, setRecentColors,
    isWebcam: mediaType === 'webcam',
    startWebcam, stopWebcam,
    mediaUrlInput, setMediaUrlInput,
    fetchMediaUrl, isFetchingUrl, fetchError,
  };

  const viewerProps = {
    asciiOutput, coloredAscii, mediaType, previewCanvasRef,
    zoom, setZoom, pan, setPan, isDragging,
    activeTool, setActiveTool,
    handleWheel, handleMouseDown, handleMouseMove, handleMouseUp,
    asciiColor, asciiOpacity,
  };

  const bottomPanelProps = {
    isPlaying, togglePlay, currentTime, duration, handleSeek,
    playbackSpeed, handleSpeedChange,
    isVisible: isPanelVisible,
    onClose: () => setIsPanelVisible(false),
    onOpen:  () => setIsPanelVisible(true),
    height: panelHeight, setHeight: setPanelHeight,
  };

  return (
    <>
      <Layout
        sidebar={<Sidebar {...sidebarProps} />}
        viewer={<AsciiViewer {...viewerProps} />}
        bottomPanel={mediaType === 'video' && <BottomPanel {...bottomPanelProps} />}
        exportDropdown={<ExportDropdown asciiOutput={asciiOutput} coloredAscii={coloredAscii} />}
        onHelpClick={() => setIsHelpOpen(true)}
      />
      <MediaSource 
        ref={mediaSourceRef} 
        onMediaReady={handleMediaReady}
        onFetchError={handleFetchError}
      />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
}

export default App;

