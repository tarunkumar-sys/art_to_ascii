import React, { useState, useEffect, useRef } from 'react';
import { Mail, Info, HelpCircle, Code, ExternalLink } from 'lucide-react';

const HelpModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('help'); // 'help' or 'about'
  const modalRef = useRef(null);

  // Handle ESC key and disable body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'; // Freeze background scroll

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  // Handle click outside
  const handleOverlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className="bg-blender-panel border border-blender-border rounded shadow-2xl w-[90%] max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        {/* Header */}
        <div className="flex items-center px-4 py-1.5 bg-blender-header border-b border-blender-border">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('help')}
              className={`px-3 py-1 text-[11px] font-medium rounded flex items-center gap-1.5 transition-colors ${activeTab === 'help' ? 'bg-[#3d3d3d] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <HelpCircle className="w-3 h-3" /> Help
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`px-3 py-1 text-[11px] font-medium rounded flex items-center gap-1.5 transition-colors ${activeTab === 'about' ? 'bg-[#3d3d3d] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <Info className="w-3 h-3" /> About
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 text-gray-300 h-[220px] overflow-y-auto text-xs bg-blender-panel">
          {activeTab === 'help' && (
            <div className="space-y-3">
              <h3 className="text-[11px] font-bold text-gray-100 uppercase tracking-wider mb-2 border-b border-blender-border pb-1">How to use Ascii-Studio</h3>
              <ul className="list-none space-y-2.5 text-[11px] text-gray-400">
                <li><strong className="text-gray-200">Upload Media:</strong> Drag & drop an image or video into the Properties panel on the left.</li>
                <li><strong className="text-gray-200">Navigation:</strong> Use the Middle Mouse Button (MMB) or the Move tool to pan the viewport. Scroll to zoom in and out.</li>
                <li><strong className="text-gray-200">Adjustments:</strong> Tweak the Color Profile and Resolution Scale in real-time to find the best look.</li>
                <li><strong className="text-gray-200">Export:</strong> Save your art as a standard text file, an image, or copy it as Markdown to embed directly into GitHub.</li>
              </ul>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="flex flex-col h-full">
              <div className="space-y-3">
                <h3 className="text-[11px] font-bold text-gray-100 uppercase tracking-wider mb-2 border-b border-blender-border pb-1">System Information</h3>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Ascii-Studio is an industry-standard web application designed to transform images and videos into high-quality ASCII art.
                  Built with a Blender-inspired UI to ensure a distraction-free, professional creative environment.
                </p>
              </div>
              <div className="flex items-center justify-start gap-2 mt-3">
                <a href="#" className="p-1.5 bg-blender-input hover:bg-blender-active border border-blender-border text-gray-400 hover:text-white rounded-full transition-colors" title="GitHub">
                  <Code className="w-3.5 h-3.5" />
                </a>
                <a href="#" className="p-1.5 bg-blender-input hover:bg-blender-active border border-blender-border text-gray-400 hover:text-white rounded-full transition-colors" title="Email Developer">
                  <Mail className="w-3.5 h-3.5" />
                </a>
                <a href="#" className="p-1.5 bg-blender-input hover:bg-blender-active border border-blender-border text-gray-400 hover:text-white rounded-full transition-colors" title="LinkedIn">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-blender-header border-t border-blender-border flex justify-center">
          <button onClick={onClose} className="px-10 py-1.5 bg-blender-input hover:bg-blender-hover border border-blender-border text-[10px] uppercase font-bold tracking-widest text-gray-400 hover:text-white rounded-sm transition-colors shadow-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
