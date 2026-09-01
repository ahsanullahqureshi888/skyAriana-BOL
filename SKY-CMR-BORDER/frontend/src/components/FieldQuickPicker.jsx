import React, { useState, useRef, useEffect } from 'react';
import { useCmr } from '../context/CmrContext';

export const FIELD_PRESETS = {
  loading_ports: [
    { label: "Hairatan Border / Customs", value: "HAIRATAN BORDER / CUSTOMS, AFGHANISTAN" },
    { label: "Mazar-i-Sharif Customs", value: "MAZAR-I-SHARIF CUSTOMS, AFGHANISTAN" },
    { label: "Kandahar Customs Terminal", value: "KANDAHAR CUSTOMS TERMINAL, AFGHANISTAN" },
    { label: "Kabul Customs Terminal", value: "KABUL CUSTOMS TERMINAL, AFGHANISTAN" },
    { label: "Islam Qala / Herat Border", value: "ISLAM QALA / HERAT BORDER, AFGHANISTAN" },
    { label: "Torghundi Border", value: "TORGHUNDI BORDER / CUSTOMS, AFGHANISTAN" },
    { label: "Spin Boldak / Chaman Border", value: "SPIN BOLDAK / CHAMAN BORDER, AFGHANISTAN" },
    { label: "Torkham Border / Customs", value: "TORKHAM BORDER / CUSTOMS, AFGHANISTAN" }
  ],
  discharge_ports: [
    { label: "New Delhi (via Tashkent Air)", value: "NEW DELHI, INDIA (VIA TASHKENT AIR TRANSIT)" },
    { label: "Navi Mumbai (via Tashkent Air)", value: "NAVI MUMBAI, INDIA (VIA TASHKENT AIR TRANSIT)" },
    { label: "Termez Customs Post (Code: 22005)", value: "TERMEZ CUSTOMS POST (CODE: 22005), UZBEKISTAN" },
    { label: "Tashkent Avia Yuklar Customs", value: "TASHKENT AVIA YUKLAR CUSTOMS, UZBEKISTAN" },
    { label: "Bandar Abbas Port, Iran", value: "BANDAR ABBAS PORT, IRAN" },
    { label: "Chabahar Port, Iran", value: "CHABAHAR PORT, IRAN" },
    { label: "Mersin Port, Turkey", value: "MERSIN PORT, TURKEY" },
    { label: "Almaty / Astana, Kazakhstan", value: "ALMATY / ASTANA, KAZAKHSTAN" },
    { label: "Moscow, Russia", value: "MOSCOW, RUSSIA" }
  ],
  dest_countries: [
    { label: "India", value: "INDIA" },
    { label: "Republic of Uzbekistan", value: "REPUBLIC OF UZBEKISTAN" },
    { label: "United Arab Emirates (UAE)", value: "UNITED ARAB EMIRATES (UAE)" },
    { label: "Turkey", value: "TURKEY" },
    { label: "Germany / EU", value: "GERMANY" },
    { label: "Kazakhstan", value: "KAZAKHSTAN" },
    { label: "Russia", value: "RUSSIA" },
    { label: "China", value: "CHINA" }
  ],
  incoterms: [
    { label: "CFR Termiz, Uzbekistan", value: "CFR Termiz, Uzbekistan" },
    { label: "CPT Tashkent, Uzbekistan", value: "CPT Tashkent, Uzbekistan" },
    { label: "CIP New Delhi, India", value: "CIP New Delhi, India" },
    { label: "FOB Hairatan Border", value: "FOB Hairatan Border, Afghanistan" },
    { label: "DAP Navi Mumbai, India", value: "DAP Vashi, Navi Mumbai, India" },
    { label: "CIF Nhava Sheva, India", value: "CIF Nhava Sheva, India" },
    { label: "EXW Kandahar, Afghanistan", value: "EXW Kandahar, Afghanistan" },
    { label: "FCA Kabul, Afghanistan", value: "FCA Kabul, Afghanistan" }
  ],
  payment_terms: [
    { label: "100% Advance T.T", value: "100% Advance T.T" },
    { label: "30% Advance, 70% Against Docs", value: "30% Advance, 70% Against Shipping Documents" },
    { label: "Irrevocable L/C at Sight", value: "Irrevocable Letter of Credit (L/C) at Sight" },
    { label: "Documentary Collection (CAD)", value: "Cash Against Documents (CAD)" },
    { label: "100% Against Telex BL/CMR", value: "100% Against Telex BL / CMR Copy" }
  ]
};

export const FieldQuickPicker = ({ fieldKey, presetGroup, align = "right" }) => {
  const { updateField, showToast } = useCmr();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const options = FIELD_PRESETS[presetGroup] || [];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val) => {
    updateField(fieldKey, val);
    setIsOpen(false);
    showToast(`⚡ Updated: ${val}`, 'success');
  };

  return (
    <div className="field-quick-picker no-print" ref={dropdownRef} style={{ display: 'inline-flex', position: 'relative', marginLeft: 'auto' }}>
      <button
        type="button"
        className="btn-quick-party btn-quick-pick"
        onClick={() => setIsOpen(prev => !prev)}
        title="Quick presets & options"
        style={{ padding: '0 4px', fontSize: '9px', lineHeight: '1.2' }}
      >
        ▾
      </button>

      {isOpen && (
        <div
          className="party-dropdown-menu"
          style={{
            position: 'absolute',
            top: '100%',
            [align === 'left' ? 'left' : 'right']: 0,
            marginTop: '3px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            width: '240px',
            zIndex: 9999,
            overflow: 'hidden',
            maxHeight: '220px',
            overflowY: 'auto'
          }}
        >
          <div style={{ padding: '5px 8px', background: 'rgba(37,99,235,0.08)', borderBottom: '1px solid #e2e8f0', fontSize: '10px', fontWeight: 800, color: '#1e3a8a' }}>
            SELECT PRESET OPTION
          </div>
          {options.map((opt, idx) => (
            <div
              key={idx}
              className="party-dropdown-item"
              onClick={() => handleSelect(opt.value)}
              style={{
                padding: '6px 8px',
                borderBottom: '1px solid rgba(0,0,0,0.04)',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                color: '#0f172a',
                textAlign: 'left'
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
