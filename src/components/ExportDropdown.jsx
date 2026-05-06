import React, { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { convertToGrayScales, drawVideoAscii } from '../utils/ascii-engine';

// Dynamic GIF.js loader
const loadGifJs = () => new Promise((resolve, reject) => {
  if (window.GIF) return resolve(window.GIF);
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
  script.onload = () => resolve(window.GIF);
  script.onerror = reject;
  document.head.appendChild(script);
});

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Renders every frame of a video segment (start→end) as ASCII text drawn on a
 * canvas, then encodes via MediaRecorder into a WebM/MP4-compatible Blob.
 *
 * @param {HTMLVideoElement} videoEl  – source video element
 * @param {Object}           opts    – { startTime, endTime, asciiStr, renderOpts, fps, fontPx }
 * @param {function}         onProgress – (0..1)
 * @param {function}         isCancelled – returns true if cancelled
 * @returns {Promise<Blob>}
 */
async function renderAsciiVideo(videoEl, opts, onProgress, isCancelled) {
  const {
    startTime = 0,
    endTime,
    asciiStr,
    renderOpts = {},
    fps = 24,
    fontPx = 9,
    fontFamily = 'monospace',
    coloredAscii = false,
    invertBrightness = false,
    brightness = 1,
    contrast = 1,
    exportBgColor = '#111111',
    exportTransparent = false,
  } = opts;

  const duration = endTime - startTime;
  const totalFrames = Math.ceil(duration * fps);

  // ── Size off-screen sample canvas from video ──────────────────────────────
  const sampleW = Math.min(160, videoEl.videoWidth || 160);
  const sampleH = Math.round(sampleW * ((videoEl.videoHeight || 90) / (videoEl.videoWidth || 160)));
  const charW = sampleW;
  const charH = sampleH;

  // ── Output canvas ──────────────────────────────────────────────────────────
  const outCanvas = document.createElement('canvas');
  const outCtx = outCanvas.getContext('2d');
  const charSpacingX = fontPx * 0.6;
  const charSpacingY = fontPx + 2;
  outCanvas.width = Math.ceil(charW * charSpacingX);
  outCanvas.height = Math.ceil(charH * charSpacingY);
  outCtx.font = `${fontPx}px ${fontFamily}`;
  outCtx.textBaseline = 'top';

  const clearCanvas = () => {
    if (exportTransparent) {
      outCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
    } else {
      outCtx.fillStyle = exportBgColor;
      outCtx.fillRect(0, 0, outCanvas.width, outCanvas.height);
    }
  };

  // ── Sample canvas ──────────────────────────────────────────────────────────
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = charW;
  sampleCanvas.height = charH;
  const sampleCtx = sampleCanvas.getContext('2d');

  // Phase 1: Scanning frames
  const frameData = [];
  for (let f = 0; f < totalFrames; f++) {
    const t = startTime + (f / fps);
    videoEl.currentTime = t;
    await new Promise(resolve => {
      const onSeeked = () => {
        videoEl.removeEventListener('seeked', onSeeked);
        sampleCtx.drawImage(videoEl, 0, 0, charW, charH);
        frameData.push(sampleCtx.getImageData(0, 0, charW, charH));
        resolve();
      };
      videoEl.addEventListener('seeked', onSeeked);
    });
    onProgress?.((f + 1) / (totalFrames * 2), `Scanning frames ${f + 1}/${totalFrames}…`);
    if (isCancelled?.()) throw new Error('CANCELLED');
    await new Promise(r => setTimeout(r, 0));
  }

  // ── MediaRecorder setup ───────────────────────────────────────────────────
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';
  const stream = outCanvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

  return new Promise(async (resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.start();

    const encodeStartTime = Date.now();

    // Phase 2: Encoding
    for (let f = 0; f < totalFrames; f++) {
      const imgData = frameData[f];
      
      // Clear output canvas
      clearCanvas();

      if (coloredAscii) {
        const d = imgData.data;
        const asciiLen = asciiStr.length - 1;
        for (let row = 0; row < charH; row++) {
          for (let col = 0; col < charW; col++) {
            const idx = (row * charW + col) * 4;
            const r = d[idx], g = d[idx + 1], b = d[idx + 2];
            const gray = 0.334 * r + 0.333 * g + 0.333 * b;
            const ch = asciiStr[Math.round((gray / 255) * asciiLen)] || ' ';
            outCtx.fillStyle = `rgb(${r},${g},${b})`;
            outCtx.fillText(ch, col * charSpacingX, row * charSpacingY);
          }
        }
      } else {
        sampleCtx.putImageData(imgData, 0, 0);
        const grayScales = convertToGrayScales(sampleCtx, charW, charH, {
          invertBrightness, brightness, contrast,
        });
        const asciiLen = asciiStr.length - 1;
        outCtx.fillStyle = '#ccc';
        for (let i = 0; i < grayScales.length; i++) {
          const row = Math.floor(i / charW);
          const col = i % charW;
          const ch = asciiStr[Math.round((grayScales[i] / 255) * asciiLen)] || ' ';
          outCtx.fillText(ch, col * charSpacingX, row * charSpacingY);
        }
      }

      // ETA Logic
      let etaLabel = '';
      if (f >= 5) {
        const msElapsed = Date.now() - encodeStartTime;
        const msPerFrame = msElapsed / (f + 1);
        const remainingFrames = totalFrames - (f + 1);
        const eta = Math.round((remainingFrames * msPerFrame) / 1000);
        etaLabel = ` (ETA: ~${eta}s)`;
      }

      onProgress?.(0.5 + (f + 1) / (totalFrames * 2), `Encoding ${f + 1}/${totalFrames}…${etaLabel}`);
      if (isCancelled?.()) throw new Error('CANCELLED');
      await new Promise(r => setTimeout(r, 0));
    }

    recorder.stop();
  });
}

/**
 * GIF export using gif.js
 */
async function renderAsciiGif(videoEl, opts, onProgress, isCancelled) {
  const {
    startTime = 0,
    endTime,
    asciiStr,
    renderOpts = {},
    fps = 12,
    fontPx = 9,
    fontFamily = 'monospace',
    coloredAscii = false,
    invertBrightness = false,
    brightness = 1,
    contrast = 1,
    exportBgColor = '#111111',
    exportTransparent = false,
  } = opts;

  const GIF = await loadGifJs();
  const duration = endTime - startTime;
  const totalFrames = Math.ceil(duration * fps);

  // Size logic
  const sampleW = Math.min(120, videoEl.videoWidth || 120);
  const sampleH = Math.round(sampleW * ((videoEl.videoHeight || 90) / (videoEl.videoWidth || 120)));
  
  const outCanvas = document.createElement('canvas');
  const charSpacingX = fontPx * 0.6;
  const charSpacingY = fontPx + 2;
  outCanvas.width = Math.ceil(sampleW * charSpacingX);
  outCanvas.height = Math.ceil(sampleH * charSpacingY);
  const outCtx = outCanvas.getContext('2d');
  outCtx.font = `${fontPx}px ${fontFamily}`;
  outCtx.textBaseline = 'top';

  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = sampleW;
  sampleCanvas.height = sampleH;
  const sampleCtx = sampleCanvas.getContext('2d');

  // Phase 1: Scanning
  const frameData = [];
  for (let f = 0; f < totalFrames; f++) {
    videoEl.currentTime = startTime + (f / fps);
    await new Promise(r => {
      const onSeeked = () => {
        videoEl.removeEventListener('seeked', onSeeked);
        sampleCtx.drawImage(videoEl, 0, 0, sampleW, sampleH);
        frameData.push(sampleCtx.getImageData(0, 0, sampleW, sampleH));
        r();
      };
      videoEl.addEventListener('seeked', onSeeked);
    });
    onProgress?.((f + 1) / (totalFrames * 2), `Scanning frames ${f + 1}/${totalFrames}…`);
    if (isCancelled?.()) throw new Error('CANCELLED');
  }

  // Phase 2: Encoding
  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: outCanvas.width,
    height: outCanvas.height,
    workerScript: '/api/gifWorker',
    transparent: exportTransparent ? 0x00000000 : null
  });

  const encodeStartTime = Date.now();
  
  for (let f = 0; f < totalFrames; f++) {
    if (exportTransparent) {
      outCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
    } else {
      outCtx.fillStyle = exportBgColor;
      outCtx.fillRect(0, 0, outCanvas.width, outCanvas.height);
    }

    const imgData = frameData[f];
    const d = imgData.data;
    const asciiLen = asciiStr.length - 1;

    if (coloredAscii) {
      for (let row = 0; row < sampleH; row++) {
        for (let col = 0; col < sampleW; col++) {
          const idx = (row * sampleW + col) * 4;
          const r = d[idx], g = d[idx + 1], b = d[idx + 2];
          const gray = 0.334 * r + 0.333 * g + 0.333 * b;
          const ch = asciiStr[Math.round((gray / 255) * asciiLen)] || ' ';
          outCtx.fillStyle = `rgb(${r},${g},${b})`;
          outCtx.fillText(ch, col * charSpacingX, row * charSpacingY);
        }
      }
    } else {
      sampleCtx.putImageData(imgData, 0, 0);
      const grayScales = convertToGrayScales(sampleCtx, sampleW, sampleH, { invertBrightness, brightness, contrast });
      outCtx.fillStyle = '#ccc';
      for (let i = 0; i < grayScales.length; i++) {
        const row = Math.floor(i / sampleW);
        const col = i % sampleW;
        const ch = asciiStr[Math.round((grayScales[i] / 255) * asciiLen)] || ' ';
        outCtx.fillText(ch, col * charSpacingX, row * charSpacingY);
      }
    }

    // Use ImageData as requested
    gif.addFrame(outCtx.getImageData(0, 0, outCanvas.width, outCanvas.height), { delay: 1000 / fps });

    // ETA logic
    let etaLabel = '';
    if (f >= 5) {
      const msElapsed = Date.now() - encodeStartTime;
      const msPerFrame = msElapsed / (f + 1);
      const remainingFrames = totalFrames - (f + 1);
      const eta = Math.round((remainingFrames * msPerFrame) / 1000);
      etaLabel = ` (ETA: ~${eta}s)`;
    }

    onProgress?.(0.5 + (f + 1) / (totalFrames * 2), `Encoding GIF ${f + 1}/${totalFrames}…${etaLabel}`);
    
    if (isCancelled?.()) throw new Error('CANCELLED');
    if (f % 5 === 0) await new Promise(r => setTimeout(r, 0));
  }

  return new Promise((resolve) => {
    gif.on('finished', (blob) => resolve(blob));
    gif.render();
  });
}

// ─── component ───────────────────────────────────────────────────────────────
const ExportDropdown = ({
  asciiOutput,
  coloredAscii,
  mediaSourceRef,
  getActiveAsciiString,
  renderOpts,
  duration,
  trimRegion,
  zoom = 1,
  pan = { x: 0, y: 0 },
  activeTool = 'move',
  asciiColor = '#ffffff',
  asciiOpacity = 100,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [encoding, setEncoding] = useState(null); // null | 'full' | 'trim' | 'gif'
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [exportFps, setExportFps] = useState(24);
  const [exportBgColor, setExportBgColor] = useState('#1c1c1c');
  const [exportTransparent, setExportTransparent] = useState(false);
  const dropdownRef = useRef(null);
  const cancelRef = useRef(false);

  // Lock screen scroll when encoding
  useEffect(() => {
    if (encoding) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [encoding]);

  const handleProgress = (p, label) => {
    setProgress(p);
    if (label) setProgressLabel(label);
  };

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── static exports ─────────────────────────────────────────────────────────

  const uploadExportToCloudinary = (fileOrBlob, filename, base64 = null) => {
    const formData = new FormData();
    if (base64) {
      formData.append('base64', base64);
    } else {
      formData.append('file', fileOrBlob, filename);
    }
    fetch('/api/uploadMedia', { method: 'POST', body: formData })
      .catch(err => console.error('[Cloudinary] Export save error:', err));
  };

  const downloadText = () => {
    const blob = new Blob([asciiOutput], { type: 'text/plain;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'ascii-art.txt' });
    a.click();
    uploadExportToCloudinary(blob, 'ascii-art.txt');
  };

  const downloadImage = (format = 'png') => {
    if (!asciiOutput) return;
    const lines = asciiOutput.split('\n');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontSize = 12;
    const fontFamily = renderOpts?.fontFamily || 'monospace';
    
    // Character dimensions for monospace
    ctx.font = `${fontSize}px ${fontFamily}`;
    const charW = ctx.measureText('M').width;
    const charH = fontSize + 2;

    let maxCols = 0;
    if (coloredAscii) {
      const tempDiv = document.createElement('div');
      lines.forEach(line => {
        tempDiv.innerHTML = line;
        const count = tempDiv.querySelectorAll('span').length;
        if (count > maxCols) maxCols = count;
      });
    } else {
      for (const l of lines) { if (l.length > maxCols) maxCols = l.length; }
    }

    canvas.width = maxCols * charW + 40;
    canvas.height = lines.length * charH + 40;
    
    if (exportTransparent && format === 'png') {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = exportBgColor; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    ctx.font = `${fontSize}px ${fontFamily}`; 
    ctx.textBaseline = 'top';

    if (coloredAscii) {
      const tempDiv = document.createElement('div');
      lines.forEach((lineHtml, i) => {
        tempDiv.innerHTML = lineHtml;
        const spans = tempDiv.querySelectorAll('span');
        spans.forEach((span, j) => {
          ctx.fillStyle = span.style.color || '#cccccc';
          ctx.fillText(span.textContent, 20 + j * charW, 20 + i * charH);
        });
      });
    } else {
      ctx.fillStyle = asciiColor;
      ctx.globalAlpha = asciiOpacity / 100;
      lines.forEach((l, i) => ctx.fillText(l, 20, 20 + i * charH));
      ctx.globalAlpha = 1.0;
    }

    const mimeMap = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
    const mime = mimeMap[format] ?? 'image/png';
    const dataUrl = format === 'jpg'
      ? canvas.toDataURL('image/jpeg', 0.92)
      : canvas.toDataURL(mime);
    const a = Object.assign(document.createElement('a'), {
      download: `ascii-art.${format}`,
      href: dataUrl,
    });
    a.click();
    uploadExportToCloudinary(null, null, dataUrl);
  };

  const captureViewport = () => {
    if (!asciiOutput) return;
    
    // Find the viewport element
    const viewport = document.querySelector('.flex-1.relative.overflow-hidden.bg-\\[\\#1c1c1c\\]');
    if (!viewport) return;
    
    const rect = viewport.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d');
    
    // 1. Draw background
    ctx.fillStyle = '#1c1c1c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 2. Draw grid (optional, but makes it look like viewport)
    const gridSize = 20 * zoom;
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for (let x = pan.x % gridSize; x < canvas.width; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = pan.y % gridSize; y < canvas.height; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // 3. Draw ASCII content
    const fontSize = 6 * zoom; // Match the text-[6px] in AsciiViewer
    const charW = (fontSize * 0.6); // Approximate monospace width
    const charH = fontSize * 0.5; // Match leading-[0.5]
    
    const lines = asciiOutput.split('\n');
    const fontFamilyStr = renderOpts?.fontFamily || 'monospace';
    ctx.font = `${fontSize}px ${fontFamilyStr}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    // Calculate center position matching CSS: translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px)
    const centerX = canvas.width / 2 + pan.x;
    const centerY = canvas.height / 2 + pan.y;
    
    // Draw the "shadow-2xl bg-black/80 p-6 rounded-lg" container
    // We need to estimate its size
    let maxCols = 0;
    if (coloredAscii) {
      const tempDiv = document.createElement('div');
      lines.forEach(line => {
        tempDiv.innerHTML = line;
        const count = tempDiv.querySelectorAll('span').length;
        if (count > maxCols) maxCols = count;
      });
    } else {
      for (const l of lines) { if (l.length > maxCols) maxCols = l.length; }
    }
    
    const artW = maxCols * charW;
    const artH = lines.length * charH;
    const padding = 24 * zoom; // p-6 = 1.5rem = 24px
    
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 20 * zoom;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(centerX - artW/2 - padding, centerY - artH/2 - padding, artW + padding*2, artH + padding*2, 8 * zoom);
    ctx.fill();
    ctx.shadowBlur = 0; // Reset shadow

    // Draw lines
    if (coloredAscii) {
      const tempDiv = document.createElement('div');
      lines.forEach((lineHtml, i) => {
        tempDiv.innerHTML = lineHtml;
        const spans = tempDiv.querySelectorAll('span');
        const y = centerY - artH/2 + i * charH;
        spans.forEach((span, j) => {
          const x = centerX - artW/2 + j * charW + charW/2;
          ctx.fillStyle = span.style.color || '#cccccc';
          ctx.fillText(span.textContent, x, y);
        });
      });
    } else {
      ctx.fillStyle = asciiColor;
      ctx.globalAlpha = asciiOpacity / 100;
      lines.forEach((line, i) => {
        const y = centerY - artH/2 + i * charH;
        for (let j = 0; j < line.length; j++) {
           const x = centerX - artW/2 + j * charW + charW/2;
           ctx.fillText(line[j], x, y);
        }
      });
      ctx.globalAlpha = 1.0;
    }

    const a = Object.assign(document.createElement('a'), {
      download: `viewport-snapshot.png`,
      href: canvas.toDataURL('image/png'),
    });
    a.click();
    uploadExportToCloudinary(null, null, canvas.toDataURL('image/png'));
  };

  const getImageSizeEstimate = () => {
    if (!asciiOutput) return '0 KB';
    const lines = asciiOutput.split('\n');
    const fontSize = 12;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${fontSize}px ${renderOpts?.fontFamily || 'monospace'}`;
    let maxW = 0;
    for (const l of lines) { const w = ctx.measureText(l).width; if (w > maxW) maxW = w; }
    const w = maxW + 40;
    const h = lines.length * (fontSize + 2) + 40;
    const bytes = (w * h * 4);
    const mb = bytes / (1024 * 1024);
    if (mb < 0.1) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${mb.toFixed(1)} MB`;
  };

  // ── SVG export ──────────────────────────────────────────────────────────────

  const downloadSVG = () => {
    if (!asciiOutput) return;

    // Typography constants (must mirror the canvas render in downloadImage)
    const fontSize   = 12;
    const charSpacingX = fontSize * 0.6; // monospace em ≈ 0.6× font-size
    const lineH      = fontSize + 2;     // line height
    const padX       = 20;
    const padY       = 20;
    const bg         = exportTransparent ? 'none' : exportBgColor;
    const defaultFill = '#cccccc';

    const svgParts = [];

    if (coloredAscii) {
      // ── Colored mode: parse HTML spans produced by the ascii-engine ──────────
      // Each row in asciiOutput is a string of <span style="color:rgb(r,g,b)">ch</span>
      // We use a temporary div + DOM to extract colors + chars reliably.
      const tempDiv = document.createElement('div');
      const rows = asciiOutput.split('\n');
      let cols = 0;

      rows.forEach((rowHtml, rowIdx) => {
        tempDiv.innerHTML = rowHtml;
        const spans = tempDiv.querySelectorAll('span');
        if (spans.length > cols) cols = spans.length;

        spans.forEach((span, colIdx) => {
          const ch = span.textContent;
          if (!ch || ch === ' ') return; // skip spaces → smaller file
          // Extract fill from style="color:rgb(...)"
          const fill = span.style.color || defaultFill;
          const x = (padX + colIdx * charSpacingX).toFixed(2);
          const y = (padY + rowIdx * lineH).toFixed(2);
          // Escape SVG special chars
          const safe = ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : ch === '"' ? '&quot;' : ch;
          svgParts.push(`<text x="${x}" y="${y}" fill="${fill}">${safe}</text>`);
        });
      });

      const svgW = (padX * 2 + cols * charSpacingX).toFixed(0);
      const svgH = (padY * 2 + rows.length * lineH).toFixed(0);

      const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}"
     font-family="monospace" font-size="${fontSize}" dominant-baseline="hanging">`,
        `  <rect width="100%" height="100%" fill="${bg}"/>`,
        ...svgParts,
        '</svg>',
      ].join('\n');

      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const a = Object.assign(document.createElement('a'), { download: 'ascii-art.svg', href: URL.createObjectURL(blob) });
      a.click();
      uploadExportToCloudinary(blob, 'ascii-art.svg');
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);

    } else {
      // ── Plain text mode: one <text> per character ─────────────────────────
      const rows = asciiOutput.split('\n');
      let cols = 0;

      rows.forEach((line, rowIdx) => {
        if (line.length > cols) cols = line.length;
        for (let colIdx = 0; colIdx < line.length; colIdx++) {
          const ch = line[colIdx];
          if (!ch || ch === ' ') continue; // skip spaces
          const x = (padX + colIdx * charSpacingX).toFixed(2);
          const y = (padY + rowIdx * lineH).toFixed(2);
          const safe = ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : ch === '"' ? '&quot;' : ch;
          svgParts.push(`<text x="${x}" y="${y}">${safe}</text>`);
        }
      });

      const svgW = (padX * 2 + cols * charSpacingX).toFixed(0);
      const svgH = (padY * 2 + rows.length * lineH).toFixed(0);

      const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}"
     font-family="monospace" font-size="${fontSize}" fill="${defaultFill}" dominant-baseline="hanging">`,
        `  <rect width="100%" height="100%" fill="${bg}"/>`,
        ...svgParts,
        '</svg>',
      ].join('\n');

      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const a = Object.assign(document.createElement('a'), { download: 'ascii-art.svg', href: URL.createObjectURL(blob) });
      a.click();
      uploadExportToCloudinary(blob, 'ascii-art.svg');
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }
  };

  const copyToClipboard = () => navigator.clipboard.writeText(asciiOutput);
  const copyAsHTML = () => {
    if (!asciiOutput) return;
    const style = `background:${exportBgColor}; color:#ccc; font-family:monospace; font-size:6px; line-height:0.5; padding:20px; white-space:pre; display:inline-block;`;
    const snippet = `<pre style="${style}">${asciiOutput}</pre>`;
    navigator.clipboard.writeText(snippet);
  };
  // ── video exports ──────────────────────────────────────────────────────────

  const startVideoExport = async (mode) => {
    const videoEl = mediaSourceRef?.current?.videoElement;
    if (!videoEl || !getActiveAsciiString) return;

    const wasPlaying = !videoEl.paused;
    videoEl.pause();

    const startTime = mode === 'trim' && trimRegion ? trimRegion.startTime : 0;
    const endTime = mode === 'trim' && trimRegion ? trimRegion.endTime : (duration || videoEl.duration);

    setEncoding(mode);
    setProgress(0);
    setIsOpen(false);
    cancelRef.current = false;

    try {
      let blob;
      const opts = {
        startTime,
        endTime,
        asciiStr: getActiveAsciiString(),
        coloredAscii: renderOpts?.coloredAscii ?? false,
        invertBrightness: renderOpts?.invertBrightness ?? false,
        brightness: renderOpts?.brightness ?? 1,
        contrast: renderOpts?.contrast ?? 1,
        fontFamily: renderOpts?.fontFamily ?? 'monospace',
        fps: exportFps,
        fontPx: 9,
        exportBgColor,
        exportTransparent,
      };

      if (mode === 'gif') {
        blob = await renderAsciiGif(videoEl, opts, handleProgress, () => cancelRef.current);
      } else {
        blob = await renderAsciiVideo(videoEl, opts, handleProgress, () => cancelRef.current);
      }

      if (cancelRef.current) return;

      const url = URL.createObjectURL(blob);
      const ext = mode === 'gif' ? 'gif' : 'webm';
      const name = mode === 'trim' ? `ascii-trim.${ext}` : `ascii-export.${ext}`;
      const a = Object.assign(document.createElement('a'), { href: url, download: name });
      a.click();
      uploadExportToCloudinary(blob, name);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      if (err.message === 'CANCELLED') {
        console.log('Export cancelled by user');
      } else {
        console.error('Video export failed:', err);
        alert('Video export failed: ' + err.message);
      }
    } finally {
      setEncoding(null);
      setProgress(0);
      cancelRef.current = false;
      if (wasPlaying) videoEl.play();
    }
  };

  // ── design tokens ──────────────────────────────────────────────────────────

  const S = {
    panel: { 
      background: '#282828', 
      border: '1px solid #181818', 
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)', 
      fontFamily: 'Inter, system-ui, sans-serif' 
    },
    header: { 
      background: '#3d3d3d', 
      borderBottom: '1px solid #181818', 
      padding: '6px 10px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between' 
    },
    sectionLbl: { 
      padding: '10px 12px 4px', 
      fontSize: 9, 
      fontWeight: 600, 
      letterSpacing: '0.05em', 
      textTransform: 'uppercase', 
      color: '#777', 
      userSelect: 'none' 
    },
    divider: { height: 1, background: '#181818', margin: '4px 0' },
    item: { 
      display: 'flex', 
      alignItems: 'center', 
      gap: 8, 
      width: '100%', 
      padding: '4px 10px 4px 12px', 
      background: 'none', 
      border: 'none', 
      cursor: 'pointer', 
      textAlign: 'left', 
      position: 'relative', 
      transition: 'background 0.05s' 
    },
    badge: { 
      fontSize: 9, 
      fontFamily: 'monospace', 
      padding: '0px 4px', 
      borderRadius: 2, 
      border: '1px solid #333', 
      background: '#1d1d1d', 
      color: '#666', 
      flexShrink: 0 
    },
    iconBox: { 
      width: 14, 
      height: 14, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      flexShrink: 0, 
      color: '#a3a3a3' 
    },
  };

  // ── icon components (inline SVG to avoid imports) ──────────────────────────
  const Ic = {
    txt:   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>,
    img:   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
    svg:   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
    vid:   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="2" y="7" width="15" height="10" rx="2"/><polygon points="22 7 17 10 17 14 22 17 22 7"/></svg>,
    trim:  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>,
    copy:  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
    md:    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    cam:   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  };

  // ── item row ───────────────────────────────────────────────────────────────
  const Row = ({ icon, label, badge, onClick, disabled = false }) => {
    const [hov, setHov] = React.useState(false);
    return (
      <button
        onClick={() => { if (!disabled) { onClick(); setIsOpen(false); } }}
        disabled={disabled}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          ...S.item,
          background: hov && !disabled ? '#4b7091' : 'transparent',
          opacity: disabled ? 0.3 : 1,
          cursor: disabled ? 'default' : 'pointer',
        }}
      >
        <span style={{ ...S.iconBox, color: hov && !disabled ? '#fff' : '#a3a3a3' }}>
          {icon}
        </span>
        <span style={{ flex: 1, fontSize: 11, color: hov && !disabled ? '#fff' : '#d0d0d0' }}>
          {label}
        </span>
        {badge && (
          <span style={{
            ...S.badge,
            background: hov && !disabled ? 'rgba(0,0,0,0.2)' : '#1d1d1d',
            borderColor: hov && !disabled ? 'transparent' : '#333',
            color: hov && !disabled ? '#fff' : '#666',
          }}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  const Sep = ({ label }) => (
    <div style={S.sectionLbl}>{label}</div>
  );

  const hasVideo = !!mediaSourceRef?.current?.videoElement && duration > 0;
  const hasTrim = !!trimRegion;
  const isEncoding = !!encoding;

  return (
    <div className="relative" ref={dropdownRef}>

      {/* ── Encoding overlay ── */}
      {isEncoding && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div style={{ ...S.panel, padding: 0, minWidth: 260, overflow: 'hidden', borderRadius: 4 }}>
            {/* overlay header */}
            <div style={{ ...S.header, gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4b7091' }} />
              <span style={{ fontSize: 11, color: '#eee', flex: 1, fontWeight: 500 }}>
                {encoding === 'trim' ? 'Rendering Trim' : 'Rendering Video'}
              </span>
              <span style={{ fontSize: 10, color: '#aaa', fontFamily: 'monospace' }}>{Math.round(progress * 100)}%</span>
            </div>
            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#bbb' }}>{progressLabel || 'Processing…'}</span>
              </div>
              <div style={{ height: 4, background: '#181818', borderRadius: 1, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#4b7091', width: `${Math.round(progress * 100)}%`, transition: 'width 0.1s' }} />
              </div>
            </div>

            {/* Cancel button at bottom center */}
            <div style={{ padding: '0 14px 14px', display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => { cancelRef.current = true; }}
                style={{
                  background: '#3d3d3d',
                  border: '1px solid #444',
                  color: '#ccc',
                  fontSize: 10,
                  padding: '4px 12px',
                  borderRadius: 3,
                  cursor: 'pointer',
                  transition: 'all 0.1s',
                }}
                onMouseEnter={(e) => { e.target.style.background = '#4a4a4a'; e.target.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.target.style.background = '#3d3d3d'; e.target.style.color = '#ccc'; }}
              >
                Cancel Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Trigger ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isEncoding}
        className={`px-2.5 py-0.5 text-gray-300 hover:text-white hover:bg-blender-hover rounded-sm transition-colors
          ${isEncoding ? 'opacity-40 cursor-wait' : 'cursor-pointer'}`}
      >
        {isEncoding
          ? <span className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" />Encoding…</span>
          : 'Export'}
      </button>

      {/* ── Panel ── */}
      {isOpen && (
        <div style={{ 
          position: 'absolute', 
          left: 0, 
          top: 'calc(100% + 4px)', 
          width: 210, 
          zIndex: 100, 
          ...S.panel, 
          paddingBottom: 4,
          borderRadius: 3
        }}>

          {/* Header bar */}
          <div style={S.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#eee" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span style={{ fontSize: 10, color: '#eee', fontWeight: 600 }}>EXPORT</span>
            </div>
          </div>

          {/* ── Settings ── */}
          <Sep label="Export Settings" />
          <div style={{ padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* BG Color */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 9, color: '#666', fontWeight: 600 }}>BACKGROUND</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input 
                  type="color" 
                  value={exportBgColor} 
                  onChange={e => setExportBgColor(e.target.value)}
                  style={{ width: 14, height: 14, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                />
                <button 
                  onClick={() => setExportTransparent(!exportTransparent)}
                  style={{ 
                    fontSize: 8, 
                    padding: '1px 3px', 
                    borderRadius: 2, 
                    border: '1px solid #444',
                    background: exportTransparent ? '#4b7091' : 'transparent',
                    color: exportTransparent ? '#fff' : '#666'
                  }}
                >
                  ALPHA
                </button>
              </div>
            </div>
            
            {/* FPS Selector */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 9, color: '#666', fontWeight: 600 }}>FPS</span>
              <div style={{ display: 'flex', gap: 2 }}>
                {[12, 24, 30].map(f => (
                  <button
                    key={f}
                    onClick={(e) => { e.stopPropagation(); setExportFps(f); }}
                    style={{
                      padding: '1px 5px',
                      fontSize: 9,
                      borderRadius: 1,
                      background: exportFps === f ? '#4b7091' : '#333',
                      color: exportFps === f ? '#fff' : '#999',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={S.divider} />

          {/* ── Static formats ── */}
          <Sep label={`Format (~${getImageSizeEstimate()})`} />
          <Row icon={Ic.cam} label="Viewport Snapshot" badge=".png" onClick={captureViewport} />
          <Row icon={Ic.txt} label="Plain Text"   badge=".txt"  onClick={downloadText} />
          <Row icon={Ic.img} label="Image — PNG"  badge=".png"  onClick={() => downloadImage('png')} />
          <Row icon={Ic.img} label="Image — JPEG" badge=".jpg"  onClick={() => downloadImage('jpg')} />
          <Row icon={Ic.svg} label="Vector — SVG" badge=".svg"  onClick={downloadSVG} />

          <div style={S.divider} />

          {/* ── ASCII Video ── */}
          <Sep label="Video & Animation" />
          
          <Row
            icon={Ic.vid}
            label="Full Video"
            badge={hasVideo ? '.webm' : undefined}
            disabled={!hasVideo}
            onClick={() => startVideoExport('full')}
          />
          <Row
            icon={Ic.vid}
            label="Animated GIF"
            badge={hasVideo ? '.gif' : undefined}
            disabled={!hasVideo}
            onClick={() => startVideoExport('gif')}
          />
          <Row
            icon={Ic.trim}
            label={hasTrim ? `Trimmed (${trimRegion.startTime.toFixed(1)}s)` : 'Trim Segment'}
            badge={hasTrim ? '.webm' : undefined}
            disabled={!hasTrim || !hasVideo}
            onClick={() => startVideoExport('trim')}
          />

          <div style={S.divider} />

          {/* ── Clipboard ── */}
          <Sep label="Clipboard" />
          <Row icon={Ic.copy} label="Copy Raw Text"    onClick={() => { copyToClipboard(); setIsOpen(false); }} />
          <Row icon={Ic.md}   label="Copy as Markdown" onClick={() => { copyMarkdown();    setIsOpen(false); }} />
          <Row icon={Ic.md}   label="Copy HTML Snippet" onClick={() => { copyAsHTML(); setIsOpen(false); }} />

        </div>
      )}
    </div>
  );
};

export default ExportDropdown;