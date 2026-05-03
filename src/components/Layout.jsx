import React from 'react';
import { Monitor, Sliders } from 'lucide-react';

const Layout = ({ sidebar, viewer, bottomPanel, exportDropdown, shortcutsDropdown, onHelpClick }) => {
  return (
    <div className="flex h-screen w-full bg-blender-bg text-blender-text font-sans overflow-hidden select-none text-[11px]">

      {/* Blender Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-6 bg-blender-header border-b border-blender-border flex items-center px-1 z-30 shadow-md">
        {/* Editor Type Selector */}
        <div className="flex items-center px-2 py-0.5 hover:bg-blender-hover rounded-sm cursor-pointer mr-2 transition-colors">
          <Monitor className="w-3 h-3 text-blender-active mr-1.5" />
          <ChevronDown className="w-2.5 h-2.5 text-gray-500" />
        </div>

        {/* Menus */}
        <div className="flex items-center gap-0.5">
          {['File', 'Edit', 'Render'].map((menu) => (
            <div
              key={menu}
              className="px-2.5 py-0.5 hover:bg-blender-hover rounded-sm cursor-pointer text-gray-300 hover:text-white transition-colors"
            >
              {menu}
            </div>
          ))}

          {/* Window Menu with Dropdown */}
          <div className="relative group/win">
            {shortcutsDropdown}
          </div>

          {/* Export Dropdown integrated into menu bar */}
          {exportDropdown}

          {/* Help remains at the end */}
          <div
            onClick={onHelpClick}
            className="px-2.5 py-0.5 hover:bg-blender-hover rounded-sm cursor-pointer text-gray-300 hover:text-white transition-colors"
          >
            Help
          </div>
        </div>

        <div className="flex items-center h-full ml-auto overflow-hidden pr-2">
        </div>
      </div>

      <div className="flex flex-row w-full h-full pt-6">
        {/* 3D/Viewer Viewport */}
        <div className="flex-1 h-full bg-blender-bg relative overflow-hidden flex flex-col">
          <div className="flex-1 relative overflow-hidden">
            {viewer}
          </div>
          {bottomPanel}
        </div>

        {/* Right Side Properties Panel (The "Properties" Editor) */}
        <div className="w-[280px] h-full bg-blender-panel border-l border-blender-border flex flex-col z-10 flex-shrink-0 shadow-xl">
          {/* Header for Properties panel */}
          <div className="h-6 bg-blender-header border-b border-blender-border flex items-center px-2 gap-2">
            <Sliders className="w-3 h-3 text-blender-accent" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Properties</span>
          </div>
          {sidebar}
        </div>
      </div>
    </div>
  );
};

const ChevronDown = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export default Layout;

