import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera, Image as ImageIcon, FolderOpen,
  ChevronDown, ChevronRight, Plus, Minus, Link2,
  Webcam, Globe, Check, X, AlertCircle, Loader2,
  MousePointer2
} from 'lucide-react';
import { ASCII_PRESETS, DEFAULT_ASCII } from '../utils/ascii-engine';
import ColorPicker from './ColorPicker';

// ─── Design tokens (match exact Blender look) ─────────────────────────────────
// Row:    h-[22px], label 45% right-aligned gray-500, value fills rest
// Field:  bg-[#1d1d1d] border-[#111] rounded-[3px] text-[11px] text-gray-200
// Header: bg-[#1e1e1e] text-gray-300 text-[11px] font-bold, ▼/▶ indicator

// ─── Blender-style field atoms ────────────────────────────────────────────────

/** Draggable number input — matches Blender's "drag to adjust" fields */
const NumField = ({ value, onChange, min = 0, max = 10, step = 0.01, decimals = 3, unit = '' }) => {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startVal = useRef(value);
  const [editing, setEditing] = useState(false);
  const [editStr, setEditStr] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const beginDrag = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startVal.current = value;

    const onMove = (ev) => {
      if (!dragging.current) return;
      const delta = (ev.clientX - startX.current) * step;
      const next = Math.max(min, Math.min(max, startVal.current + delta));
      onChange(parseFloat(next.toFixed(decimals)));
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const pct = max !== min ? ((value - min) / (max - min)) * 100 : 0;

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={editStr}
        onChange={(e) => setEditStr(e.target.value)}
        onBlur={() => {
          const v = parseFloat(editStr);
          if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.target.blur();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="flex-1 h-[18px] bg-[#1d1d1d] border border-blender-active rounded-[2px] text-[10px] text-center text-blender-text outline-none font-mono px-1"
      />
    );
  }

  return (
    <div
      className="flex-1 h-[18px] bg-[#1d1d1d] border border-[#111] rounded-[2px] relative overflow-hidden cursor-ew-resize select-none hover:border-[#333] group"
      onMouseDown={beginDrag}
      onDoubleClick={() => { setEditStr(value.toFixed(decimals)); setEditing(true); }}
      title="Drag to adjust, double-click to type"
    >
      <div className="absolute left-0 top-0 bottom-0 bg-blender-active/10 pointer-events-none transition-all" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-gray-200 pointer-events-none">
        {value.toFixed(decimals)}{unit}
      </span>
    </div>
  );
};

/** Blender-style toggle field (full-width, like a check-button) */
const ToggleField = ({ value, onChange, label }) => (
  <button
    onClick={() => onChange(!value)}
    className={`flex-1 h-[18px] rounded-[2px] border text-[10px] font-bold px-2 text-left transition-colors ${value
      ? 'bg-blender-active/20 border-blender-active/50 text-blender-active'
      : 'bg-[#1d1d1d] border-[#111] text-gray-500 hover:border-[#333] hover:text-gray-300'
      }`}
  >
    {label}
  </button>
);

/** Blender-style select/dropdown */
const SelectField = ({ value, onChange, options }) => (
  <div className="flex-1 relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ fontFamily: value }}
      className="w-full h-[18px] bg-[#1d1d1d] border border-[#111] rounded-[2px] text-[10px] text-gray-200 px-1.5 outline-none cursor-pointer hover:border-[#333] appearance-none"
    >
      {options.map(o => (
        <option
          key={o.value || o}
          value={o.value || o}
          style={{ fontFamily: o.value || o }}
          className="bg-[#1d1d1d] text-gray-200"
        >
          {o.label || o}
        </option>
      ))}
    </select>
    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-gray-500 pointer-events-none">▾</span>
  </div>
);

/** Blender-style text input */
const TextField = ({ value, onChange, placeholder, className = '' }) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={`flex-1 h-[18px] bg-[#1d1d1d] border border-[#111] rounded-[2px] text-[10px] text-gray-200 px-1.5 outline-none hover:border-[#333] focus:border-blender-active/50 font-mono placeholder:text-gray-600 ${className}`}
  />
);

/** Standard property row — label right-aligned, control fills rest */
const PropRow = ({ label, children, tip, sub = false }) => (
  <div className={`flex items-center h-[22px] gap-1 px-2 ${sub ? 'pl-10' : ''}`} title={tip}>
    <span className="w-[44%] text-right text-[10px] text-gray-500 truncate shrink-0 pr-1">{label}</span>
    <div className="flex-1 min-w-0 flex items-center gap-1">{children}</div>
    <div className="w-3 shrink-0" /> {/* Keyframe dot placeholder */}
  </div>
);

/** Collapsible section panel — exact Blender style */
const Section = ({ title, children, defaultOpen = true, accent }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#111]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center h-[22px] px-2 gap-1.5 hover:bg-[#252525] transition-colors select-none"
        style={{ background: open ? '#1e1e1e' : '#1a1a1a' }}
      >
        <span className="text-[9px] text-gray-500 w-2.5">{open ? '▼' : '▶'}</span>
        {accent && <div className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />}
        <span className="text-[11px] font-bold text-gray-300">{title}</span>
      </button>
      {open && (
        <div className="bg-blender-panel py-0.5">
          {children}
        </div>
      )}
    </div>
  );
};

/** Separator line */
const Sep = () => <div className="mx-2 my-0.5 border-t border-[#111]" />;

// ─── Tab icon strip definition ─────────────────────────────────────────────────

const TABS = [
  { id: 'source', Icon: ImageIcon, label: 'Source Media' },
  { id: 'render', Icon: Camera, label: 'Render Properties' },
];

// ─── Main Sidebar component ───────────────────────────────────────────────────

const Sidebar = ({
  // media
  mediaUrl, mediaType, videoRef, handleFileUpload,
  // render settings
  asciiMode, setAsciiMode,
  customChars, setCustomChars,
  resolution, setResolution,
  // new render options
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
  // source
  isWebcam, startWebcam, stopWebcam,
  mediaUrlInput, setMediaUrlInput,
  fetchMediaUrl, isFetchingUrl, fetchError,
}) => {
  const [activeTab, setActiveTab] = useState('source');
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Custom preset management
  const [customPresets, setCustomPresets] = useState(() => {
    const saved = localStorage.getItem('ascii_presets');
    return saved ? JSON.parse(saved) : [];
  });
  const [newPresetName, setNewPresetName] = useState('');
  const [showAddPreset, setShowAddPreset] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('ascii_presets', JSON.stringify(customPresets));
  }, [customPresets]);

  const allPresets = [...ASCII_PRESETS, ...customPresets];

  const applyPreset = (preset) => {
    if (preset.chars !== undefined) setCustomChars(preset.chars);
    if (preset.mode) setAsciiMode(preset.mode);
    if (preset.brightness !== undefined) setBrightness(preset.brightness);
    if (preset.contrast !== undefined) setContrast(preset.contrast);
    if (preset.color) setAsciiColor(preset.color);
    if (preset.mode) setAsciiMode(preset.mode);
    else setAsciiMode('custom');
  };

  const addCustomPreset = () => {
    if (!newPresetName.trim()) return;
    const config = {
      name: newPresetName.trim(),
      chars: customChars,
      brightness,
      contrast,
      color: asciiColor,
      mode: asciiMode
    };
    setCustomPresets(p => [...p, config]);
    setNewPresetName('');
    setShowAddPreset(false);
  };

  const removeCustomPreset = (name) => {
    setCustomPresets(p => p.filter(x => x.name !== name));
  };

  return (
    <div className="flex h-full overflow-hidden bg-blender-panel select-none">

      {/* ── Vertical icon tab strip (exact Blender style) ── */}
      <div className="w-[34px] shrink-0 bg-[#1a1a1a] border-r border-[#111] flex flex-col items-center pt-1 gap-0.5">
        {TABS.map(({ id, Icon, label }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              title={label}
              className={`w-full flex items-center justify-center h-[28px] relative transition-colors ${active ? 'text-white' : 'text-[#555] hover:text-gray-400'
                }`}
              style={{ background: active ? '#2f2f2f' : 'transparent' }}
            >
              {/* Active left accent bar */}
              {active && (
                <div className="absolute left-0 top-[3px] bottom-[3px] w-[2px] bg-blender-accent rounded-r-full" />
              )}
              <Icon className="w-[14px] h-[14px]" />
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden text-[11px]">

        {/* ════════════════════════════════════════════
            RENDER TAB
        ════════════════════════════════════════════ */}
        {activeTab === 'render' && (
          <>
            {/* Tab label header (Blender style) */}
            <div className="flex items-center gap-2 h-[24px] px-2 bg-[#1e1e1e] border-b border-[#111]">
              <Camera className="w-3 h-3 text-blender-accent" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Render Properties</span>
            </div>

            {/* ── Sampling ── */}
            <Section title="Sampling" defaultOpen>
              <PropRow label="Mode">
                <SelectField
                  value={asciiMode}
                  onChange={setAsciiMode}
                  options={[
                    { value: 'custom', label: 'Custom' },
                    { value: 'balanced', label: 'Balanced' },
                    { value: 'dark', label: 'Dark' },
                  ]}
                />
              </PropRow>

              {asciiMode === 'custom' && (
                <PropRow label="Char Ramp" tip="Character ramp from dark to light">
                  <TextField
                    value={customChars}
                    onChange={setCustomChars}
                    placeholder="dark → light"
                  />
                </PropRow>
              )}

              <PropRow label="Font" tip="Choose the font family for ASCII output">
                <SelectField
                  value={fontFamily}
                  onChange={setFontFamily}
                  options={[
                    { value: 'monospace', label: 'Monospace' },
                    { value: '"Fira Code", monospace', label: 'Fira Code' },
                    { value: '"JetBrains Mono", monospace', label: 'JetBrains Mono' },
                    { value: '"Source Code Pro", monospace', label: 'Source Code Pro' },
                    { value: '"Roboto Mono", monospace', label: 'Roboto Mono' },
                    { value: 'Consolas, "Liberation Mono", monospace', label: 'Consolas' },
                    { value: '"Courier New", Courier, monospace', label: 'Courier New' },
                    { value: '"Lucida Console", Monaco, monospace', label: 'Lucida Console' },
                  ]}
                />
              </PropRow>
            </Section>

            {/* ── Character Presets ── */}
            <Section title="Character Presets">
              {/* Preset grid */}
              <div className="px-2 py-1 grid grid-cols-2 gap-[3px]">
                {allPresets.map((preset) => {
                  const isCustomUserPreset = customPresets.some(p => p.name === preset.name);
                  const isActive = customChars === preset.chars && asciiMode === 'custom';
                  return (
                    <div key={preset.name} className="relative group">
                      <button
                        onClick={() => applyPreset(preset)}
                        className={`w-full h-[22px] rounded-[2px] border text-left px-2 text-[9px] font-bold truncate transition-colors ${isActive
                          ? 'bg-blender-active/25 border-blender-active/60 text-blender-active'
                          : 'bg-[#1d1d1d] border-[#111] text-gray-500 hover:border-[#333] hover:text-gray-300'
                          }`}
                      >
                        {preset.name}
                      </button>
                      {isCustomUserPreset && (
                        <button
                          onClick={() => removeCustomPreset(preset.name)}
                          className="absolute right-0.5 top-0.5 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Ramp preview strip */}
              <div className="mx-2 mb-1 h-[8px] rounded-[2px] border border-[#111] overflow-hidden flex">
                {(customChars || DEFAULT_ASCII).split('').map((ch, i, arr) => {
                  const pct = i / (arr.length - 1);
                  const v = Math.round(pct * 200);
                  return (
                    <div
                      key={i}
                      className="flex-1"
                      style={{ background: `rgb(${v},${v},${v})` }}
                      title={ch}
                    />
                  );
                })}
              </div>

              {/* Save current as preset */}
              {showAddPreset ? (
                <div className="flex items-center gap-1 px-2 pb-1">
                  <TextField value={newPresetName} onChange={setNewPresetName} placeholder="Preset name…" />
                  <button onClick={addCustomPreset} className="h-[18px] w-[18px] flex items-center justify-center bg-blender-active/20 border border-blender-active/40 rounded-[2px] text-blender-active hover:bg-blender-active/30">
                    <Check className="w-2.5 h-2.5" />
                  </button>
                  <button onClick={() => setShowAddPreset(false)} className="h-[18px] w-[18px] flex items-center justify-center bg-[#1d1d1d] border border-[#111] rounded-[2px] text-gray-500 hover:text-red-400">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ) : (
                <div className="px-2 pb-1">
                  <button
                    onClick={() => setShowAddPreset(true)}
                    className="w-full h-[18px] flex items-center justify-center gap-1 bg-[#1d1d1d] border border-[#111] rounded-[2px] text-[9px] text-gray-600 hover:text-gray-300 hover:border-[#333] transition-colors"
                  >
                    <Plus className="w-2.5 h-2.5" /> Save Current as Preset
                  </button>
                </div>
              )}
            </Section>

            {/* ── Resolution ── */}
            <Section title="Dimensions">
              <PropRow label="Resolution" tip="Output character resolution scale">
                <NumField
                  value={resolution}
                  onChange={setResolution}
                  min={0.5} max={3} step={0.02} decimals={1} unit="x"
                />
              </PropRow>
              <PropRow label="Aspect Correct" tip="Correct for monospace character aspect ratio">
                <ToggleField
                  value={aspectRatioCorrection}
                  onChange={setAspectRatioCorrection}
                  label={aspectRatioCorrection ? 'Enabled' : 'Disabled'}
                />
              </PropRow>
            </Section>

            {/* ── Color ── */}
            <Section title="Color">
              <PropRow label="Colored Output" tip="Render ASCII characters in their source colors (HTML only)">
                <ToggleField
                  value={coloredAscii}
                  onChange={setColoredAscii}
                  label={coloredAscii ? 'ANSI Color' : 'Monochrome'}
                />
              </PropRow>
              <PropRow label="Invert" tip="Invert brightness mapping (dark ↔ light)">
                <ToggleField
                  value={invertBrightness}
                  onChange={setInvertBrightness}
                  label={invertBrightness ? 'Inverted' : 'Normal'}
                />
              </PropRow>
              <PropRow label="Fill" tip="Set custom color and opacity for ASCII">
                <div className="flex-1 flex gap-1 items-center">
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="flex-1 h-[18px] bg-[#1d1d1d] border border-[#111] rounded-[2px] flex items-center px-1.5 gap-2 hover:border-[#333] transition-colors group"
                  >
                    <div className="w-2.5 h-2.5 rounded-sm shadow-sm" style={{ background: asciiColor, opacity: asciiOpacity / 100 }} />
                    <span className="text-[10px] text-gray-300 font-mono uppercase group-hover:text-white">{asciiColor.replace('#', '')}</span>
                  </button>
                  <div className="w-[40%] h-[18px] bg-[#1d1d1d] border border-[#111] rounded-[2px] flex items-center justify-center text-[10px] text-gray-500 font-mono">
                    {asciiOpacity}%
                  </div>
                </div>
              </PropRow>
              {showColorPicker && (
                <ColorPicker
                  color={asciiColor}
                  opacity={asciiOpacity}
                  onChangeColor={(newColor) => {
                    setAsciiColor(newColor);
                    if (!recentColors.includes(newColor)) {
                      setRecentColors(prev => [newColor, ...prev.slice(0, 15)]);
                    }
                  }}
                  onChangeOpacity={setAsciiOpacity}
                  recentColors={recentColors}
                  onClose={() => setShowColorPicker(false)}
                />
              )}
            </Section>

            {/* ── Adjustments ── */}
            <Section title="Adjustments" defaultOpen={false}>
              <PropRow label="Total Chars" tip="Target character count (adjusts resolution)">
                <NumField
                  value={totalChars}
                  onChange={handleTotalCharsChange}
                  min={100} max={100000} step={100} decimals={0}
                />
              </PropRow>
              <PropRow label="Brightness" tip="Scale overall brightness (drag or double-click)">
                <NumField value={brightness} onChange={setBrightness} min={0} max={3} step={0.01} decimals={3} />
              </PropRow>
              <PropRow label="Contrast" tip="Adjust contrast of grayscale mapping">
                <NumField value={contrast} onChange={setContrast} min={0} max={4} step={0.01} decimals={3} />
              </PropRow>
              <Sep />
              <div className="flex items-center justify-end px-2 pb-0.5">
                <button
                  onClick={() => { setBrightness(1); setContrast(1); }}
                  className="text-[9px] text-gray-600 hover:text-blender-active transition-colors"
                >
                  Reset to Default
                </button>
              </div>
            </Section>

            {/* ── Effects ── */}
            <Section title="Effects" defaultOpen={false}>
              <PropRow label="Edge Detect" tip="Apply Sobel edge detection before ASCII mapping">
                <ToggleField
                  value={edgeDetection}
                  onChange={setEdgeDetection}
                  label={edgeDetection ? 'Enabled' : 'Disabled'}
                />
              </PropRow>
              {edgeDetection && (
                <PropRow label="Threshold" tip="Edge sensitivity threshold">
                  <NumField value={edgeThreshold} onChange={setEdgeThreshold} min={0} max={1} step={0.005} decimals={3} />
                </PropRow>
              )}
            </Section>
          </>
        )}

        {/* ════════════════════════════════════════════
            SOURCE TAB
        ════════════════════════════════════════════ */}
        {activeTab === 'source' && (
          <>
            <div className="flex items-center gap-2 h-[24px] px-2 bg-[#1e1e1e] border-b border-[#111]">
              <ImageIcon className="w-3 h-3 text-blender-accent" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Source Media</span>
            </div>

            {/* ── File Upload ── */}
            <Section title="File" defaultOpen>
              <div className="px-2 pb-2 pt-1">
                <label
                  className="flex items-center justify-center gap-2 w-full h-[54px] bg-[#1d1d1d] border border-[#222] rounded-[3px] cursor-pointer hover:border-blender-active/50 hover:bg-[#232323] transition-all group"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); handleFileUpload(e); }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,video/mp4,video/webm,video/mov"
                    onChange={handleFileUpload}
                  />
                  <FolderOpen className="w-4 h-4 text-blender-active group-hover:text-white transition-colors" />
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 group-hover:text-white uppercase tracking-wider">Open File</div>
                    <div className="text-[9px] text-gray-600">image · video · drop here</div>
                  </div>
                </label>
              </div>

              {/* Current file info */}
              {mediaUrl && mediaUrl !== 'webcam' && !isFetchingUrl && (
                <div className="px-2 pb-2 space-y-0">
                  <PropRow label="Type">
                    <span className="text-[10px] font-bold text-blender-active uppercase">{mediaType}</span>
                  </PropRow>
                </div>
              )}

              {/* Media preview */}
              {mediaUrl && mediaUrl !== 'webcam' && (
                <div className="mx-2 mb-2 border border-[#222] rounded-[3px] bg-black overflow-hidden">
                  <div className="aspect-video flex items-center justify-center">
                    {mediaType === 'video' ? (
                      <video ref={videoRef} src={mediaUrl} className="max-h-full max-w-full" loop muted playsInline />
                    ) : (
                      <img src={mediaUrl} className="max-h-full max-w-full object-contain" alt="Source" />
                    )}
                  </div>
                </div>
              )}
            </Section>

            {/* ── Webcam ── */}
            <Section title="Webcam" defaultOpen={false} accent={isWebcam ? '#4b89ea' : undefined}>
              <div className="px-2 py-2 space-y-2">
                {!isWebcam ? (
                  <button
                    onClick={startWebcam}
                    className="w-full h-[28px] flex items-center justify-center gap-2 bg-[#1d1d1d] border border-[#111] rounded-[3px] text-[10px] font-bold text-gray-400 hover:border-blender-active/50 hover:text-blender-active transition-all"
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Activate Webcam
                  </button>
                ) : (
                  <>
                    <div className="border border-[#222] rounded-[3px] bg-black overflow-hidden">
                      <div className="aspect-video flex items-center justify-center">
                        {/* We use a separate video element for preview to avoid DOM ref issues, 
                            the parent App handles the actual processing from its own ref */}
                        <video
                          ref={(el) => {
                            if (el && videoRef?.current?.srcObject) {
                              el.srcObject = videoRef.current.srcObject;
                            }
                          }}
                          autoPlay
                          muted
                          playsInline
                          className="max-h-full max-w-full"
                        />
                      </div>
                    </div>
                    <button
                      onClick={stopWebcam}
                      className="w-full h-[22px] flex items-center justify-center gap-1.5 bg-red-900/20 border border-red-800/40 rounded-[2px] text-[10px] font-bold text-red-400 hover:bg-red-900/30 transition-colors"
                    >
                      <X className="w-3 h-3" /> Stop Webcam
                    </button>
                  </>
                )}

                <div className="flex items-center gap-1.5 px-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${isWebcam ? 'bg-red-500 animate-pulse' : 'bg-gray-700'}`} />
                  <span className="text-[9px] text-gray-600">{isWebcam ? 'Live capture active' : 'Camera not active'}</span>
                </div>
              </div>
            </Section>

            {/* ── URL / Remote ── */}
            <Section title="URL / Remote" defaultOpen={false}>
              <div className="px-2 py-2 space-y-1.5">
                <div className="flex items-center gap-1">
                  <Globe className="w-3 h-3 text-gray-500 shrink-0" />
                  <span className="text-[9px] text-gray-500 uppercase font-bold">Media URL</span>
                </div>
                <div className="flex gap-1">
                  <input
                    type="url"
                    value={mediaUrlInput}
                    onChange={(e) => setMediaUrlInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') fetchMediaUrl(); }}
                    placeholder="https://…"
                    className="flex-1 h-[20px] bg-[#1d1d1d] border border-[#111] rounded-[2px] text-[10px] text-gray-200 px-1.5 outline-none hover:border-[#333] focus:border-blender-active/50 font-mono placeholder:text-gray-700"
                  />
                  <button
                    onClick={fetchMediaUrl}
                    disabled={isFetchingUrl || !mediaUrlInput.trim()}
                    className="h-[20px] px-2 bg-blender-active/20 border border-blender-active/40 rounded-[2px] text-[10px] font-bold text-blender-active hover:bg-blender-active/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    {isFetchingUrl ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : 'Fetch'}
                  </button>
                </div>
                {fetchError && (
                  <div className="flex items-center gap-1.5 text-[9px] text-red-400">
                    <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{fetchError}</span>
                  </div>
                )}
                <p className="text-[9px] text-gray-700 leading-tight pt-0.5">
                  Supports direct image & video URLs. Processed via backend CORS proxy.
                </p>
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
