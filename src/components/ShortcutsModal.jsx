import React from 'react';
import { X, Command } from 'lucide-react';

const ShortcutsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const sections = [
    {
      title: 'Playback',
      keys: [
        { key: 'Space', desc: 'Toggle Play/Pause' },
        { key: '← / →', desc: 'Seek -/+ 1 second' },
        { key: '0', desc: 'Reset to beginning' },
      ]
    },
    {
      title: 'Viewport',
      keys: [
        { key: '+ / -', desc: 'Zoom in / out' },
        { key: 'R', desc: 'Reset Zoom & Pan' },
        { key: 'M', desc: 'Select Move Tool' },
        { key: 'Z', desc: 'Select Zoom Tool' },
      ]
    },
    {
      title: 'Adjustments',
      keys: [
        { key: '[ / ]', desc: 'Adjust Resolution' },
        { key: 'I', desc: 'Invert Brightness' },
        { key: 'C', desc: 'Toggle Colored Mode' },
        { key: '?', desc: 'Show Shortcuts' },
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="w-full max-w-md bg-[#282828] border border-[#181818] shadow-2xl rounded-lg overflow-hidden animate-in fade-in zoom-in duration-200"
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        {/* Header */}
        <div className="bg-[#3d3d3d] px-4 py-3 border-b border-[#181818] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Command className="w-4 h-4 text-blue-400" />
            <span className="text-[13px] font-bold text-gray-100">Keyboard Shortcuts</span>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
          {sections.map((section) => (
            <div key={section.title} className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{section.title}</h3>
              <div className="space-y-2">
                {section.keys.map((item) => (
                  <div key={item.key} className="flex items-center justify-between group">
                    <span className="text-xs text-gray-300">{item.desc}</span>
                    <div className="flex items-center gap-1">
                      <kbd className="min-w-[24px] h-6 px-1.5 flex items-center justify-center bg-[#1d1d1d] border border-[#333] rounded text-[10px] font-mono text-gray-400 group-hover:text-blue-400 group-hover:border-blue-400/30 transition-all">
                        {item.key}
                      </kbd>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-[#1e1e1e] px-5 py-3 border-t border-[#181818] flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-1.5 bg-[#4b7091] hover:bg-[#5b80a1] text-white text-xs font-medium rounded transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsModal;
