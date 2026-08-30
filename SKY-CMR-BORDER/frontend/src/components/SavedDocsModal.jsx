import React, { useState } from 'react';
import { useCmr } from '../context/CmrContext';

export const SavedDocsModal = () => {
  const { isSavedDocsOpen, setIsSavedDocsOpen, savedDocs, restoreFromArchive, saveToArchive } = useCmr();
  const [search, setSearch] = useState('');

  if (!isSavedDocsOpen) return null;

  const filtered = savedDocs.filter(item => {
    const text = `${item.cmr_number} ${item.consignor} ${item.consignee} ${item.commodity} ${item.origin} ${item.destination}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div className="modal-overlay active">
      <div className="modal-box" style={{ maxWidth: '860px' }}>
        <div className="modal-header">
          <h2>📋 CMR Waybill Archive & History Manager</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-success" onClick={saveToArchive} style={{ fontSize: '11.5px', padding: '5px 12px' }}>
              💾 Save Current Draft
            </button>
            <button
              onClick={() => setIsSavedDocsOpen(false)}
              style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold', color: '#64748b' }}
            >
              ✕
            </button>
          </div>
        </div>
        <div className="modal-body">
          <div>
            <input
              type="text"
              className="doc-search-input"
              placeholder="🔍 Search saved documents by CMR No, Exporter, Consignee, Commodity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ maxHeight: '440px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                No documents found.
              </div>
            ) : (
              filtered.map(doc => (
                <div
                  key={doc.id}
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-header)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: '#2563eb', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace' }}>
                      {doc.cmr_number}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '12px', marginTop: '2px' }}>
                      {doc.consignor} ➔ {doc.consignee}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      📦 {doc.commodity} | ⚖️ {doc.gross_weight} | 📅 {doc.saved_at || doc.date}
                    </div>
                  </div>
                  <button className="btn btn-primary" style={{ fontSize: '11px', padding: '4px 9px' }} onClick={() => restoreFromArchive(doc)}>
                    📂 Open
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={() => setIsSavedDocsOpen(false)}>Close</button>
        </div>
      </div>
    </div>
  );
};
