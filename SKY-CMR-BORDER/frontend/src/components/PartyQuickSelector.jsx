import React, { useState, useRef, useEffect } from 'react';
import { useCmr } from '../context/CmrContext';

export const PartyQuickSelector = ({ type = 'sender', align = 'right' }) => {
  const {
    savedSenders,
    savedConsignees,
    savedCarriers,
    applySender,
    applyConsignee,
    applyCarrier,
    saveCurrentSender,
    saveCurrentConsignee,
    saveCurrentCarrier,
    openAddressBook
  } = useCmr();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const list =
    type === 'sender'
      ? savedSenders
      : type === 'consignee'
      ? savedConsignees
      : savedCarriers;

  const label = type === 'sender' ? 'Sender' : type === 'consignee' ? 'Consignee' : 'Carrier';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = (e) => {
    e.stopPropagation();
    if (type === 'sender') saveCurrentSender();
    else if (type === 'consignee') saveCurrentConsignee();
    else saveCurrentCarrier();
  };

  const handleSelect = (party) => {
    if (type === 'sender') applySender(party);
    else if (type === 'consignee') applyConsignee(party);
    else applyCarrier(party);
    setIsOpen(false);
  };

  return (
    <div className="party-quick-bar no-print" ref={dropdownRef} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
      <button
        type="button"
        className="btn-quick-party btn-quick-save"
        onClick={handleSave}
        title={`Save current text as new ${label} in Address Book`}
      >
        💾 Save
      </button>

      <button
        type="button"
        className="btn-quick-party btn-quick-pick"
        onClick={() => setIsOpen(prev => !prev)}
        title={`Choose from saved ${label}s`}
      >
        👥 {list.length} ▾
      </button>

      {isOpen && (
        <div
          className="party-dropdown-menu"
          style={{
            position: 'absolute',
            top: '100%',
            [align === 'left' ? 'left' : 'right']: 0,
            marginTop: '4px',
            background: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-header, #cbd5e1)',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
            width: '280px',
            zIndex: 999,
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '7px 10px', background: 'rgba(37,99,235,0.08)', borderBottom: '1px solid var(--border-header, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#1e3a8a' }}>
              SAVED {label.toUpperCase()}S
            </span>
            <button
              type="button"
              onClick={() => { setIsOpen(false); openAddressBook(type); }}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer' }}
            >
              ⚙️ Manage
            </button>
          </div>

          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {list.length === 0 ? (
              <div style={{ padding: '14px', fontSize: '11px', textAlign: 'center', color: '#64748b' }}>
                No saved {label.toLowerCase()}s yet.
              </div>
            ) : (
              list.map((item) => (
                <div
                  key={item.id}
                  className="party-dropdown-item"
                  onClick={() => handleSelect(item)}
                  style={{
                    padding: '8px 10px',
                    borderBottom: '1px solid rgba(0,0,0,0.04)',
                    cursor: 'pointer',
                    fontSize: '11.5px',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--text-header, #0f172a)' }}>
                    {item.name}
                  </div>
                  {item.tag && (
                    <div style={{ fontSize: '10px', color: '#2563eb', marginTop: '1px' }}>
                      📍 {item.tag}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.02)', borderTop: '1px solid var(--border-header, #e2e8f0)', display: 'flex', justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={handleSave}
              style={{ background: 'none', border: 'none', color: '#059669', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer' }}
            >
              💾 Save Current
            </button>
            <button
              type="button"
              onClick={() => { setIsOpen(false); openAddressBook(type); }}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer' }}
            >
              🏢 Address Book
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
