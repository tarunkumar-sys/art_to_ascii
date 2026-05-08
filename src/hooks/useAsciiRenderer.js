import { useState, useRef, useCallback, useEffect } from 'react';
import {
  convertToGrayScales,
  drawVideoAscii,
  convertImageToAscii,
} from '../utils/ascii-engine';

/**
 * useAsciiRenderer
 * ─────────────────────────────────────────────────────────────────────
 * Core rendering pipeline: converts images / video frames into ASCII
 * output using the settings provided by useRenderSettings.
 *
 * Owns the animation-frame loop and the internal canvas ref used for
 * pixel extraction.
 *
 * Parameters
 * ──────────
 * @param {React.RefObject} mediaSourceRef — ref to <MediaSource>
 * @param {object}          settings       — from useRenderSettings()
 * @param {object}          playback       — from usePlayback()
 */
export default function useAsciiRenderer(mediaSourceRef, settings, playback) {
  const {
    resolution,
    invertBrightness,
    brightness,
    contrast,
    coloredAscii,
    aspectRatioCorrection,
    fontFamily,
    renderOpts,
    getActiveAsciiString,
  } = settings;

  const { isPlaying, setCurrentTime } = playback;

  // ── Internal state ──────────────────────────────────────────────────
  const [asciiOutput, setAsciiOutput] = useState('');
  const [totalChars, setTotalChars]   = useState(0);

  const previewCanvasRef = useRef(null);
  const mediaAspectRef   = useRef(1);
  const reqRef           = useRef();

  // ── Single-frame render ─────────────────────────────────────────────
  const renderFrame = useCallback(() => {
    const { videoElement, imageElement, activeType } = mediaSourceRef.current || {};
    if (!previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const asciiStr = getActiveAsciiString();

    if (activeType === 'image' && imageElement) {
      const w = Math.floor(60 + resolution * 60);
      const aspect = imageElement.naturalHeight / imageElement.naturalWidth;
      mediaAspectRef.current = aspect;
      let h = Math.round(w * aspect);
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
  }, [
    resolution, getActiveAsciiString, invertBrightness, brightness,
    contrast, renderOpts, fontFamily, coloredAscii, aspectRatioCorrection,
    mediaSourceRef, setCurrentTime,
  ]);

  // ── Animation-frame loop ────────────────────────────────────────────
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
  }, [renderFrame, mediaSourceRef]);

  // ── Start / stop loop based on playback state ───────────────────────
  const mediaType = mediaSourceRef.current?.activeType || '';

  useEffect(() => {
    if (isPlaying || mediaType === 'image') {
      reqRef.current = requestAnimationFrame(processLoop);
    } else {
      cancelAnimationFrame(reqRef.current);
    }
    return () => cancelAnimationFrame(reqRef.current);
  }, [isPlaying, mediaType, processLoop]);

  // ── Total-chars ↔ resolution sync ───────────────────────────────────
  const handleTotalCharsChange = useCallback((newTotal) => {
    const aspect = mediaAspectRef.current || 1;
    const corr = aspectRatioCorrection ? 2 : 1;
    const targetW = Math.sqrt(newTotal / (aspect * corr));
    const newRes = (targetW - 60) / 60;
    settings.setResolution(Math.max(0.5, Math.min(3, newRes)));
    setTotalChars(newTotal);
  }, [aspectRatioCorrection, settings]);

  return {
    asciiOutput,
    totalChars,
    handleTotalCharsChange,
    previewCanvasRef,
    mediaAspectRef,
    renderFrame,
  };
}
