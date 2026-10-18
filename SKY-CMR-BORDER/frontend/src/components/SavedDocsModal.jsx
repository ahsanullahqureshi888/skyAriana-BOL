import React, { useState, useRef } from 'react';
import { useCmr } from '../context/CmrContext';

export const SavedDocsModal = () => {
  const {
    isSavedDocsOpen,
    setIsSavedDocsOpen,
    savedDocs,
    restoreFromArchive,
    saveToArchive,
    saveCurrentDocAsCopy,
    deleteSavedDoc,
    duplicateSavedDoc,
    resetToRealPdfs,
    exportArchiveJson,
    importArchiveJson,
    openAddressBook,
    triggerDownloadPdf
  } = useCmr();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const fileInputRef = useRef(null);

  if (!isSavedDocsOpen) return null;

  const filtered = savedDocs.filter(item => {
    const text = `${item.cmr_number || ''} ${item.consignor || ''} ${item.consignee || ''} ${item.commodity || ''} ${item.origin || ''} ${item.destination || ''} ${item.truck || ''}`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase());
    if (filterType === 'all') return matchesSearch;
    if (filterType === 'raisins') return matchesSearch && text.includes('raisin');
    return matchesSearch;
  });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      importArchiveJson(event.target.result);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="modal-overlay active" style={{ zIndex: 1050 }}>
      <div className="modal-box" style={{ maxWidth: '920px', width: '95%' }}>
        {/* HEADER */}
        <div className="modal-header" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-header)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>📋</span>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-header)' }}>
                CMR Archive, Backup & Document Manager
              </h2>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {savedDocs.length} saved shipments • Cloud & Local Storage synchronized
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-success"
              onClick={saveToArchive}
              style={{ fontSize: '11.5px', padding: '6px 12px' }}
              title="Save current form to archive"
            >
              💾 Save Active
            </button>
            <button
              className="btn"
              onClick={saveCurrentDocAsCopy}
              style={{ fontSize: '11.5px', padding: '6px 10px', background: '#0284c7', color: '#fff', borderColor: '#0369a1' }}
              title="Save current form as a new copy"
            >
              📑 Save Copy
            </button>
            <button
              onClick={() => setIsSavedDocsOpen(false)}
              style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', fontWeight: 'bold', color: 'var(--text-muted)' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* TOOLBAR STRIP */}
        <div style={{ padding: '10px 18px', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-header)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className={`pad-pill-btn ${filterType === 'all' ? 'active' : ''}`}
              style={{ fontSize: '11.5px', padding: '5px 12px' }}
              onClick={() => setFilterType('all')}
            >
              All Documents ({savedDocs.length})
            </button>
            <button
              className={`pad-pill-btn ${filterType === 'raisins' ? 'active' : ''}`}
              style={{ fontSize: '11.5px', padding: '5px 12px' }}
              onClick={() => setFilterType('raisins')}
            >
              🍇 Afghan Raisins
            </button>
            <button
              className="pad-pill-btn"
              style={{ fontSize: '11.5px', padding: '5px 12px' }}
              onClick={() => { setIsSavedDocsOpen(false); openAddressBook('sender'); }}
            >
              🏢 Senders & Consignees
            </button>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="btn btn-amber"
              onClick={resetToRealPdfs}
              style={{ fontSize: '11px', padding: '5px 10px' }}
              title="Restore original 5 Afghan Customs CMRs (106-110)"
            >
              🔄 Real PDF Defaults
            </button>
            <button
              className="btn"
              onClick={exportArchiveJson}
              style={{ fontSize: '11px', padding: '5px 10px' }}
              title="Export complete backup as JSON file"
            >
              📥 Backup JSON
            </button>
            <button
              className="btn"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{ fontSize: '11px', padding: '5px 10px' }}
              title="Restore archive from JSON backup"
            >
              📤 Restore JSON
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".json"
              onChange={handleFileUpload}
            />
          </div>
        </div>

        {/* BODY */}
        <div className="modal-body" style={{ padding: '14px 18px' }}>
          <div style={{ marginBottom: '12px' }}>
            <input
              type="text"
              className="doc-search-input"
              placeholder="🔍 Search saved shipments by CMR No, Consignor, Consignee, Truck Plate, Commodity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 14px', borderRadius: '8px', border: '1px solid var(--border-header)', fontSize: '13px', background: 'var(--card-bg)', color: 'var(--text-header)' }}
            />
          </div>

          <div style={{ maxHeight: '440px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📂</div>
                <div style={{ fontWeight: 700 }}>No documents match your search.</div>
              </div>
            ) : (
              filtered.map(doc => (
                <div
                  key={doc.id}
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-header)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 900, color: '#2563eb', fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', background: 'rgba(37,99,235,0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                        CMR #{doc.cmr_number}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: '12.5px', color: 'var(--text-header)' }}>
                        {doc.consignor} ➔ {doc.consignee}
                      </span>
                      {doc.truck && (
                        <span style={{ fontSize: '11px', color: '#059669', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          🚛 {doc.truck}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      📦 {doc.commodity} | ⚖️ {doc.gross_weight} | 💰 {doc.value} | 📅 {doc.saved_at || doc.date}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: '11.5px', padding: '5px 12px' }}
                      onClick={() => restoreFromArchive(doc)}
                      title="Load this document into form"
                    >
                      📂 Open
                    </button>
                    <button
                      className="btn"
                      style={{ fontSize: '11px', padding: '5px 8px' }}
                      onClick={() => duplicateSavedDoc(doc)}
                      title="Duplicate this document"
                    >
                      📑 Clone
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ fontSize: '11px', padding: '5px 8px' }}
                      onClick={() => deleteSavedDoc(doc.id)}
                      title="Delete from archive"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="modal-footer" style={{ padding: '10px 18px', borderTop: '1px solid var(--border-header)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            💡 You can export all saved CMRs & address book records anytime to preserve backups.
          </div>
          <button className="btn" onClick={() => setIsSavedDocsOpen(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
