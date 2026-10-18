import React, { useState } from 'react';
import { useCmr } from '../context/CmrContext';

export const PartiesModal = () => {
  const {
    isPartiesModalOpen,
    setIsPartiesModalOpen,
    partiesActiveTab,
    setPartiesActiveTab,
    savedSenders,
    savedConsignees,
    savedCarriers,
    applySender,
    applyConsignee,
    applyCarrier,
    saveParty,
    deleteParty,
    showToast
  } = useCmr();

  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formTag, setFormTag] = useState('');
  const [formDetails, setFormDetails] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formTax, setFormTax] = useState('');
  const [formEmail, setFormEmail] = useState('');

  if (!isPartiesModalOpen) return null;

  const currentList =
    partiesActiveTab === 'sender'
      ? savedSenders
      : partiesActiveTab === 'consignee'
      ? savedConsignees
      : savedCarriers;

  const filteredList = currentList.filter(item => {
    const text = `${item.name || ''} ${item.tag || ''} ${item.details || ''} ${item.phone || ''} ${item.taxNo || ''}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const handleStartAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormName('');
    setFormTag('');
    setFormDetails('');
    setFormPhone('');
    setFormTax('');
    setFormEmail('');
  };

  const handleStartEdit = (item) => {
    setIsAdding(true);
    setEditingId(item.id);
    setFormName(item.name || '');
    setFormTag(item.tag || '');
    setFormDetails(item.details || '');
    setFormPhone(item.phone || '');
    setFormTax(item.taxNo || '');
    setFormEmail(item.email || '');
  };

  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!formName.trim() || !formDetails.trim()) {
      showToast('⚠️ Please enter both a Company / Party Name and Details', 'info');
      return;
    }

    const partyObj = {
      id: editingId || `${partiesActiveTab.substring(0, 3)}_${Date.now()}`,
      name: formName.trim(),
      tag: formTag.trim(),
      details: formDetails.trim(),
      phone: formPhone.trim(),
      taxNo: formTax.trim(),
      email: formEmail.trim()
    };

    saveParty(partiesActiveTab, partyObj);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleApply = (item) => {
    if (partiesActiveTab === 'sender') applySender(item);
    else if (partiesActiveTab === 'consignee') applyConsignee(item);
    else applyCarrier(item);
    setIsPartiesModalOpen(false);
  };

  return (
    <div className="modal-overlay active" style={{ zIndex: 1100 }}>
      <div className="modal-box parties-modal-box" style={{ maxWidth: '820px', width: '94%' }}>
        {/* HEADER */}
        <div className="modal-header" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-header)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>🏢</span>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-header)' }}>
                Party Directory & Saved Address Book
              </h2>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Quickly load, save, and manage Senders, Consignees, and Carriers
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsPartiesModalOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '22px',
              cursor: 'pointer',
              fontWeight: 'bold',
              color: 'var(--text-muted)'
            }}
          >
            ✕
          </button>
        </div>

        {/* TABS & ACTIONS */}
        <div style={{ padding: '12px 18px', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-header)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div className="parties-tab-strip" style={{ display: 'flex', gap: '6px' }}>
            <button
              className={`pad-pill-btn ${partiesActiveTab === 'sender' ? 'active' : ''}`}
              style={{ fontSize: '12px', padding: '6px 14px' }}
              onClick={() => { setPartiesActiveTab('sender'); setIsAdding(false); }}
            >
              📤 Senders ({savedSenders.length})
            </button>
            <button
              className={`pad-pill-btn ${partiesActiveTab === 'consignee' ? 'active' : ''}`}
              style={{ fontSize: '12px', padding: '6px 14px' }}
              onClick={() => { setPartiesActiveTab('consignee'); setIsAdding(false); }}
            >
              📥 Consignees ({savedConsignees.length})
            </button>
            <button
              className={`pad-pill-btn ${partiesActiveTab === 'carrier' ? 'active' : ''}`}
              style={{ fontSize: '12px', padding: '6px 14px' }}
              onClick={() => { setPartiesActiveTab('carrier'); setIsAdding(false); }}
            >
              🚛 Carriers ({savedCarriers.length})
            </button>
          </div>

          {!isAdding && (
            <button
              className="btn btn-success"
              style={{ fontSize: '12px', padding: '6px 14px' }}
              onClick={handleStartAdd}
            >
              ➕ Add New {partiesActiveTab === 'sender' ? 'Sender' : partiesActiveTab === 'consignee' ? 'Consignee' : 'Carrier'}
            </button>
          )}
        </div>

        {/* BODY */}
        <div className="modal-body" style={{ padding: '16px 18px', maxHeight: '520px', overflowY: 'auto' }}>
          {isAdding ? (
            /* ADD / EDIT FORM */
            <form onSubmit={handleSaveForm} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#2563eb' }}>
                {editingId ? '✏️ Edit Party' : `➕ Add New ${partiesActiveTab === 'sender' ? 'Sender' : partiesActiveTab === 'consignee' ? 'Consignee' : 'Carrier'}`}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
                    Company / Entity Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NAJIB AMIN LTD"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-header)', fontSize: '12px', background: 'var(--card-bg)', color: 'var(--text-header)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
                    City / Country Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kandahar / New Delhi"
                    value={formTag}
                    onChange={(e) => setFormTag(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-header)', fontSize: '12px', background: 'var(--card-bg)', color: 'var(--text-header)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
                  Full Address & Details (As formatted in CMR Box) *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter full address, tax numbers, license, phone numbers..."
                  value={formDetails}
                  onChange={(e) => setFormDetails(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-header)', fontSize: '12px', background: 'var(--card-bg)', color: 'var(--text-header)', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
                    Phone / Tel
                  </label>
                  <input
                    type="text"
                    placeholder="+93..."
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-header)', fontSize: '12px', background: 'var(--card-bg)', color: 'var(--text-header)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
                    Tax / TIN / GSTIN / License
                  </label>
                  <input
                    type="text"
                    placeholder="T.L 27-975 / TIN..."
                    value={formTax}
                    onChange={(e) => setFormTax(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-header)', fontSize: '12px', background: 'var(--card-bg)', color: 'var(--text-header)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="info@..."
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-header)', fontSize: '12px', background: 'var(--card-bg)', color: 'var(--text-header)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="submit" className="btn btn-primary" style={{ padding: '7px 16px' }}>
                  💾 Save {partiesActiveTab === 'sender' ? 'Sender' : partiesActiveTab === 'consignee' ? 'Consignee' : 'Carrier'}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => { setIsAdding(false); setEditingId(null); }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* LIST VIEW */
            <div>
              <div style={{ marginBottom: '12px' }}>
                <input
                  type="text"
                  className="doc-search-input"
                  placeholder={`🔍 Search saved ${partiesActiveTab}s by name, address, tag, phone...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '9px 14px', borderRadius: '8px', border: '1px solid var(--border-header)', fontSize: '13px', background: 'var(--card-bg)', color: 'var(--text-header)' }}
                />
              </div>

              {filteredList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📂</div>
                  <div style={{ fontWeight: 700 }}>No saved {partiesActiveTab}s found</div>
                  <button
                    className="btn btn-success"
                    style={{ marginTop: '12px', fontSize: '12px' }}
                    onClick={handleStartAdd}
                  >
                    ➕ Add First {partiesActiveTab === 'sender' ? 'Sender' : partiesActiveTab === 'consignee' ? 'Consignee' : 'Carrier'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredList.map(item => (
                    <div
                      key={item.id}
                      style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border-header)',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '12px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, color: 'var(--text-header)', fontSize: '13.5px' }}>
                            {item.name}
                          </span>
                          {item.tag && (
                            <span style={{ fontSize: '10.5px', background: 'rgba(37,99,235,0.1)', color: '#2563eb', padding: '2px 7px', borderRadius: '12px', fontWeight: 700 }}>
                              📍 {item.tag}
                            </span>
                          )}
                          {item.taxNo && (
                            <span style={{ fontSize: '10.5px', background: 'rgba(16,185,129,0.1)', color: '#059669', padding: '2px 7px', borderRadius: '12px', fontWeight: 600 }}>
                              🏷️ {item.taxNo}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '6px', whiteSpace: 'pre-line', lineHeight: '1.4', background: 'rgba(0,0,0,0.02)', padding: '6px 8px', borderRadius: '6px', border: '1px dashed var(--border-header)' }}>
                          {item.details}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '95px' }}>
                        <button
                          className="btn btn-primary"
                          style={{ fontSize: '11.5px', padding: '5px 10px', justifyContent: 'center' }}
                          onClick={() => handleApply(item)}
                          title="Apply directly to active form"
                        >
                          ⚡ Apply
                        </button>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            className="btn"
                            style={{ fontSize: '10.5px', padding: '4px 7px', flex: 1, justifyContent: 'center' }}
                            onClick={() => handleStartEdit(item)}
                            title="Edit party details"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ fontSize: '10.5px', padding: '4px 7px', justifyContent: 'center' }}
                            onClick={() => deleteParty(partiesActiveTab, item.id)}
                            title="Delete party"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="modal-footer" style={{ padding: '10px 18px', borderTop: '1px solid var(--border-header)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            💡 Tip: You can also save senders & consignees directly from CMR Boxes 1 & 2!
          </div>
          <button className="btn" onClick={() => setIsPartiesModalOpen(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
