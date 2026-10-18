const numberFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const ones = [
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen',
];

const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

const integerToWords = (value) => {
    const number = Math.floor(Math.abs(Number(value) || 0));
    if (number < 20) return ones[number];
    if (number < 100) return `${tens[Math.floor(number / 10)]}${number % 10 ? `-${ones[number % 10]}` : ''}`;
    if (number < 1000) return `${ones[Math.floor(number / 100)]} hundred${number % 100 ? ` ${integerToWords(number % 100)}` : ''}`;

    const scales = [
        [1_000_000_000_000, 'trillion'],
        [1_000_000_000, 'billion'],
        [1_000_000, 'million'],
        [1_000, 'thousand'],
    ];

    for (const [scale, label] of scales) {
        if (number >= scale) {
            const leading = Math.floor(number / scale);
            const remainder = number % scale;
            return `${integerToWords(leading)} ${label}${remainder ? ` ${integerToWords(remainder)}` : ''}`;
        }
    }

    return 'zero';
};

const amountToWords = (value) => {
    const amount = Math.round((Number(value) || 0) * 100) / 100;
    const whole = Math.floor(amount);
    const cents = Math.round((amount - whole) * 100);
    const words = `${integerToWords(whole)} US ${whole === 1 ? 'dollar' : 'dollars'}`
        + (cents ? ` and ${integerToWords(cents)} ${cents === 1 ? 'cent' : 'cents'}` : '')
        + ' only';

    return words.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatDate = (value) => {
    if (!value) return '';
    const parts = String(value).slice(0, 10).split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
};

const setPreviewText = (field, value) => {
    document.querySelectorAll(`[data-preview="${field}"]`).forEach((node) => {
        const text = value || node.dataset.previewFallback || '';
        node.textContent = text;
        
        const container = node.closest('[data-hide-if-empty]');
        if (container) {
            container.style.display = text.trim() === '' ? 'none' : '';
        }
    });
};

const syncPreviewScale = () => {
    document.querySelectorAll('[data-preview-viewport]').forEach((viewport) => {
        const sheet = viewport.querySelector('[data-preview-sheet]');
        if (!sheet) return;
        const available = Math.max(280, viewport.clientWidth - 38);
        const scale = Math.min(1, available / sheet.offsetWidth);
        sheet.style.setProperty('--preview-scale', String(scale));
        viewport.style.minHeight = `${Math.ceil(sheet.offsetHeight * scale + 38)}px`;
    });
};

const initAcciForm = (form) => {
    const inputs = [...form.querySelectorAll('[name]')];

    const syncCalculations = () => {
        const weight = Number(form.elements.quantity_weight?.value || 0);
        const unitPrice = Number(form.elements.unit_price?.value || 0);
        const total = Math.round(weight * unitPrice * 100) / 100;

        if (form.elements.total_price) form.elements.total_price.value = total.toFixed(2);
        setPreviewText('total_price', numberFormatter.format(total));
        setPreviewText('amount_in_words', amountToWords(total));
    };

    const syncInput = (input) => {
        if (!input.name || ['stamp_image', 'signature_image', 'total_price'].includes(input.name)) return;
        let value = input.value;
        if (input.type === 'date') value = formatDate(value);
        if (['unit_price', 'received_amount'].includes(input.name) && value !== '') value = numberFormatter.format(Number(value));
        if (input.name === 'quantity_cartons' && value !== '') value = new Intl.NumberFormat('en-US').format(Number(value));
        if (input.name === 'quantity_weight' && value !== '') {
            const num = Number(value);
            value = Number.isInteger(num) ? new Intl.NumberFormat('en-US').format(num) : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(num);
        }
        setPreviewText(input.name, value);
    };

    inputs.forEach((input) => {
        input.addEventListener('input', () => {
            syncInput(input);
            if (['quantity_weight', 'unit_price'].includes(input.name)) syncCalculations();
        });

        if (input.type === 'file' && ['stamp_image', 'signature_image'].includes(input.name)) {
            input.addEventListener('change', () => {
                const file = input.files?.[0];
                if (!file || !file.type.startsWith('image/')) return;
                const reader = new FileReader();
                reader.addEventListener('load', () => {
                    document.querySelectorAll(`[data-preview-image="${input.name}"]`).forEach((image) => {
                        image.src = String(reader.result);
                        image.hidden = false;
                    });
                });
                reader.readAsDataURL(file);
            });
        }
    });

    inputs.forEach(syncInput);
    syncCalculations();

    form.querySelectorAll('[data-preview-toggle]').forEach((checkbox) => {
        const targetKey = checkbox.dataset.previewToggle;
        const updateToggle = () => {
            document.querySelectorAll(`[data-preview-target="${targetKey}"]`).forEach((el) => {
                el.style.display = checkbox.checked ? '' : 'none';
            });
        };
        checkbox.addEventListener('change', updateToggle);
        updateToggle();
    });

    syncPreviewScale();
};

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-acci-form]').forEach(initAcciForm);
    syncPreviewScale();
});

window.addEventListener('resize', syncPreviewScale);
