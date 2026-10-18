@props([
    'sellers' => [],
    'buyers' => [],
])

@php
    // Ensure we have complete fallback datasets if DB query returns empty
    $sellersJson = json_encode($sellers ?? []);
    $buyersJson = json_encode($buyers ?? []);
@endphp

<style>
/* Party Autocomplete & Recommendation Styles */
.party-autocomplete-wrapper {
    position: relative;
}

.party-autocomplete-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 99999;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    box-shadow: 0 16px 36px -4px rgba(15, 23, 42, 0.18), 0 8px 16px -4px rgba(15, 23, 42, 0.08);
    max-height: 380px;
    overflow-y: auto;
    min-width: 320px;
    max-width: 620px;
    display: none;
    animation: partyFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes partyFadeIn {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
}

.party-autocomplete-header {
    padding: 8px 12px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    border-top-left-radius: 11px;
    border-top-right-radius: 11px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.75rem;
    font-weight: 700;
    color: #475569;
    position: sticky;
    top: 0;
    z-index: 2;
}

.party-autocomplete-item {
    padding: 10px 14px;
    border-bottom: 1px solid #f1f5f9;
    cursor: pointer;
    transition: all 0.12s ease;
}

.party-autocomplete-item:last-child {
    border-bottom: none;
    border-bottom-left-radius: 11px;
    border-bottom-right-radius: 11px;
}

.party-autocomplete-item:hover,
.party-autocomplete-item.is-selected {
    background-color: #f0fdf4; /* default soft tint */
}

.party-autocomplete-item.seller-item:hover,
.party-autocomplete-item.seller-item.is-selected {
    background-color: #eef2ff !important;
}

.party-autocomplete-item.buyer-item:hover,
.party-autocomplete-item.buyer-item.is-selected {
    background-color: #ecfdf5 !important;
}

.party-autocomplete-name {
    font-size: 0.88rem;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 3px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.party-autocomplete-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 0.68rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 6px;
    white-space: nowrap;
}

.party-badge-indigo {
    background: #e0e7ff;
    color: #3730a3;
    border: 1px solid #c7d2fe;
}

.party-badge-emerald {
    background: #d1fae5;
    color: #065f46;
    border: 1px solid #a7f3d0;
}

.party-badge-blue {
    background: #dbeafe;
    color: #1e40af;
    border: 1px solid #bfdbfe;
}

.party-badge-slate {
    background: #f1f5f9;
    color: #334155;
    border: 1px solid #e2e8f0;
}

.party-autocomplete-address {
    font-size: 0.76rem;
    color: #64748b;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.party-autocomplete-match {
    background: #fef08a;
    color: #713f12;
    padding: 0 2px;
    border-radius: 3px;
    font-weight: 800;
}

.party-recommend-trigger {
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 9999px;
    transition: all 0.15s ease;
    border: 1px solid transparent;
}

.party-recommend-trigger--seller {
    background: #e0e7ff;
    color: #4338ca;
    border-color: #c7d2fe;
}

.party-recommend-trigger--seller:hover {
    background: #4338ca;
    color: #ffffff;
}

.party-recommend-trigger--buyer {
    background: #d1fae5;
    color: #047857;
    border-color: #a7f3d0;
}

.party-recommend-trigger--buyer:hover {
    background: #047857;
    color: #ffffff;
}

/* Floating feedback toast */
.party-autofill-toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 100000;
    background: #0f172a;
    color: #ffffff;
    padding: 10px 18px;
    border-radius: 10px;
    font-size: 0.82rem;
    font-weight: 600;
    box-shadow: 0 10px 25px rgba(0,0,0,0.25);
    display: flex;
    align-items: center;
    gap: 8px;
    animation: toastSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes toastSlideUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>

<script>
(function() {
    window.SAVED_SELLERS_DATA = {!! $sellersJson !!};
    window.SAVED_BUYERS_DATA = {!! $buyersJson !!};

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function highlightMatch(text, query) {
        if (!text) return '';
        if (!query) return escapeHtml(text);
        const safeText = String(text);
        const q = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (!q) return escapeHtml(safeText);
        const regex = new RegExp(`(${q})`, 'gi');
        return safeText.replace(regex, '<span class="party-autocomplete-match">$1</span>');
    }

    function showAutoFillToast(partyName, typeLabel) {
        let toast = document.getElementById('party-autofill-toast-el');
        if (toast) toast.remove();

        toast = document.createElement('div');
        toast.id = 'party-autofill-toast-el';
        toast.className = 'party-autofill-toast';
        toast.innerHTML = `<span>⚡</span> <span>Auto-filled <strong>${escapeHtml(partyName)}</strong> (${typeLabel}) details!</span>`;
        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast) {
                toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px)';
                setTimeout(() => toast.remove(), 300);
            }
        }, 2200);
    }

    window.attachPartyAutocomplete = function(config) {
        const input = typeof config.input === 'string' ? document.getElementById(config.input) || document.querySelector(`[name="${config.input}"]`) : config.input;
        if (!input) return;

        const isSeller = config.type === 'seller' || config.type === 'exporter' || config.type === 'shipper';
        const typeLabel = isSeller ? 'Exporter (Shipper)' : 'Importer (Consignee)';
        const dataset = isSeller ? window.SAVED_SELLERS_DATA : window.SAVED_BUYERS_DATA;
        const mappings = config.mappings || {};
        const selectId = config.selectId;

        // Ensure parent wrapper
        let wrapper = input.closest('.party-autocomplete-wrapper');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.className = 'party-autocomplete-wrapper';
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);
        }

        // Create dropdown element
        let dropdown = wrapper.querySelector('.party-autocomplete-dropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.className = 'party-autocomplete-dropdown';
            wrapper.appendChild(dropdown);
        }

        let selectedIndex = -1;
        let currentFiltered = [];

        function renderList(query = '') {
            const q = (query || '').toLowerCase().trim();
            currentFiltered = dataset.filter(item => {
                if (!q) return true;
                const name = (item.company_name || '').toLowerCase();
                const addr = (item.address || '').toLowerCase();
                const phone = (item.phone || '').toLowerCase();
                const email = (item.email || '').toLowerCase();
                const gst = (item.gst_no || '').toLowerCase();
                const fssai = (item.fssai_no || '').toLowerCase();
                const iec = (item.iec_code || '').toLowerCase();
                return name.includes(q) || addr.includes(q) || phone.includes(q) || email.includes(q) || gst.includes(q) || fssai.includes(q) || iec.includes(q);
            });

            if (currentFiltered.length === 0) {
                dropdown.innerHTML = `
                    <div class="party-autocomplete-header">
                        <span>${isSeller ? '🏢 Shippers Library' : '🏢 Consignees Library'}</span>
                        <span class="text-muted">0 matches</span>
                    </div>
                    <div class="p-3 text-center text-muted small">
                        No saved ${isSeller ? 'exporters' : 'importers'} matching "<strong>${escapeHtml(query)}</strong>".
                    </div>
                `;
                dropdown.style.display = 'block';
                return;
            }

            let html = `
                <div class="party-autocomplete-header">
                    <span>${isSeller ? '⚡ Recommended Shippers & Exporters' : '⚡ Recommended Consignees & Importers'}</span>
                    <span class="badge ${isSeller ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}">${currentFiltered.length} available</span>
                </div>
            `;

            currentFiltered.slice(0, 30).forEach((item, idx) => {
                const itemClass = isSeller ? 'seller-item' : 'buyer-item';
                const nameHtml = highlightMatch(item.company_name, query);
                const addrClean = (item.address || '').replace(/[\r\n]+/g, ', ');
                const addrHtml = highlightMatch(addrClean, query);

                let badgesHtml = '';
                if (isSeller) {
                    if (item.iec_code) badgesHtml += `<span class="party-autocomplete-badge party-badge-indigo">🏷️ Lic: ${escapeHtml(item.iec_code)}</span> `;
                    if (item.phone) badgesHtml += `<span class="party-autocomplete-badge party-badge-slate">📞 ${escapeHtml(item.phone)}</span> `;
                } else {
                    if (item.gst_no) badgesHtml += `<span class="party-autocomplete-badge party-badge-emerald">🏢 GST: ${escapeHtml(item.gst_no)}</span> `;
                    if (item.fssai_no) badgesHtml += `<span class="party-autocomplete-badge party-badge-blue">🛡️ FSSAI: ${escapeHtml(item.fssai_no)}</span> `;
                    if (item.iec_code) badgesHtml += `<span class="party-autocomplete-badge party-badge-slate">💳 PAN/IEC: ${escapeHtml(item.iec_code)}</span> `;
                    if (item.phone) badgesHtml += `<span class="party-autocomplete-badge party-badge-slate">📞 ${escapeHtml(item.phone)}</span> `;
                }

                html += `
                    <div class="party-autocomplete-item ${itemClass} ${idx === selectedIndex ? 'is-selected' : ''}" data-index="${idx}">
                        <div class="party-autocomplete-name">
                            <span>${nameHtml}</span>
                            <span class="text-xs text-primary fw-normal">Select ⚡</span>
                        </div>
                        <div class="d-flex flex-wrap gap-1 mb-1">${badgesHtml}</div>
                        <div class="party-autocomplete-address">📍 ${addrHtml || 'No address specified'}</div>
                    </div>
                `;
            });

            dropdown.innerHTML = html;
            dropdown.style.display = 'block';

            // Add click listeners to items
            dropdown.querySelectorAll('.party-autocomplete-item').forEach(el => {
                el.addEventListener('mousedown', function(e) {
                    e.preventDefault();
                    const index = parseInt(this.dataset.index, 10);
                    if (currentFiltered[index]) {
                        applyPartySelection(currentFiltered[index]);
                    }
                });
            });
        }

        function setFieldValue(fieldIdOrName, val) {
            if (!fieldIdOrName || val === undefined) return;
            const el = document.getElementById(fieldIdOrName) || document.querySelector(`[name="${fieldIdOrName}"]`);
            if (el) {
                el.value = val || '';
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        function applyPartySelection(party) {
            if (!party) return;

            // Fill company name
            input.value = party.company_name || '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            // Fill mapped fields
            if (isSeller) {
                if (mappings.licence) setFieldValue(mappings.licence, party.iec_code || '');
                if (mappings.phone) setFieldValue(mappings.phone, party.phone || '');
                if (mappings.address) setFieldValue(mappings.address, party.address || '');
                if (mappings.email) setFieldValue(mappings.email, party.email || '');
                if (mappings.account_no) setFieldValue(mappings.account_no, party.iec_code || '');
            } else {
                if (mappings.gst) setFieldValue(mappings.gst, party.gst_no || '');
                if (mappings.address) setFieldValue(mappings.address, party.address || '');
                if (mappings.fssai) setFieldValue(mappings.fssai, party.fssai_no || '');
                if (mappings.phone) setFieldValue(mappings.phone, party.phone || '');
                if (mappings.email) setFieldValue(mappings.email, party.email || '');
                if (mappings.pan) setFieldValue(mappings.pan, party.iec_code || '');
                if (mappings.account_no) setFieldValue(mappings.account_no, party.iec_code || '');
            }

            // Sync quick select dropdown if present
            if (selectId) {
                const selectEl = document.getElementById(selectId);
                if (selectEl) {
                    for (let i = 0; i < selectEl.options.length; i++) {
                        try {
                            const optData = JSON.parse(selectEl.options[i].value);
                            if (optData.company_name === party.company_name) {
                                selectEl.selectedIndex = i;
                                break;
                            }
                        } catch(e) {}
                    }
                }
            }

            showAutoFillToast(party.company_name, typeLabel);
            closeDropdown();
        }

        function closeDropdown() {
            dropdown.style.display = 'none';
            selectedIndex = -1;
        }

        // Event listeners on input
        input.addEventListener('focus', function() {
            renderList(this.value);
        });

        input.addEventListener('click', function() {
            renderList(this.value);
        });

        input.addEventListener('input', function() {
            selectedIndex = -1;
            renderList(this.value);
        });

        input.addEventListener('keydown', function(e) {
            if (dropdown.style.display !== 'block') return;

            const items = dropdown.querySelectorAll('.party-autocomplete-item');
            if (!items.length) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % items.length;
                updateSelectionHighlight(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                updateSelectionHighlight(items);
            } else if (e.key === 'Enter') {
                if (selectedIndex >= 0 && currentFiltered[selectedIndex]) {
                    e.preventDefault();
                    applyPartySelection(currentFiltered[selectedIndex]);
                }
            } else if (e.key === 'Escape') {
                closeDropdown();
            }
        });

        function updateSelectionHighlight(items) {
            items.forEach((item, idx) => {
                if (idx === selectedIndex) {
                    item.classList.add('is-selected');
                    item.scrollIntoView({ block: 'nearest' });
                } else {
                    item.classList.remove('is-selected');
                }
            });
        }

        // Close when clicking outside
        document.addEventListener('click', function(e) {
            if (!wrapper.contains(e.target)) {
                closeDropdown();
            }
        });

        // Trigger button helper
        window['openRecommendations_' + input.id] = function() {
            input.focus();
            renderList('');
        };
    };
})();
</script>
