import React, { useState, useEffect, useRef } from 'react';
import { Pipette, X, GripHorizontal } from 'lucide-react';

const ColorPicker = ({ color, opacity, onChangeColor, onChangeOpacity, recentColors, onClose }) => {
  const [h, setH] = useState(0);
  const [s, setS] = useState(100);
  const [v, setV] = useState(100);
  const [hexInput, setHexInput] = useState(color.replace('#', ''));
  const [colorMode, setColorMode] = useState('HEX'); // HEX, RGB, HSL
  const [pos, setPos] = useState({ x: window.innerWidth - 520, y: 100 });
  const pickerRef = useRef(null);

  // Convert Hex to HSV on mount
  useEffect(() => {
    const hex = color.replace('#', '');
    setHexInput(hex);
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) { h = 0; } else {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    setH(h * 360);
    setS(s * 100);
    setV(v * 100);
  }, [color]);

  const hsvToRgb = (h, s, v) => {
    s /= 100; v /= 100;
    const i = Math.floor(h / 60);
    const f = h / 60 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r, g, b;
    switch (i % 6) {
      case 0: r = v, g = t, b = p; break;
      case 1: r = q, g = v, b = p; break;
      case 2: r = p, g = v, b = t; break;
      case 3: r = p, g = q, b = v; break;
      case 4: r = t, g = p, b = v; break;
      case 5: r = v, g = p, b = q; break;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  };

  const updateColor = (newH, newS, newV) => {
    const [r, g, b] = hsvToRgb(newH, newS, newV);
    const toHex = x => x.toString(16).padStart(2, '0');
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    onChangeColor(hex);
  };

  const handleDragMouseDown = (e) => {
    const startX = e.clientX - pos.x;
    const startY = e.clientY - pos.y;
    const move = (ev) => {
      setPos({ x: ev.clientX - startX, y: ev.clientY - startY });
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const handleSVMouseDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const move = (ev) => {
      const s = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
      const v = Math.max(0, Math.min(100, (1 - (ev.clientY - rect.top) / rect.height) * 100));
      setS(s); setV(v);
      updateColor(h, s, v);
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    move(e);
  };

  const handleHueMouseDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const move = (ev) => {
      const hue = Math.max(0, Math.min(360, ((ev.clientX - rect.left) / rect.width) * 360));
      setH(hue);
      updateColor(hue, s, v);
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    move(e);
  };

  const handleOpacityMouseDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const move = (ev) => {
      const op = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
      onChangeOpacity(Math.round(op));
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    move(e);
  };

  const [r, g, b] = hsvToRgb(h, s, v);

  return (
    <div
      ref={pickerRef}
      className="fixed w-[230px] bg-[#2c2c2c] rounded-lg shadow-2xl border border-[#1a1a1a] p-2 z-[1000] select-none"
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <div
            className="cursor-move active:cursor-grabbing p-1 -ml-1 text-gray-600 hover:text-gray-400 transition-colors"
            onMouseDown={handleDragMouseDown}
          >
            <GripHorizontal className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-bold text-white border-b-2 border-blender-active pb-0.5">Custom</span>
        </div>
        <div className="flex gap-1.5">
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div
        className="relative w-full aspect-[4/3] rounded-sm mb-1.5 cursor-crosshair overflow-hidden"
        style={{ background: `hsl(${h}, 100%, 50%)` }}
        onMouseDown={handleSVMouseDown}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        <div
          className="absolute w-3 h-3 border-2 border-white rounded-full shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${s}%`, top: `${100 - v}%` }}
        />
      </div>

      <div className="flex items-center gap-2 mb-1.5">
        <Pipette className="w-3.5 h-3.5 text-gray-400 rotate-90" />
        <div
          className="flex-1 h-2.5 rounded-full relative cursor-pointer"
          style={{ background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }}
          onMouseDown={handleHueMouseDown}
        >
          <div
            className="absolute w-3 h-3 bg-white border border-gray-300 rounded-full shadow -translate-x-1/2 -top-[1px] pointer-events-none"
            style={{ left: `${(h / 360) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div className="w-3.5 h-3.5 rounded-sm border border-gray-600 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAAXNSR0IArs4c6QAAACpJREFUGFdjZEACJmSAnYEJyP8PZIBkMIIEGIECmAAyEMkA0UAGIA0MAAD0HggH6w2YVAAAAABJRU5ErkJggg==')] bg-repeat" />
        <div
          className="flex-1 h-2.5 rounded-full relative cursor-pointer"
          style={{ background: `linear-gradient(to right, transparent, ${color})` }}
          onMouseDown={handleOpacityMouseDown}
        >
          <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAAXNSR0IArs4c6QAAACpJREFUGFdjZEACJmSAnYEJyP8PZIBkMIIEGIECmAAyEMkA0UAGIA0MAAD0HggH6w2YVAAAAABJRU5ErkJggg==')] bg-repeat rounded-full -z-10" />
          <div
            className="absolute w-3 h-3 bg-white border border-gray-300 rounded-full shadow -translate-x-1/2 -top-[1px] pointer-events-none"
            style={{ left: `${opacity}%` }}
          />
        </div>
      </div>

      <div className="flex gap-1.5 items-center">
        <button
          onClick={() => {
            const modes = ['HEX', 'RGB', 'HSL'];
            setColorMode(modes[(modes.indexOf(colorMode) + 1) % modes.length]);
          }}
          className="flex-[0.35] bg-[#1d1d1d] border border-[#111] rounded px-1 h-5 flex items-center justify-between hover:bg-[#2a2a2a] transition-colors"
        >
          <span className="text-[10px] text-gray-300 uppercase">{colorMode}</span>
        </button>
        <div className="flex-1 bg-[#1d1d1d] border border-[#111] rounded px-1.5 h-5 flex items-center overflow-hidden">
          {colorMode === 'HEX' && (
            <input
              type="text" value={hexInput}
              onChange={e => {
                setHexInput(e.target.value);
                if (e.target.value.length === 6) onChangeColor(`#${e.target.value}`);
              }}
              className="w-full bg-transparent text-[10px] text-white outline-none font-mono uppercase"
            />
          )}
          {colorMode === 'RGB' && (
            <span className="text-[10px] text-gray-300 font-mono">{r},{g},{b}</span>
          )}
          {colorMode === 'HSL' && (
            <span className="text-[10px] text-gray-300 font-mono">{Math.round(h)},{Math.round(s)}%,{Math.round(v)}%</span>
          )}
        </div>
        <div className="flex-[0.35] bg-[#1d1d1d] border border-[#111] rounded px-1 h-5 flex items-center gap-0.5">
          <input
            type="text" value={opacity}
            onChange={e => onChangeOpacity(Math.min(100, parseInt(e.target.value) || 0))}
            className="w-full bg-transparent text-[10px] text-white outline-none font-mono text-right"
          />
          <span className="text-[10px] text-gray-500">%</span>
        </div>
      </div>

      <div className="mt-2.5 border-t border-[#1a1a1a] pt-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-gray-400">History</span>
        </div>
        <div className="grid grid-cols-8 gap-1">
          {recentColors.map((c, i) => (
            <div
              key={`${c}-${i}`}
              onClick={() => onChangeColor(c)}
              className="w-5 h-5 rounded-sm cursor-pointer border border-black/20 hover:scale-110 transition-transform"
              style={{ background: c }}
            />
          ))}
          {recentColors.length === 0 && (
            <div className="col-span-8 text-[9px] text-gray-600 text-center py-0.5 italic">No colors used yet</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;
