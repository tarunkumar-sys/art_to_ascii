import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from './components/Layout';
import Sidebar from './components/Sidebar';
import AsciiViewer from './components/AsciiViewer';
import HelpModal from './components/HelpModal';
import { DEFAULT_ASCII, GRAY_RAMP_BALANCED, GRAY_RAMP_DARK, convertToGrayScales, drawVideoAscii } from './utils/ascii-engine';

function App() {
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaType, setMediaType] = useState(''); // 'image' or 'video'
  const [mediaUrl, setMediaUrl] = useState('');

  // Settings
  const [asciiMode, setAsciiMode] = useState('custom'); // custom, balanced, dark
  const [customChars, setCustomChars] = useState(DEFAULT_ASCII);
  const [resolution, setResolution] = useState(3); // 1 to 3 for video

  // Video Playback
  const [isPlaying, setIsPlaying] = useState(false);

  // Output
  const [asciiOutput, setAsciiOutput] = useState('');

  // Zoom/Pan for viewer
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState('move'); // 'pointer' or 'move'

  // Modal State
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const videoRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const reqRef = useRef();

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0] || e.dataTransfer?.files?.[0];
    if (!file) return;

    if (mediaUrl) URL.revokeObjectURL(mediaUrl);

    const url = URL.createObjectURL(file);
    setMediaUrl(url);
    setMediaFile(file);
    setAsciiOutput('');
    setIsPlaying(false);

    if (file.type.startsWith('video/')) {
      setMediaType('video');
    } else {
      setMediaType('image');
    }
  };

  const getActiveAsciiString = () => {
    if (asciiMode === 'balanced') return GRAY_RAMP_BALANCED;
    if (asciiMode === 'dark') return GRAY_RAMP_DARK;
    return customChars || DEFAULT_ASCII;
  };

  // Image processing
  const processImage = useCallback(() => {
    if (!mediaUrl || mediaType !== 'image') return;
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      // Setup display
      const w = 500;
      const h = 500;

      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");

      ctx.scale((w / img.width) * 0.5, (h / img.height) * 0.5);
      ctx.drawImage(img, 0, 0);

      const data = ctx.getImageData(0, 0, w, h).data;
      let asciiImage = "";

      const asciiStr = getActiveAsciiString();

      for (let i = 0; i < h >> 1; i++) {
        for (let j = 0; j < w >> 1; j++) {
          let off = (i * h + j) << 2;
          let r = data[off];
          let g = data[off + 1];
          let b = data[off + 2];

          let grayscale = (r + g + b) / 3.0;
          let index = Math.floor((grayscale / 255) * (asciiStr.length - 1));
          if (index >= asciiStr.length) index = asciiStr.length - 1;

          let char = asciiStr.charAt(index);
          asciiImage += char;
        }
        asciiImage += '\n';
      }
      setAsciiOutput(asciiImage);
    };
    img.src = mediaUrl;
  }, [mediaUrl, mediaType, asciiMode, customChars]);

  // Video processing loop
  const processVideoFrame = useCallback(() => {
    if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

    const video = videoRef.current;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');

    const multiplier = 4 - resolution;
    const baseWidth = Math.floor(window.innerWidth / 3 / multiplier);
    const width = Math.min(baseWidth, 150); // cap width to avoid crazy lag
    const horizontalWidth = (video.videoHeight / video.videoWidth) * width;
    const height = horizontalWidth;

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(video, 0, 0, width, height);
    const grayScales = convertToGrayScales(ctx, width, height);
    const asciiText = drawVideoAscii(grayScales, width, getActiveAsciiString());

    setAsciiOutput(asciiText);

    reqRef.current = requestAnimationFrame(processVideoFrame);
  }, [resolution, asciiMode, customChars]);

  useEffect(() => {
    if (mediaType === 'image') {
      processImage();
    }
  }, [mediaUrl, mediaType, processImage, asciiMode, customChars, resolution]);

  useEffect(() => {
    if (isPlaying && mediaType === 'video') {
      videoRef.current?.play();
      reqRef.current = requestAnimationFrame(processVideoFrame);
    } else if (mediaType === 'video') {
      videoRef.current?.pause();
      cancelAnimationFrame(reqRef.current);
    }
    return () => cancelAnimationFrame(reqRef.current);
  }, [isPlaying, mediaType, processVideoFrame]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  // Viewer Pan/Zoom
  const handleWheel = (e) => {
    e.preventDefault();
    setZoom(z => Math.max(0.1, Math.min(5, z - e.deltaY * 0.0005)));
  };

  const handleMouseDown = (e) => {
    // Left click only pans if Move tool is active. Middle click always pans.
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

  // Exports
  const downloadText = () => {
    const blob = new Blob([asciiOutput], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ascii-art.txt';
    link.click();
  };

  const downloadImage = () => {
    if (!asciiOutput) return;
    const lines = asciiOutput.split('\n');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const fontSize = 12;
    ctx.font = `${fontSize}px monospace`;

    let maxWidth = 0;
    for (let line of lines) {
      const metrics = ctx.measureText(line);
      if (metrics.width > maxWidth) maxWidth = metrics.width;
    }

    canvas.width = maxWidth + 40;
    canvas.height = (lines.length * (fontSize + 2)) + 40;

    ctx.fillStyle = '#1c1c1c'; // Match blender bg
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#cccccc'; // Match blender text
    ctx.textBaseline = 'top';
    lines.forEach((line, index) => {
      ctx.fillText(line, 20, 20 + (index * (fontSize + 2)));
    });

    const link = document.createElement('a');
    link.download = 'ascii-art.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const copyToClipboard = () => navigator.clipboard.writeText(asciiOutput);

  const copyEmbeddableCode = () => {
    const code = `\`\`\`text\n${asciiOutput}\n\`\`\``;
    navigator.clipboard.writeText(code);
    alert('Markdown code copied!');
  };

  // Build the props for components
  const sidebarProps = {
    mediaUrl, mediaType, videoRef, isPlaying, togglePlay, handleFileUpload,
    asciiMode, setAsciiMode, customChars, setCustomChars,
    resolution, setResolution,
    downloadText, downloadImage, copyToClipboard, copyEmbeddableCode
  };

  const viewerProps = {
    asciiOutput, mediaType, previewCanvasRef,
    zoom, setZoom, pan, setPan, isDragging,
    activeTool, setActiveTool,
    handleWheel, handleMouseDown, handleMouseMove, handleMouseUp
  };

  return (
    <>
      <Layout
        sidebar={<Sidebar {...sidebarProps} />}
        viewer={<AsciiViewer {...viewerProps} />}
        onHelpClick={() => setIsHelpOpen(true)}
      />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
}

export default App;
