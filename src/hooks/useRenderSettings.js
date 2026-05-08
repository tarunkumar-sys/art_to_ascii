import { useState, useCallback } from 'react';
import { DEFAULT_ASCII } from '../utils/ascii-engine';

/**
 * useRenderSettings
 * ─────────────────────────────────────────────────────────────────────
 * Manages all ASCII render configuration: character sets, brightness,
 * contrast, color, edge-detection, typography, and resolution.
 *
 * Returns a flat object of state + setters consumed by Sidebar & engine.
 */
export default function useRenderSettings() {
  // ── Character settings ──────────────────────────────────────────────
  const [asciiMode, setAsciiMode]     = useState('custom');
  const [customChars, setCustomChars] = useState(DEFAULT_ASCII);
  const [resolution, setResolution]   = useState(2);

  // ── Visual options ──────────────────────────────────────────────────
  const [invertBrightness, setInvertBrightness]           = useState(false);
  const [coloredAscii, setColoredAscii]                   = useState(false);
  const [edgeDetection, setEdgeDetection]                 = useState(false);
  const [edgeThreshold, setEdgeThreshold]                 = useState(0.3);
  const [brightness, setBrightness]                       = useState(1.0);
  const [contrast, setContrast]                           = useState(1.0);
  const [aspectRatioCorrection, setAspectRatioCorrection] = useState(false);

  // ── Typography / color ──────────────────────────────────────────────
  const [asciiColor, setAsciiColor]     = useState('#ffffff');
  const [asciiOpacity, setAsciiOpacity] = useState(100);
  const [fontFamily, setFontFamily]     = useState('monospace');
  const [recentColors, setRecentColors] = useState(['#ffffff', '#000000']);

  // ── Derived: active ASCII string ────────────────────────────────────
  const getActiveAsciiString = useCallback(() => {
    if (asciiMode === 'balanced') return '$@08GCLft1i;:.,:;i1tfLCG0 ';
    if (asciiMode === 'dark')     return '$@08;:.,:;i1tfLCG0 ';
    return customChars || DEFAULT_ASCII;
  }, [asciiMode, customChars]);

  // ── Derived: render-opts bundle (passed to ascii-engine) ────────────
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

  return {
    // Character settings
    asciiMode, setAsciiMode,
    customChars, setCustomChars,
    resolution, setResolution,

    // Visual options
    invertBrightness, setInvertBrightness,
    coloredAscii, setColoredAscii,
    edgeDetection, setEdgeDetection,
    edgeThreshold, setEdgeThreshold,
    brightness, setBrightness,
    contrast, setContrast,
    aspectRatioCorrection, setAspectRatioCorrection,

    // Typography / color
    asciiColor, setAsciiColor,
    asciiOpacity, setAsciiOpacity,
    fontFamily, setFontFamily,
    recentColors, setRecentColors,

    // Derived
    getActiveAsciiString,
    renderOpts,
  };
}
