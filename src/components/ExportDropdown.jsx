import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  ImageIcon,
  Clipboard,
  Code,
  Check,
  Share2
} from 'lucide-react';

const ExportDropdown = ({ asciiOutput }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

    ctx.fillStyle = '#1c1c1c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#cccccc';
    ctx.textBaseline = 'top';
    lines.forEach((line, index) => {
      ctx.fillText(line, 20, 20 + (index * (fontSize + 2)));
    });

    const link = document.createElement('a');
    link.download = 'ascii-art.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(asciiOutput);
  };

  const copyEmbeddableCode = () => {
    const code = `\`\`\`text\n${asciiOutput}\n\`\`\``;
    navigator.clipboard.writeText(code);
    alert('Markdown code copied!');
  };

  const SectionHeader = ({ label, active = true }) => (
    <div className="flex items-center gap-2 py-1 mb-1 border-b border-white/5">
      <div className={`w-2.5 h-2.5 rounded-[1px] flex items-center justify-center border ${active ? 'bg-blender-active border-blue-400/50' : 'bg-blender-input border-blender-border'
        }`}>
        {active && <Check className="w-2 h-2 text-white stroke-[3]" />}
      </div>
      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tight">{label}</span>
    </div>
  );

  const ActionButton = ({ label, icon: Icon, onClick, active = false }) => (
    <button
      onClick={() => {
        onClick();
        setIsOpen(false);
      }}
      className={`flex items-center gap-2 px-2 py-1 rounded-[2px] transition-colors text-left group ${active ? 'bg-blender-active text-white' : 'hover:bg-blender-hover text-gray-400 hover:text-gray-200'
        }`}
    >
      {Icon && <Icon className={`w-3 h-3 ${active ? 'text-white' : 'text-gray-500 group-hover:text-blender-active'}`} />}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button - Matched with other menu buttons */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-2.5 py-0.5 rounded-sm cursor-pointer transition-colors text-[11px] outline-none ${isOpen
            ? 'bg-blender-active text-white'
            : 'text-gray-300 hover:text-white hover:bg-blender-hover'
          }`}
      >
        Export
      </button>

      {/* Viewport Overlays Style Panel */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 bg-blender-panel border border-blender-border rounded-sm shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 origin-top-left">

          {/* Main Toggle Header (Gizmo style) */}
          <div className="px-3 py-2 bg-blender-header border-b border-blender-border flex items-center gap-2">
            <div className="w-3 h-3 bg-blender-active rounded-[2px] flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-white stroke-[4]" />
            </div>
            <span className="text-[11px] font-bold text-gray-200">Export Pipeline</span>
          </div>

          <div className="p-3 space-y-4">
            {/* Section: Objects style */}
            <section>
              <SectionHeader label="Files & Images" />
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2">
                <ActionButton label="As Text (.txt)" icon={FileText} onClick={downloadText} />
                <ActionButton label="As Image (.png)" icon={ImageIcon} onClick={downloadImage} />
              </div>
            </section>

            {/* Section: Guides style */}
            <section>
              <SectionHeader label="Clipboard Tools" />
              <div className="space-y-1 mt-2">
                <div className="flex bg-blender-input rounded-sm border border-blender-border overflow-hidden">
                  <button
                    onClick={copyToClipboard}
                    className="flex-1 py-1 px-2 text-[9px] font-bold text-gray-400 hover:bg-blender-active hover:text-white transition-colors border-r border-blender-border"
                  >
                    RAW TEXT
                  </button>
                  <button
                    onClick={copyEmbeddableCode}
                    className="flex-1 py-1 px-2 text-[9px] font-bold text-gray-400 hover:bg-blender-active hover:text-white transition-colors"
                  >
                    MARKDOWN
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2 px-1">
                  <div className="w-2.5 h-2.5 border border-blender-border bg-blender-input rounded-[1px]" />
                  <span className="text-[9px] text-gray-500 italic">Include metadata</span>
                </div>
              </div>
            </section>

            {/* Section: Geometry style */}
            <section>
              <SectionHeader label="Advanced" />
              <div className="grid grid-cols-1 gap-1 mt-2">
                <div className="flex items-center justify-between px-2 py-1 bg-blender-input rounded-sm border border-blender-border">
                  <span className="text-[9px] text-gray-400 uppercase font-bold">Compression</span>
                  <span className="text-[9px] text-blender-active font-bold">1.000</span>
                </div>
              </div>
            </section>
          </div>

          {/* Bottom Bar Info */}
          <div className="px-3 py-1.5 bg-blender-header/50 border-t border-blender-border flex items-center justify-between">
            <span className="text-[8px] text-gray-600 font-bold uppercase tracking-tighter">Status: Active</span>
            <Share2 className="w-2.5 h-2.5 text-gray-600" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportDropdown;
