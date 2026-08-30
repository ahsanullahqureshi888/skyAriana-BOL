import React, { useState } from 'react';
import { useCmr } from '../context/CmrContext';
import { LOGISTICS_PRESETS } from '../utils/presets';

export const AutoFillModal = () => {
  const { isAutoFillOpen, setIsAutoFillOpen, applyPreset } = useCmr();
  const [selectedPreset, setSelectedPreset] = useState('saboor_uzbek');
  const [rawText, setRawText] = useState(LOGISTICS_PRESETS.saboor_uzbek.text);

  if (!isAutoFillOpen) return null;

  const handleSelectPreset = (key) => {
    setSelectedPreset(key);
    setRawText(LOGISTICS_PRESETS[key].text);
  };

  const handleApply = () => {
    applyPreset(selectedPreset);
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-box">
        <div className="modal-header">
          <h2>📸 Smart AI/OCR Invoice & Waybill Auto-Fill</h2>
          <button
            onClick={() => setIsAutoFillOpen(false)}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold', color: '#64748b' }}
          >
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="upload-dropzone">
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📸 📄</div>
            <div style={{ fontSize: '14.5px', fontWeight: '700' }}>Commercial Invoice / Packing List OCR Extractor</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Select a pre-built logistics blueprint or paste invoice data below
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
              Standard Logistics Presets (Click to Load):
            </label>
            <div className="preset-tabs">
              {Object.entries(LOGISTICS_PRESETS).map(([key, item]) => (
                <button
                  key={key}
                  className={`preset-btn ${selectedPreset === key ? 'active' : ''}`}
                  onClick={() => handleSelectPreset(key)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', color: 'var(--text-muted)' }}>
              Extracted / Raw Invoice Text:
            </label>
            <textarea
              className="input-textarea"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={() => setIsAutoFillOpen(false)}>Cancel</button>
          <button className="btn btn-primary" id="btnApplyAutoFill" onClick={handleApply}>
            ⚡ Parse & Auto-Fill All CMR Fields
          </button>
        </div>
      </div>
    </div>
  );
};
