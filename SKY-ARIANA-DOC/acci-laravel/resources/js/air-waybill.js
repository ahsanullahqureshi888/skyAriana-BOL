const awbMoneyFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const awbDateFormatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
});

const awbLongDateFormatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
});

const setAwbPreviewText = (field, value) => {
    document.querySelectorAll(`[data-awb-preview="${field}"]`).forEach((node) => {
        node.textContent = value ?? '';
    });
};

const parseAwbDate = (value) => {
    if (!value) return null;
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : date;
};

const formatAwbShortDate = (value) => {
    const date = parseAwbDate(value);
    return date ? awbDateFormatter.format(date).replace(' ', '-') : value;
};

const formatAwbLongDate = (value) => {
    const date = parseAwbDate(value);
    return date ? awbLongDateFormatter.format(date) : value;
};

const syncAwbPreviewScale = () => {
    document.querySelectorAll('[data-awb-preview-viewport]').forEach((viewport) => {
        const sheet = viewport.querySelector('[data-awb-preview-sheet]');
        if (!sheet) return;
        const available = viewport.clientWidth > 0 ? viewport.clientWidth - 20 : window.innerWidth - 32;
        const sheetWidth = sheet.offsetWidth || 794;
        const scale = Math.min(1, Math.max(0.30, available / sheetWidth));
        sheet.style.setProperty('--awb-preview-scale', String(scale));
        sheet.style.transform = `scale(${scale})`;
        const sheetHeight = sheet.offsetHeight || 1122;
        viewport.style.minHeight = `${Math.ceil(sheetHeight * scale + 24)}px`;
    });
};
window.syncAwbPreviewScale = syncAwbPreviewScale;

const initAirWaybillForm = (form) => {
    const inputs = [...form.querySelectorAll('[name]')];

    const syncNumberFromParts = () => {
        const prefix = String(form.elements.airline_prefix?.value || '').replace(/\D/g, '').slice(0, 3);
        const serial = String(form.elements.serial_number?.value || '').replace(/\D/g, '').slice(0, 8);
        if (form.elements.airline_prefix) form.elements.airline_prefix.value = prefix;
        if (form.elements.serial_number) form.elements.serial_number.value = serial;
        const awbNumber = prefix.length === 3 && serial.length === 8 ? `${prefix}-${serial}` : '';
        if (form.elements.awb_number) form.elements.awb_number.value = awbNumber;
        setAwbPreviewText('airline_prefix', prefix);
        setAwbPreviewText('serial_number', serial);
        setAwbPreviewText('awb_number', awbNumber);
    };

    const syncPartsFromNumber = () => {
        const value = String(form.elements.awb_number?.value || '').trim();
        const match = value.match(/^(\d{3})-(\d{8})$/);
        if (!match) {
            setAwbPreviewText('awb_number', value);
            return;
        }
        form.elements.airline_prefix.value = match[1];
        form.elements.serial_number.value = match[2];
        setAwbPreviewText('airline_prefix', match[1]);
        setAwbPreviewText('serial_number', match[2]);
        setAwbPreviewText('awb_number', value);
    };

    const numericValue = (name) => Number(form.elements[name]?.value || 0);

    const syncCharges = () => {
        const rateRaw = String(form.elements.rate?.value || '').trim();
        const numericRate = rateRaw !== '' && Number.isFinite(Number(rateRaw));
        const chargeableWeight = numericValue('chargeable_weight');
        const freightCharge = numericRate
            ? Math.round(chargeableWeight * Number(rateRaw) * 100) / 100
            : numericValue('freight_charge');

        if (numericRate && form.elements.freight_charge) {
            form.elements.freight_charge.value = freightCharge.toFixed(2);
        }

        const total = Math.round((
            freightCharge
            + numericValue('valuation_charge')
            + numericValue('tax')
            + numericValue('other_agent_charge')
            + numericValue('other_carrier_charge')
        ) * 100) / 100;
        const settlement = form.elements.charge_settlement?.value || 'prepaid';
        const prepaid = settlement === 'prepaid' ? total : 0;
        const collect = settlement === 'collect' ? total : 0;

        if (form.elements.total_prepaid) form.elements.total_prepaid.value = prepaid.toFixed(2);
        if (form.elements.total_collect) form.elements.total_collect.value = collect.toFixed(2);

        const freightDisplay = freightCharge > 0 ? awbMoneyFormatter.format(freightCharge) : (!numericRate ? rateRaw : '');
        setAwbPreviewText('rate', rateRaw);
        setAwbPreviewText('freight_charge', freightDisplay);
        setAwbPreviewText('freight_charge_prepaid', settlement === 'prepaid' ? freightDisplay : '');
        setAwbPreviewText('freight_charge_collect', settlement === 'collect' ? freightDisplay : '');
        setAwbPreviewText('total_prepaid', prepaid > 0 ? awbMoneyFormatter.format(prepaid) : '');
        setAwbPreviewText('total_collect', collect > 0 ? awbMoneyFormatter.format(collect) : '');

        ['valuation_charge', 'tax', 'other_agent_charge', 'other_carrier_charge', 'charges_at_destination', 'currency_conversion'].forEach((name) => {
            const value = numericValue(name);
            setAwbPreviewText(name, value > 0 ? awbMoneyFormatter.format(value) : '');
        });

        const summary = form.querySelector('[data-awb-calculation-summary]');
        if (summary) {
            summary.textContent = `${form.elements.currency?.value || 'USD'} ${awbMoneyFormatter.format(total)} total - ${settlement === 'collect' ? 'Collect' : 'Prepaid'}`;
        }
    };

    const syncInput = (input) => {
        if (!input.name || ['carrier_logo', 'carrier_stamp', 'shipper_signature', 'carrier_signature', 'total_prepaid', 'total_collect'].includes(input.name)) return;
        if (input.name === 'awb_number') return syncPartsFromNumber();
        if (['airline_prefix', 'serial_number'].includes(input.name)) return syncNumberFromParts();

        let value = input.value;
        if (input.type === 'date') {
            value = input.name === 'issued_date' ? formatAwbLongDate(value) : formatAwbShortDate(value);
        }
        if (['gross_weight', 'chargeable_weight'].includes(input.name) && value !== '') {
            value = awbMoneyFormatter.format(Number(value));
        }
        setAwbPreviewText(input.name, value);
    };

    inputs.forEach((input) => {
        input.addEventListener('input', () => {
            syncInput(input);
            if (['chargeable_weight', 'rate', 'freight_charge', 'valuation_charge', 'tax', 'other_agent_charge', 'other_carrier_charge', 'charge_settlement', 'currency'].includes(input.name)) {
                syncCharges();
            }
        });

        input.addEventListener('change', () => {
            syncInput(input);
            if (input.name === 'charge_settlement') syncCharges();
        });

        if (input.type === 'file') {
            input.addEventListener('change', () => {
                const file = input.files?.[0];
                if (!file || !file.type.startsWith('image/')) return;
                const reader = new FileReader();
                reader.addEventListener('load', () => {
                    document.querySelectorAll(`[data-awb-preview-image="${input.name}"]`).forEach((image) => {
                        image.src = String(reader.result);
                        image.hidden = false;
                    });
                });
                reader.readAsDataURL(file);
            });
        }
    });

    inputs.forEach(syncInput);
    syncCharges();
    syncAwbPreviewScale();
};

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-awb-form]').forEach(initAirWaybillForm);
    syncAwbPreviewScale();
});

window.addEventListener('resize', syncAwbPreviewScale);
