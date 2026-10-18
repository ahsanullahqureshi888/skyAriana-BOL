import React from 'react';
import { useCmr } from '../context/CmrContext';

export const ZoomControls = () => {
  const { zoom, setZoom, fitToScreen, isPaperView, setIsPaperView, isMobile, setIsMobileEditorOpen } = useCmr();

  const handleZoom = (delta) => {
    setZoom(prev => Math.min(Math.max(0.3, Number((prev + delta).toFixed(2))), 2.5));
  };

  const handle100 = () => {
    setZoom(1.0);
  };

  return (
    <div className="floating-zoom-panel">
      {isMobile && (
        <button
          className="zoom-btn-mobile-form"
          onClick={() => setIsMobileEditorOpen(true)}
          title="Open Mobile Touch Form"
        >
          ✏️ Form
        </button>
      )}
      <button className="zoom-btn" onClick={() => handleZoom(-0.1)} title="Zoom Out">−</button>
      <span className="zoom-level" onClick={handle100} title="Click for 100%">{Math.round(zoom * 100)}%</span>
      <button className="zoom-btn" onClick={() => handleZoom(0.1)} title="Zoom In">+</button>
      <button className="zoom-btn-action" onClick={fitToScreen} title="Fit to Screen Width">📐 Fit</button>
      <button className="zoom-btn-action" onClick={() => setIsPaperView(prev => !prev)} title="Toggle Preview / Edit Mode">
        {isPaperView ? '✏️ Edit' : '📄 Paper'}
      </button>
    </div>
  );
};

