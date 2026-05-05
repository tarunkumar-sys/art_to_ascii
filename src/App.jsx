import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from './components/Layout';
import Sidebar from './components/Sidebar';
import AsciiViewer from './components/AsciiViewer';
import HelpModal from './components/HelpModal';
import BottomPanel from './components/BottomPanel';
import ExportDropdown from './components/ExportDropdown';
import MediaSource from './components/MediaSource';
import ShortcutsDropdown from './components/ShortcutsDropdown';
import { HelpCircle } from 'lucide-react';
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
  const [aspectRatioCorrection, setAspectRatioCorrection]  = useState(false);
  const [asciiColor,            setAsciiColor]             = useState('#ffffff');
  const [asciiOpacity,          setAsciiOpacity]           = useState(100);
  const [fontFamily,            setFontFamily]             = useState('monospace');
  const [totalChars,            setTotalChars]             = useState(0);
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

  // ── Trim region (saved from BottomPanel trim tool) ────────────────────────
  const [trimRegion, setTrimRegion] = useState(null); // { startTime, endTime }

  const handleSaveTrim = useCallback(({ startTime, endTime }) => {
    setTrimRegion({ startTime, endTime });
    console.log('[Trim] Saved region:', { startTime, endTime });
  }, []);

  // ── Viewport ─────────────────────────────────────────────────────────────
  const [zoom,       setZoom]       = useState(1);
  const [pan,        setPan]        = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart,  setDragStart]  = useState({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState('move');

  // ── Modal ────────────────────────────────────────────────────────────────
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const mediaSourceRef   = useRef(null);
  const previewCanvasRef = useRef(null);
  const mediaAspectRef   = useRef(1);
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
    fontFamily,
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
      const w = Math.floor(60 + resolution * 60);
      // Correct for original image aspect ratio
      const aspect = imageElement.naturalHeight / imageElement.naturalWidth;
      mediaAspectRef.current = aspect;
      let h = Math.round(w * aspect);
      // Further correct for monospace character aspect (height approx 2x width)
      if (aspectRatioCorrection) h = Math.round(h * 2);
      
      const result = convertImageToAscii(imageElement, asciiStr, w, h, renderOpts);
      setAsciiOutput(result);
      setTotalChars(w * h);
    } else if ((activeType === 'video' || activeType === 'webcam') && videoElement) {
      const multiplier = 4 - resolution;
      const baseWidth = Math.floor(window.innerWidth / 4 / multiplier);
      const width = Math.min(baseWidth, 250); 
      
      const vW = videoElement.videoWidth || 1;
      const vH = videoElement.videoHeight || 1;
      const aspect = vH / vW;
      mediaAspectRef.current = aspect;
      
      let height = Math.round(width * aspect);
      // Further correct for monospace character aspect (height approx 2x width)
      const processHeight = aspectRatioCorrection ? Math.round(height * 2) : height;

      if (!width || !processHeight || isNaN(width) || isNaN(processHeight)) return;

      canvas.width = width;
      canvas.height = processHeight;
      ctx.drawImage(videoElement, 0, 0, width, processHeight);

      if (coloredAscii) {
        const imageData = ctx.getImageData(0, 0, width, processHeight);
        const asciiText = drawVideoAscii(imageData.data, width, asciiStr, true);
        setAsciiOutput(asciiText);
      } else {
        const grayScales = convertToGrayScales(ctx, width, processHeight, {
          invertBrightness,
          brightness,
          contrast,
        });
        const asciiText = drawVideoAscii(grayScales, width, asciiStr, false);
        setAsciiOutput(asciiText);
      }
      setTotalChars(width * processHeight);
      
      if (activeType === 'video') setCurrentTime(videoElement.currentTime);
    }
  }, [resolution, getActiveAsciiString, invertBrightness, brightness, contrast, renderOpts, fontFamily]);

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
  const handleMediaReady = useCallback((type, url) => {
    setMediaType(type);
    setMediaUrl(url);
    setFetchError('');
    setIsFetchingUrl(false);
    
    // Explicitly trigger a render for images or start the loop for video
    if (type === 'image') {
      setTimeout(renderFrame, 50);
      setIsPlaying(false);
      setIsPanelVisible(false);
    } else if (type === 'video' || type === 'webcam') {
      const video = mediaSourceRef.current?.videoElement;
      if (video) {
        setDuration(video.duration || 0);
        setIsPlaying(type === 'webcam');
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
      setFetchError('');
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

  const handleTotalCharsChange = (newTotal) => {
    const aspect = mediaAspectRef.current || 1;
    const corr = aspectRatioCorrection ? 2 : 1;
    // For images, resolution maps to width: w = 60 + resolution * 60
    // Total = w * h = w * (w * aspect * corr)
    // w = sqrt(Total / (aspect * corr))
    const targetW = Math.sqrt(newTotal / (aspect * corr));
    const newRes = (targetW - 60) / 60;
    
    // Clamp between 0.5 and 3 to stay within existing UI limits
    setResolution(Math.max(0.5, Math.min(3, newRes)));
    setTotalChars(newTotal);
  };

  // ── Static Video Preview ──────────────────────────────────────────────────
  useEffect(() => {
    if (mediaType === 'video' && mediaUrl) {
      const tempVideo = document.createElement('video');
      tempVideo.crossOrigin = 'anonymous';
      tempVideo.src = mediaUrl;
      tempVideo.muted = true;
      
      const handleFirstFrame = () => {
        if (!previewCanvasRef.current) return;
        const canvas = previewCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const asciiStr = getActiveAsciiString();
        
        const multiplier = 4 - resolution;
        const baseWidth = Math.floor(window.innerWidth / 4 / multiplier);
        const width = Math.min(baseWidth, 250);
        
        const vW = tempVideo.videoWidth || 1;
        const vH = tempVideo.videoHeight || 1;
        const aspect = vH / vW;
        
        const height = Math.round(width * aspect);
        const processHeight = aspectRatioCorrection ? Math.round(height * 2) : height;

        canvas.width = width;
        canvas.height = processHeight;
        ctx.drawImage(tempVideo, 0, 0, width, processHeight);

        if (coloredAscii) {
          const imageData = ctx.getImageData(0, 0, width, processHeight);
          const asciiText = drawVideoAscii(imageData.data, width, asciiStr, true);
          setAsciiOutput(asciiText);
        } else {
          const grayScales = convertToGrayScales(ctx, width, processHeight, {
            invertBrightness, brightness, contrast
          });
          const asciiText = drawVideoAscii(grayScales, width, asciiStr, false);
          setAsciiOutput(asciiText);
        }
      };

      tempVideo.onloadeddata = () => {
        tempVideo.currentTime = 0.01;
      };
      tempVideo.onseeked = handleFirstFrame;

      return () => {
        tempVideo.onloadeddata = null;
        tempVideo.onseeked = null;
        tempVideo.src = '';
      };
    }
  }, [mediaUrl, mediaType, resolution, getActiveAsciiString, coloredAscii, aspectRatioCorrection, invertBrightness, brightness, contrast, fontFamily]);

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

  // ── Keyboard Shortcuts ───────────────────────────────────────────────────
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
          setZoom(1);
          setPan({ x: 0, y: 0 });
          break;
        case '+':
        case '=':
          setZoom(z => Math.min(5, z + 0.1));
          break;
        case '-':
        case '_':
          setZoom(z => Math.max(0.1, z - 0.1));
          break;
        case 'm':
          setActiveTool('move');
          break;
        case 'z':
          setActiveTool('zoom');
          break;
        case 'i':
          setInvertBrightness(v => !v);
          break;
        case 'c':
          setColoredAscii(v => !v);
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
          setResolution(r => Math.max(0.5, r - 0.1));
          break;
        case ']':
          setResolution(r => Math.min(3, r + 0.1));
          break;
        case '?':
          setIsShortcutsOpen(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, duration, togglePlay, handleSeek]);

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
    videoRef: { current: null }, // Sidebar will manage its own preview ref if needed
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
    fontFamily, setFontFamily,
    totalChars, handleTotalCharsChange,
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
    asciiColor, asciiOpacity, fontFamily,
  };

  const bottomPanelProps = {
    isPlaying, togglePlay, currentTime, duration, handleSeek,
    playbackSpeed, handleSpeedChange,
    isVisible: isPanelVisible,
    onClose: () => setIsPanelVisible(false),
    onOpen:  () => setIsPanelVisible(true),
    height: panelHeight, setHeight: setPanelHeight,
    // Trim
    trimRegion,
    onSaveTrim: handleSaveTrim,
  };

  return (
    <>
      <Layout
        sidebar={<Sidebar {...sidebarProps} />}
        viewer={<AsciiViewer {...viewerProps} />}
        bottomPanel={mediaType === 'video' && <BottomPanel {...bottomPanelProps} />}
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
            asciiOutput={asciiOutput}
            coloredAscii={coloredAscii}
            mediaSourceRef={mediaSourceRef}
            getActiveAsciiString={getActiveAsciiString}
            renderOpts={renderOpts}
            duration={duration}
            trimRegion={trimRegion}
            zoom={zoom}
            pan={pan}
            activeTool={activeTool}
            asciiColor={asciiColor}
            asciiOpacity={asciiOpacity}
          />
        }
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

