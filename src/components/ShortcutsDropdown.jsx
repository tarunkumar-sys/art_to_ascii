import React, { useState, useRef, useEffect } from 'react';
import { Command } from 'lucide-react';

const ShortcutsDropdown = ({ isOpen, setIsOpen }) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setIsOpen]);

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
      textAlign: 'left', 
      position: 'relative', 
    },
    badge: { 
      fontSize: 9, 
      fontFamily: 'monospace', 
      padding: '0px 4px', 
      borderRadius: 2, 
      border: '1px solid #333', 
      background: '#1d1d1d', 
      color: '#888', 
      flexShrink: 0 
    },
  };

  const sections = [
    {
      title: 'Playback',
      keys: [
        { key: 'Space', desc: 'Play/Pause' },
        { key: '← / →', desc: 'Seek' },
        { key: '0', desc: 'Restart' },
      ]
    },
    {
      title: 'Viewport',
      keys: [
        { key: '+ / -', desc: 'Zoom' },
        { key: 'R', desc: 'Reset' },
        { key: 'M', desc: 'Move' },
        { key: 'Z', desc: 'Zoom Tool' },
      ]
    },
    {
      title: 'Adjustments',
      keys: [
        { key: '[ / ]', desc: 'Res' },
        { key: 'I', desc: 'Invert' },
        { key: 'C', desc: 'Color' },
        { key: '?', desc: 'Keys' },
      ]
    }
  ];

  if (!isOpen) return null;

  return (
    <div style={{ 
      position: 'absolute', 
      left: 0, 
      top: 'calc(100% + 4px)', 
      width: 180, 
      zIndex: 100, 
      ...S.panel, 
      paddingBottom: 4,
      borderRadius: 3
    }} ref={dropdownRef}>
      <div style={S.header}>
        <div className="flex items-center gap-2">
          <Command className="w-3 h-3 text-blue-400" />
          <span style={{ fontSize: 10, color: '#eee', fontWeight: 600 }}>KEYBINDINGS</span>
        </div>
      </div>

      {sections.map((section, sIdx) => (
        <React.Fragment key={section.title}>
          <div style={S.sectionLbl}>{section.title}</div>
          {section.keys.map((item) => (
            <div key={item.key} style={S.item}>
              <span style={{ flex: 1, fontSize: 10, color: '#aaa' }}>{item.desc}</span>
              <span style={S.badge}>{item.key}</span>
            </div>
          ))}
          {sIdx < sections.length - 1 && <div style={S.divider} />}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ShortcutsDropdown;
