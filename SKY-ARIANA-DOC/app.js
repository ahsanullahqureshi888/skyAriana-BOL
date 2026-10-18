/**
 * Sky Ariana & Balam Bar Baran Logistics Workspace
 * Main Application Logic (app.js)
 * Supports dynamic translations (English, Persian, Pashto), RTL layout,
 * digital signature drawing canvas, local mock databases, Excel exporting,
 * image logo uploads, and automated logistics financials calculations.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Keep day-to-day invoice fields separate from persistent document settings.
    const controlPanel = document.querySelector('.control-panel');
    const invoiceTab = document.getElementById('sidebar-invoice-tab');
    const settingsTab = document.getElementById('sidebar-settings-tab');
    const settingsDocumentControls = document.getElementById('settings-document-controls');
    const languageControl = document.getElementById('lang-switcher')?.closest('.form-group');
    if (settingsDocumentControls && languageControl) settingsDocumentControls.appendChild(languageControl);

    const setSidebarMode = (mode) => {
        const settingsMode = mode === 'settings';
        controlPanel?.classList.toggle('settings-mode', settingsMode);
        invoiceTab?.classList.toggle('active', !settingsMode);
        settingsTab?.classList.toggle('active', settingsMode);
        invoiceTab?.setAttribute('aria-selected', String(!settingsMode));
        settingsTab?.setAttribute('aria-selected', String(settingsMode));
        localStorage.setItem('invoice-sidebar-mode', mode);
        document.querySelector('.editor-sections')?.scrollTo({ top: 0, behavior: 'smooth' });
    };
    invoiceTab?.addEventListener('click', () => setSidebarMode('invoice'));
    settingsTab?.addEventListener('click', () => setSidebarMode('settings'));
    setSidebarMode(localStorage.getItem('invoice-sidebar-mode') === 'settings' ? 'settings' : 'invoice');

    // ---------------------------------------------------------
    // 1. Translation System Dictionary
    // ---------------------------------------------------------
    const translations = {
        en: {
            commercial_invoice: "COMMERCIAL INVOICE",
            invoice_no: "INVOICE NO:",
            reference_no: "REFERENCE NO:",
            invoice_date: "INVOICE DATE:",
            due_date: "DUE DATE:",
            currency: "CURRENCY:",
            status: "STATUS:",
            tin: "Tax ID (TIN):",
            license: "License:",
            seller_exporter: "SELLER / EXPORTER",
            buyer_importer: "BUYER / IMPORTER (CONSIGNEE)",
            country: "Country:",
            tax_no: "Tax/TIN:",
            shipment_logistics: "SHIPMENT & LOGISTICS INFORMATION",
            booking_no: "BOOKING NUMBER:",
            bl_no: "BILL OF LADING NO:",
            container_no: "CONTAINER NO:",
            container_type: "CONTAINER TYPE:",
            seal_no: "SEAL NUMBER:",
            commodity: "COMMODITY Description:",
            hs_code: "HS CODE (GLOBAL):",
            incoterms: "INCOTERMS:",
            gross_weight: "GROSS WEIGHT (KG):",
            net_weight: "NET WEIGHT (KG):",
            packages: "NO. OF PACKAGES:",
            shipping_line: "SHIPPING LINE:",
            origin: "ORIGIN COUNTRY:",
            destination: "FINAL DESTINATION:",
            pol: "PORT OF LOADING (POL):",
            pod: "PORT OF DISCHARGE (POD):",
            vessel: "VESSEL / CARRIER:",
            voyage: "VOYAGE NO:",
            etd: "EST. DEPARTURE (ETD):",
            eta: "EST. ARRIVAL (ETA):",
            col_no: "No.",
            col_desc: "Description of Goods",
            col_hscode: "HS Code",
            col_qty: "Qty",
            col_unit: "Unit",
            col_price: "Unit Price",
            col_amount: "Amount",
            bank_transfer: "BANK TRANSFER DETAILS",
            bank_name: "Bank Name:",
            beneficiary: "Beneficiary:",
            account_no: "Account No:",
            swift_code: "SWIFT Code:",
            payment_terms: "Payment Terms:",
            terms_conditions: "DECLARATION & TERMS",
            subtotal: "Subtotal:",
            freight: "Freight Charges:",
            insurance: "Transit Insurance:",
            customs_charges: "Customs Clearance:",
            docs_charges: "Documentation/BL:",
            handling_charges: "Port Handling Fees:",
            discount: "Loyalty Discount:",
            tax: "Sales Tax / VAT",
            grand_total: "GRAND TOTAL",
            scan_track: "Scan to Track",
            footer_thanks: "Thank you for your business. We look forward to managing your international supply chain."
        },
        fa: {
            commercial_invoice: "فاکتور تجاری (Commercial Invoice)",
            invoice_no: "شماره فاکتور:",
            reference_no: "شماره مرجع:",
            invoice_date: "تاریخ فاکتور:",
            due_date: "تاریخ سررسید:",
            currency: "ارز معامله:",
            status: "وضعیت فاکتور:",
            tin: "شناسه مالیاتی (TIN):",
            license: "جواز کسب و کار:",
            seller_exporter: "فروشنده / صادر کننده (Seller / Exporter)",
            buyer_importer: "خریدار / وارد کننده (Consignee / Buyer)",
            country: "کشور مقصد:",
            tax_no: "کد مالیاتی خریدار:",
            shipment_logistics: "مشخصات محموله و اطلاعات ترابری",
            booking_no: "شماره رزرو بار (Booking):",
            bl_no: "شماره بارنامه (B/L):",
            container_no: "شماره کانتینر:",
            container_type: "نوع کانتینر:",
            seal_no: "شماره پلمب گمرکی (Seal):",
            commodity: "نوع کالا و شرح کلی:",
            hs_code: "کد تعرفه گمرکی (HS Code):",
            incoterms: "شرایط تحویل اینکوترمز:",
            gross_weight: "وزن ناخالص (Gross Wt):",
            net_weight: "وزن خالص (Net Wt):",
            packages: "تعداد بسته‌ها (Packages):",
            shipping_line: "خط کشتیرانی / هوایی:",
            origin: "کشور مبدأ بارگیری:",
            destination: "مقصد نهایی:",
            pol: "بندر بارگیری (Port of Loading):",
            pod: "بندر تخلیه (Port of Discharge):",
            vessel: "نام کشتی / پرواز:",
            voyage: "شماره سفر / Voyage No:",
            etd: "تاریخ حرکت تخمینی (ETD):",
            eta: "تاریخ رسیدن تخمینی (ETA):",
            col_no: "ردیف",
            col_desc: "شرح کالا و اقلام تجاری",
            col_hscode: "کد تعرفه",
            col_qty: "تعداد",
            col_unit: "واحد",
            col_price: "قیمت واحد",
            col_amount: "مبلغ نهایی",
            bank_transfer: "مشخصات حساب بانکی و تسویه مالی",
            bank_name: "نام بانک:",
            beneficiary: "نام ذینفع حساب:",
            account_no: "شماره حساب:",
            swift_code: "کد سوئیفت (SWIFT):",
            payment_terms: "شرایط پرداخت:",
            terms_conditions: "تعهدات قانونی و شرایط کلی فروش",
            subtotal: "جمع اقلام کالا:",
            freight: "کرایه حمل و نقل (Freight):",
            insurance: "بیمه حمل ترانزیت (Insurance):",
            customs_charges: "ترخیص گمرکی و عوارض:",
            docs_charges: "هزینه صدور اسناد و بارنامه:",
            handling_charges: "هزینه تخلیه و بارگیری بندر:",
            discount: "تخفیف ویژه مشتری:",
            tax: "مالیات بر ارزش افزوده (VAT)",
            grand_total: "مجموع نهایی فاکتور",
            scan_track: "اسکن برای پیگیری بار",
            footer_thanks: "از همکاری تجاری شما سپاسگزاریم. ما با افتخار زنجیره تأمین بین‌المللی شما را مدیریت می‌کنیم."
        },
        ps: {
            commercial_invoice: "تجارتي فاکتور (Commercial Invoice)",
            invoice_no: "د فاکتور شمیره:",
            reference_no: "د حوالې شمیره:",
            invoice_date: "د فاکتور نیټه:",
            due_date: "د تادیې وخت:",
            currency: "معاملاتي اسعار:",
            status: "د فاکتور حالت:",
            tin: "مالیاتي نمبر (TIN):",
            license: "سوداګریز جواز نمبر:",
            seller_exporter: "پلورونکی / صادرونکی (Seller / Exporter)",
            buyer_importer: "پیرودونکی / واردونکی (Consignee / Buyer)",
            country: "مقصد هیواد:",
            tax_no: "مالیاتي شمیره:",
            shipment_logistics: "د بار وړلو او لوژستیک معلومات",
            booking_no: "د بار ریزرویشن نمبر (Booking):",
            bl_no: "د بارنامې شمیره (B/L):",
            container_no: "د کانټینر شمیره:",
            container_type: "د کانټینر ډول:",
            seal_no: "د ګمرک سیل نمبر (Seal):",
            commodity: "د توکو ډول او عمومي توضیحات:",
            hs_code: "د ګمرکي تعرفې کوډ (HS):",
            incoterms: "د اینکوترمز شرایط:",
            gross_weight: "ناخالص وزن (Gross Wt):",
            net_weight: "خالص وزن (Net Wt):",
            packages: "د بستو شمیر (Packages):",
            shipping_line: "د ټرانسپورټ کرښه / لاین:",
            origin: "د پیل هیواد (بارول):",
            destination: "وروستی مقصد:",
            pol: "د بارولو بندر (POL):",
            pod: "د خالي کولو بندر (POD):",
            vessel: "د کښتۍ یا کیریر نوم:",
            voyage: "د سفر نمبر / Voyage No:",
            etd: "د حرکت نیټه (ETD):",
            eta: "د رسیدلو نیټه (ETA):",
            col_no: "شمیره",
            col_desc: "د توکو تشریح او مشخصات",
            col_hscode: "تعرفه کوډ",
            col_qty: "تعداد (شمار)",
            col_unit: "واحد",
            col_price: "د واحد بیه",
            col_amount: "ټول قیمت",
            bank_transfer: "د بانکي لیږد او حساب توضیحات",
            bank_name: "د بانک نوم:",
            beneficiary: "د حساب ګټونکی:",
            account_no: "د حساب شمیره:",
            swift_code: "د سویفټ کوډ (SWIFT):",
            payment_terms: "د تادیې شراکتونه:",
            terms_conditions: "قانوني اعلامیه او د پلور شرایط",
            subtotal: "د توکو مجموعه قیمت:",
            freight: "د ترانسپورټ او بار وړلو لګښت:",
            insurance: "د ټرانزیټ بیمه لګښت:",
            customs_charges: "د ګمرکي محصول او ترخیص لګښت:",
            docs_charges: "د اسنادو او بارنامې فیس:",
            handling_charges: "د بندر سمبالولو فیس (Handling):",
            discount: "د وفادارۍ تخفیف:",
            tax: "د پلور مالیه او محصول (VAT)",
            grand_total: "د فاکتور ټولیزه مجموعه بیه",
            scan_track: "د تعقیب لپاره سکین کړئ",
            footer_thanks: "ستاسو د سوداګرۍ مننه. موږ ستاسو د نړیوال اکمالاتي ځنځیر پرمخ وړلو ته ژمن یو."
        }
    };

    // ---------------------------------------------------------
    // 2. Local Databases (Buyers & Products)
    // ---------------------------------------------------------
    const buyerDatabase = [
        {
            id: "buyer-1",
            companyName: "Asia Transit Trading LLC",
            contact: "Ahmad Wali (Operations Manager)",
            address: "Sector 3, Zarghoon Boulevard, Kandahar, Afghanistan",
            country: "Afghanistan",
            phone: "+93 70 011 2233",
            email: "transit@asiatrading.af",
            tax: "TIN-77890124-T"
        },
        {
            id: "buyer-2",
            companyName: "Kabul Merchant & Distributors Co.",
            contact: "Mustafa Qaderi (Purchasing Director)",
            address: "Building 45, Cinema Zainab St, Shahr-e-Naw, Kabul, Afghanistan",
            country: "Afghanistan",
            phone: "+93 79 334 5566",
            email: "import@kabulmerchants.af",
            tax: "TIN-39014589-M"
        },
        {
            id: "buyer-3",
            companyName: "Dubai Logistics Trade Hub",
            contact: "Salim Al-Mansoori (Director of Trading)",
            address: "Warehouse 12A, Jebel Ali Free Zone, Dubai, UAE",
            country: "United Arab Emirates",
            phone: "+971 4 881 9000",
            email: "trade@dubaihub.ae",
            tax: "VAT-1002938102"
        },
        {
            id: "buyer-4",
            companyName: "WAVELON IMPEX",
            contact: "Purchasing Manager",
            address: "A 4008, RKLP MARKET, SAROLI, SURAT, INDIA",
            country: "India",
            phone: "+91 261 440 9901",
            email: "imports@wavelonimpex.in",
            tax: "GST-36WAVELON9"
        }
    ];

    const productDatabase = [
        {
            id: "prod-1",
            description: "Industrial Solar Panel Inverters (5KW Hybrid PLC)",
            hsCode: "8504.40.90",
            unit: "PCS",
            price: 680.00
        },
        {
            id: "prod-2",
            description: "Heavy Duty Lithium-Ion Battery Storage Rack (48V 200Ah)",
            hsCode: "8507.60.00",
            unit: "UNITS",
            price: 1850.00
        },
        {
            id: "prod-3",
            description: "Agricultural Drip Irrigation Pipe Rolls (16mm Diameter)",
            hsCode: "3917.39.00",
            unit: "ROLLS",
            price: 45.00
        },
        {
            id: "prod-4",
            description: "Afghan Grade-A Red Saffron Export Packages (1kg Tins)",
            hsCode: "0910.20.00",
            unit: "KGS",
            price: 1450.00
        },
        {
            id: "prod-5",
            description: "Automobile Brake Disc Calipers (High Carbon Steel)",
            hsCode: "8708.30.90",
            unit: "SETS",
            price: 110.00
        },
        {
            id: "prod-6",
            description: "DRY FIGS",
            hsCode: "0804.20.10",
            unit: "METRIC TONS",
            price: 5500.00
        },
        {
            id: "prod-7",
            description: "DRY FIGS",
            hsCode: "0804.20.10",
            unit: "KG",
            price: 1.60
        }
    ];

    // Live state invoice items
    let invoiceItems = [
        {
            description: "AIR-FREIGHT TRANSPORTATION OF DRY FIGS FROM KABUL TO DELHI",
            hsCode: "0804.20.10",
            quantity: 12000,
            unit: "KG",
            unitPrice: 8.00
        }
    ];

    // ---------------------------------------------------------
    // 3. Select DOM Nodes References
    // ---------------------------------------------------------
    // Config / Top Controls
    const langSwitcher = document.getElementById('lang-switcher');
    const inputCurrency = document.getElementById('input-currency');
    const inputStatus = document.getElementById('input-status');
    const btnGenInvNo = document.getElementById('btn-gen-inv-no');
    const inputLogoUpload = document.getElementById('input-logo-upload');

    // Databases Elements
    const selectCustomerDb = document.getElementById('select-customer-db');
    const selectProductDb = document.getElementById('select-product-db');

    // Forms Inputs
    const inputInvNo = document.getElementById('input-inv-no');
    const inputRefNo = document.getElementById('input-ref-no');
    const inputInvDate = document.getElementById('input-inv-date');
    const inputDueDate = document.getElementById('input-due-date');

    const inputCompanyName = document.getElementById('input-company-name');
    const inputCompanyAddr = document.getElementById('input-company-addr');
    const inputCompanyPhone = document.getElementById('input-company-phone');
    const inputCompanyEmail = document.getElementById('input-company-email');
    const inputCompanyWeb = document.getElementById('input-company-web');
    const inputCompanyTax = document.getElementById('input-company-tax');
    const inputCompanyLicense = document.getElementById('input-company-license');
    const officeInputs = {
        af: { address: document.getElementById('input-office-af-address'), phones: document.getElementById('input-office-af-phones'), emails: document.getElementById('input-office-af-emails') },
        kabul: { address: document.getElementById('input-office-kabul-address'), phones: document.getElementById('input-office-kabul-phones'), emails: document.getElementById('input-office-kabul-emails') },
        iran: { address: document.getElementById('input-office-iran-address'), phones: document.getElementById('input-office-iran-phones'), emails: document.getElementById('input-office-iran-emails') }
    };

    const inputBuyerName = document.getElementById('input-buyer-name');
    const inputBuyerContact = document.getElementById('input-buyer-contact');
    const inputBuyerAddr = document.getElementById('input-buyer-addr');
    const inputBuyerCountry = document.getElementById('input-buyer-country');
    const inputBuyerPhone = document.getElementById('input-buyer-phone');
    const inputBuyerEmail = document.getElementById('input-buyer-email');
    const inputBuyerTax = document.getElementById('input-buyer-tax');

    const inputShipBooking = document.getElementById('input-ship-booking');
    const inputShipBl = document.getElementById('input-ship-bl');
    const inputShipContainer = document.getElementById('input-ship-container');
    const inputShipType = document.getElementById('input-ship-type');
    const inputShipSeal = document.getElementById('input-ship-seal');
    const inputShipCommodity = document.getElementById('input-ship-commodity');
    const inputShipHscode = document.getElementById('input-ship-hscode');
    const inputShipGross = document.getElementById('input-ship-gross');
    const inputShipNet = document.getElementById('input-ship-net');
    const inputShipPackages = document.getElementById('input-ship-packages');
    const inputShipOrigin = document.getElementById('input-ship-origin');
    const inputShipDest = document.getElementById('input-ship-dest');
    const inputShipPol = document.getElementById('input-ship-pol');
    const inputShipPod = document.getElementById('input-ship-pod');
    const inputShipVessel = document.getElementById('input-ship-vessel');
    const inputShipVoyage = document.getElementById('input-ship-voyage');
    const inputShipLine = document.getElementById('input-ship-line');
    const inputShipEtd = document.getElementById('input-ship-etd');
    const inputShipEta = document.getElementById('input-ship-eta');
    const inputShipIncoterms = document.getElementById('input-ship-incoterms');

    const inputChargeFreight = document.getElementById('input-charge-freight');
    const inputChargeInsurance = document.getElementById('input-charge-insurance');
    const inputChargeCustoms = document.getElementById('input-charge-customs');
    const inputChargeDocs = document.getElementById('input-charge-docs');
    const inputChargeHandling = document.getElementById('input-charge-handling');
    const inputChargeDiscount = document.getElementById('input-charge-discount');
    const inputChargeTax = document.getElementById('input-charge-tax');

    const inputBankName = document.getElementById('input-bank-name');
    const inputBankAccName = document.getElementById('input-bank-acc-name');
    const inputBankAccNum = document.getElementById('input-bank-acc-num');
    const inputBankIban = document.getElementById('input-bank-iban');
    const inputBankSwift = document.getElementById('input-bank-swift');
    const inputBankTerms = document.getElementById('input-bank-terms');
    const inputTerms = document.getElementById('input-terms');

    const inputSigName = document.getElementById('input-sig-name');
    const inputSigTitle = document.getElementById('input-sig-title');
    const inputSigStamp = document.getElementById('input-sig-stamp');
    const inputTrackingUrl = document.getElementById('input-tracking-url');

    const inputNotifyName = document.getElementById('input-notify-name');
    const inputNotifyAddr = document.getElementById('input-notify-addr');
    const inputNotifyLicense = document.getElementById('input-notify-license');

    const inputShipCargoWeight = document.getElementById('input-ship-cargo-weight');
    const inputShipTotalWeight = document.getElementById('input-ship-total-weight');
    const inputShipMode = document.getElementById('input-ship-mode');
    const inputShipRoute = document.getElementById('input-ship-route');
    const inputShipCargoDesc = document.getElementById('input-ship-cargo-desc');

    const inputBankBranch = document.getElementById('input-bank-branch');
    const inputBankAddress = document.getElementById('input-bank-address');
    const inputAmountWords = document.getElementById('input-amount-words');

    // Preview Layout Elements
    const invoicePage = document.getElementById('invoice-page');
    const customLogoPreview = document.getElementById('custom-logo-preview');
    const viewWatermarkImg = document.getElementById('view-watermark-img');
    const viewFooterLogo = document.getElementById('view-footer-logo');

    const viewInvNo = document.getElementById('view-inv-no');
    const viewRefNo = document.getElementById('view-ref-no');
    const viewInvDate = document.getElementById('view-inv-date');
    const viewDueDate = document.getElementById('view-due-date');
    const viewCurrency = document.getElementById('view-currency');
    const viewCurrencyLbl = document.getElementById('view-currency-lbl');
    const viewStatusBadge = document.getElementById('view-status-badge');

    const viewCompanyName = document.getElementById('view-company-name');
    const viewCompanyAddr = document.getElementById('view-company-addr');
    const viewCompanyPhone = document.getElementById('view-company-phone');
    const viewCompanyEmail = document.getElementById('view-company-email');
    const viewCompanyWeb = document.getElementById('view-company-web');
    const viewCompanyTax = document.getElementById('view-company-tax');
    const viewCompanyLicense = document.getElementById('view-company-license');

    const viewCompanyNameCard = document.getElementById('view-company-name-card');
    const viewCompanyAddrCard = document.getElementById('view-company-addr-card');
    const viewCompanyTaxCard = document.getElementById('view-company-tax-card');
    const viewCompanyLicenseCard = document.getElementById('view-company-license-card');

    const viewBuyerName = document.getElementById('view-buyer-name');
    const viewBuyerContact = document.getElementById('view-buyer-contact');
    const viewBuyerAddr = document.getElementById('view-buyer-addr');
    const viewBuyerCountry = document.getElementById('view-buyer-country');
    const viewBuyerTax = document.getElementById('view-buyer-tax');
    const viewBuyerPhone = document.getElementById('view-buyer-phone');
    const viewBuyerEmail = document.getElementById('view-buyer-email');

    const viewNotifyName = document.getElementById('view-notify-name');
    const viewNotifyAddr = document.getElementById('view-notify-addr');
    const viewNotifyLicense = document.getElementById('view-notify-license');
    const viewNotifyEmpty = document.getElementById('view-notify-empty');

    const viewShipBooking = document.getElementById('view-ship-booking');
    const viewShipBl = document.getElementById('view-ship-bl');
    const viewShipContainer = document.getElementById('view-ship-container');
    const viewShipType = document.getElementById('view-ship-type');
    const viewShipSeal = document.getElementById('view-ship-seal');
    const viewShipCommodity = document.getElementById('view-ship-commodity');
    const viewShipHscode = document.getElementById('view-ship-hscode');
    const viewShipIncoterms = document.getElementById('view-ship-incoterms');
    const viewShipGross = document.getElementById('view-ship-gross');
    const viewShipNet = document.getElementById('view-ship-net');
    const viewShipPackages = document.getElementById('view-ship-packages');
    const viewShipLine = document.getElementById('view-ship-line');
    const viewShipOrigin = document.getElementById('view-ship-origin');
    const viewShipDest = document.getElementById('view-ship-dest');
    const viewShipPol = document.getElementById('view-ship-pol');
    const viewShipPod = document.getElementById('view-ship-pod');
    const viewShipVessel = document.getElementById('view-ship-vessel');
    const viewShipVoyage = document.getElementById('view-ship-voyage');
    const viewShipEtd = document.getElementById('view-ship-etd');
    const viewShipEta = document.getElementById('view-ship-eta');

    const viewShipCargoWeight = document.getElementById('view-ship-cargo-weight');
    const viewShipTotalWeight = document.getElementById('view-ship-total-weight');
    const viewShipMode = document.getElementById('view-ship-mode');
    const viewShipRoute = document.getElementById('view-ship-route');
    const viewShipCargoDesc = document.getElementById('view-ship-cargo-desc');

    const itemsTbody = document.getElementById('invoice-items-tbody');

    const viewSubtotal = document.getElementById('view-subtotal');
    const viewFreight = document.getElementById('view-freight');
    const viewInsurance = document.getElementById('view-insurance');
    const viewCustoms = document.getElementById('view-customs');
    const viewDocs = document.getElementById('view-docs');
    const viewHandling = document.getElementById('view-handling');
    const viewDiscount = document.getElementById('view-discount');
    const viewTaxRate = document.getElementById('view-tax-rate');
    const viewTax = document.getElementById('view-tax');
    const viewGrandTotal = document.getElementById('view-grand-total');

    const viewBankName = document.getElementById('view-bank-name');
    const viewBankAccName = document.getElementById('view-bank-acc-name');
    const viewBankAccNum = document.getElementById('view-bank-acc-num');
    const viewBankIban = document.getElementById('view-bank-iban');
    const viewBankSwift = document.getElementById('view-bank-swift');
    const viewBankTerms = document.getElementById('view-bank-terms');
    const viewTerms = document.getElementById('view-terms');

    const viewBankBranch = document.getElementById('view-bank-branch');
    const viewBankAddress = document.getElementById('view-bank-address');
    const viewAmountWords = document.getElementById('view-amount-words');

    const viewSigImg = document.getElementById('view-sig-img');
    const viewSigNameFallback = document.getElementById('view-sig-name-fallback');
    const viewSigName = document.getElementById('view-sig-name');
    const viewSigTitle = document.getElementById('view-sig-title');
    const viewStamp = document.getElementById('view-stamp');

    // Action Triggers
    const themeToggleBtn = document.getElementById('theme-toggle');
    const printBtn = document.getElementById('btn-print');
    const excelExportBtn = document.getElementById('btn-excel-export');
    const previewPrintBtn = document.getElementById('btn-preview-print');
    const zoomLevel = document.getElementById('zoom-level');
    let previewZoom = 1;
    const officeSettingsKey = 'sky-ariana-company-offices-v1';
    const toLines = value => String(value || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    function renderOfficeSettings() {
        Object.entries(officeInputs).forEach(([key, fields]) => {
            const address = document.getElementById(`view-office-${key}-address`);
            if (address) { address.replaceChildren(); toLines(fields.address.value).forEach((line, i) => { if (i) address.append(document.createElement('br')); address.append(document.createTextNode(line)); }); }
            [['phones', 'tel:'], ['emails', 'mailto:']].forEach(([kind, protocol]) => {
                const container = document.getElementById(`view-office-${key}-${kind}`);
                if (!container) return;
                container.replaceChildren();
                toLines(fields[kind].value).forEach(value => { const link = document.createElement('a'); link.className = 'office-link'; link.href = protocol + (kind === 'phones' ? value.replace(/[^+\d]/g, '') : value); link.textContent = value; container.append(link); });
            });
        });
    }
    function saveOfficeSettings() {
        const value = Object.fromEntries(Object.entries(officeInputs).map(([key, fields]) => [key, { address: fields.address.value, phones: fields.phones.value, emails: fields.emails.value }]));
        localStorage.setItem(officeSettingsKey, JSON.stringify(value)); renderOfficeSettings();
    }
    function loadOfficeSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem(officeSettingsKey) || 'null');
            if (saved) Object.entries(officeInputs).forEach(([key, fields]) => { if (!saved[key]) return; Object.keys(fields).forEach(name => { if (typeof saved[key][name] === 'string') fields[name].value = saved[key][name]; }); });
        } catch (error) { console.warn('Office settings could not be restored.', error); }
        Object.values(officeInputs).forEach(fields => Object.values(fields).forEach(input => input.addEventListener('input', saveOfficeSettings)));
        renderOfficeSettings();
    }
    function setPreviewZoom(value) { previewZoom = Math.min(1.25, Math.max(.45, value)); invoicePage.style.setProperty('--preview-scale', previewZoom); zoomLevel.textContent = `${Math.round(previewZoom * 100)}%`; }
    function fitPreview() { const available = Math.max(320, document.querySelector('.preview-area').clientWidth - 48); setPreviewZoom(Math.min(1, available / invoicePage.offsetWidth)); }
    function updateTransportLayout() {
        const isAir = inputShipType.value === 'AIR' || inputShipMode.value.toUpperCase().includes('AIR');
        invoicePage.classList.toggle('mode-air', isAir); invoicePage.classList.toggle('mode-sea', !isAir);
        const grid = invoicePage.querySelector('.shipment-grid');
        [2, 3, 4, 16, 17].forEach(index => grid?.children[index]?.classList.toggle('transport-irrelevant', isAir));
        const labels = grid ? Array.from(grid.querySelectorAll('.cell-label')) : [];
        if (labels[11]) labels[11].textContent = isAir ? 'AIRLINE / CARRIER:' : 'SHIPPING LINE:';
        if (labels[14]) labels[14].textContent = isAir ? 'AIRPORT OF DEPARTURE:' : 'PORT OF LOADING:';
        if (labels[15]) labels[15].textContent = isAir ? 'AIRPORT OF DESTINATION:' : 'PORT OF DISCHARGE:';
        const heading = invoicePage.querySelector('[data-translate="shipment_logistics"]');
        if (heading) heading.textContent = isAir ? 'AIR-CARGO SHIPMENT INFORMATION' : 'SEA-FREIGHT SHIPMENT INFORMATION';
    }
    const loadPreset1Btn = document.getElementById('load-preset-1');
    const loadPreset2Btn = document.getElementById('load-preset-2');
    const addItemBtn = document.getElementById('add-item-btn');
    const itemsListContainer = document.getElementById('items-list-container');

    // ---------------------------------------------------------
    // 4. Default Date Initializations
    // ---------------------------------------------------------
    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + 30);
    const etdDate = new Date();
    etdDate.setDate(today.getDate() + 3);
    const etaDate = new Date();
    etaDate.setDate(today.getDate() + 15);

    inputInvDate.value = today.toISOString().split('T')[0];
    inputDueDate.value = dueDate.toISOString().split('T')[0];
    inputShipEtd.value = etdDate.toISOString().split('T')[0];
    inputShipEta.value = etaDate.toISOString().split('T')[0];

    // ---------------------------------------------------------
    // 5. Populate Database Selector Dropdowns
    // ---------------------------------------------------------
    function initDatabaseOptions() {
        // Buyer Database
        buyerDatabase.forEach(buyer => {
            const opt = document.createElement('option');
            opt.value = buyer.id;
            opt.textContent = `${buyer.companyName} (${buyer.country})`;
            selectCustomerDb.appendChild(opt);
        });

        // Product Database
        productDatabase.forEach(prod => {
            const opt = document.createElement('option');
            opt.value = prod.id;
            opt.textContent = `${prod.description} [${prod.hsCode}] - ${getCurrencySymbol(inputCurrency.value)}${prod.price}`;
            selectProductDb.appendChild(opt);
        });
    }

    // Database Actions listeners
    selectCustomerDb.addEventListener('change', (e) => {
        const selectedId = e.target.value;
        if (!selectedId) return;
        const buyer = buyerDatabase.find(b => b.id === selectedId);
        if (buyer) {
            inputBuyerName.value = buyer.companyName;
            inputBuyerContact.value = buyer.contact;
            inputBuyerAddr.value = buyer.address;
            inputBuyerCountry.value = buyer.country;
            inputBuyerPhone.value = buyer.phone;
            inputBuyerEmail.value = buyer.email;
            inputBuyerTax.value = buyer.tax;

            // Update shipping details consignee
            inputShipConsignee.value = buyer.companyName;

            updateCalculationsAndPreview();
        }
        selectCustomerDb.value = ""; // Reset dropdown
    });

    selectProductDb.addEventListener('change', (e) => {
        const selectedId = e.target.value;
        if (!selectedId) return;
        const prod = productDatabase.find(p => p.id === selectedId);
        if (prod) {
            invoiceItems.push({
                description: prod.description,
                hsCode: prod.hsCode,
                quantity: 1,
                unit: prod.unit,
                unitPrice: prod.price
            });
            renderEditorItems();
            updateCalculationsAndPreview();
        }
        selectProductDb.value = ""; // Reset dropdown
    });

    // Logo Upload Logic
    inputLogoUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                customLogoPreview.src = evt.target.result;
                if (viewWatermarkImg) {
                    viewWatermarkImg.src = evt.target.result;
                }
                if (viewFooterLogo) {
                    viewFooterLogo.src = evt.target.result;
                }
            };
            reader.readAsDataURL(file);
        }
    });

    // ---------------------------------------------------------
    // 6. Signature Pad Canvas Operations
    // ---------------------------------------------------------
    const canvas = document.getElementById('sig-canvas');
    const ctx = canvas.getContext('2d');
    const clearSigBtn = document.getElementById('btn-clear-sig');
    let drawing = false;

    // Set styling for ink
    ctx.strokeStyle = "#1E40AF"; // Solid deep blue digital ink
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Mouse drawing events
    canvas.addEventListener('mousedown', (e) => {
        drawing = true;
        ctx.beginPath();
        const pos = getCanvasPos(e);
        ctx.moveTo(pos.x, pos.y);
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!drawing) return;
        const pos = getCanvasPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        syncSignatureToInvoice();
    });

    window.addEventListener('mouseup', () => {
        drawing = false;
    });

    // Touch support for mobiles/tablets
    canvas.addEventListener('touchstart', (e) => {
        drawing = true;
        ctx.beginPath();
        const touch = e.touches[0];
        const pos = getCanvasPos(touch);
        ctx.moveTo(pos.x, pos.y);
        e.preventDefault();
    });

    canvas.addEventListener('touchmove', (e) => {
        if (!drawing) return;
        const touch = e.touches[0];
        const pos = getCanvasPos(touch);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        syncSignatureToInvoice();
        e.preventDefault();
    });

    canvas.addEventListener('touchend', (e) => {
        drawing = false;
        e.preventDefault();
    });

    function getCanvasPos(evt) {
        const rect = canvas.getBoundingClientRect();
        // Scale coordinate space matching bounding CSS dimensions
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (evt.clientX - rect.left) * scaleX,
            y: (evt.clientY - rect.top) * scaleY
        };
    }

    function syncSignatureToInvoice() {
        // Convert canvas image data URL
        const dataURL = canvas.toDataURL();
        viewSigImg.src = dataURL;
        viewSigImg.style.display = 'block';
        viewSigNameFallback.style.display = 'none';
    }

    clearSigBtn.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        viewSigImg.src = "";
        viewSigImg.style.display = 'none';
        viewSigNameFallback.style.display = 'block';
    });

    // ---------------------------------------------------------
    // 7. Formats & Currency Helpers
    // ---------------------------------------------------------
    function formatDateString(dateStr) {
        if (!dateStr) return '';
        const dateObj = new Date(dateStr);
        if (isNaN(dateObj)) return dateStr;
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        return dateObj.toLocaleDateString('en-US', options).toUpperCase();
    }

    function formatNumber(num) {
        return parseFloat(num).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function getCurrencySymbol(curr) {
        switch (curr) {
            case 'EUR': return '€';
            case 'AED': return 'AED ';
            case 'AFN': return '؋';
            case 'IRR': return '﷼';
            case 'USD': return 'USD ';
            default: return `${curr} `;
        }
    }

    function formatCurrencyVal(num) {
        const symbol = getCurrencySymbol(inputCurrency.value);
        
        // Handle RTL currency symbols placement neatly
        const lang = langSwitcher.value;
        if (lang === 'fa' || lang === 'ps') {
            return `${formatNumber(num)} ${symbol}`;
        }
        return `${symbol}${formatNumber(num)}`;
    }

    const roundCurrency = (value) => Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;
    function numberToWords(value) {
        const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
        const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
        const small = (number) => { let result = ''; if (number >= 100) { result += `${ones[Math.floor(number / 100)]} HUNDRED `; number %= 100; } if (number >= 20) { result += `${tens[Math.floor(number / 10)]} `; number %= 10; } if (number) result += `${ones[number]} `; return result.trim(); };
        const safe = Math.max(0, roundCurrency(value));
        let dollars = Math.floor(safe);
        const cents = Math.round((safe - dollars) * 100);
        const words = [];
        [[1000000000, 'BILLION'], [1000000, 'MILLION'], [1000, 'THOUSAND']].forEach(([size, label]) => { if (dollars >= size) { words.push(small(Math.floor(dollars / size)), label); dollars %= size; } });
        if (dollars) words.push(small(dollars));
        if (!words.length) words.push('ZERO');
        return `${words.join(' ')} US DOLLARS${cents ? ` AND ${small(cents)} CENTS` : ''} ONLY`;
    }

    // Auto Invoice Generation
    btnGenInvNo.addEventListener('click', () => {
        const rand = Math.floor(1000 + Math.random() * 9000);
        const code = `SKY-BBB-2026-${rand}`;
        inputInvNo.value = code;
        updateCalculationsAndPreview();
        updateQrCode();
    });

    // QR Code generation
    let qrcodeInstance = null;
    function updateQrCode() {
        const qrContent = inputTrackingUrl.value || `Invoice: ${inputInvNo.value}`;
        const qrContainer = document.getElementById("qrcode-canvas");
        qrContainer.innerHTML = "";
        
        try {
            qrcodeInstance = new QRCode(qrContainer, {
                text: qrContent,
                width: 58,
                height: 58,
                colorDark : "#0F172A",
                colorLight : "#FFFFFF",
                correctLevel : QRCode.CorrectLevel.M
            });
        } catch (e) {
            console.error("QR Code library error:", e);
            qrContainer.innerText = "[QR]";
        }
    }

    // ---------------------------------------------------------
    // 8. Main Calculation & Translation Engine
    // ---------------------------------------------------------
    function updateCalculationsAndPreview() {
        const activeLang = langSwitcher.value;

        // Apply RTL / Amiri fonts for Persian and Pashto
        if (activeLang === 'fa' || activeLang === 'ps') {
            invoicePage.classList.add('rtl-layout');
        } else {
            invoicePage.classList.remove('rtl-layout');
        }

        // Apply translations on document elements with [data-translate]
        const translateElements = document.querySelectorAll('[data-translate]');
        translateElements.forEach(el => {
            const key = el.getAttribute('data-translate');
            if (translations[activeLang] && translations[activeLang][key]) {
                el.innerText = translations[activeLang][key];
            }
        });

        // Basic direct text/value bindings
        viewInvNo.innerText = inputInvNo.value;
        viewRefNo.innerText = inputRefNo.value;
        viewInvDate.innerText = formatDateString(inputInvDate.value);
        viewDueDate.innerText = formatDateString(inputDueDate.value);
        const viewSigDate = document.getElementById('view-sig-date');
        if (viewSigDate) viewSigDate.innerText = formatDateString(inputInvDate.value);
        
        const currencyVal = inputCurrency.value;
        viewCurrency.innerText = `${currencyVal} (${getCurrencySymbol(currencyVal)})`;
        viewCurrencyLbl.innerText = currencyVal;

        // Exporter/Seller Info
        viewCompanyName.innerText = inputCompanyName.value;
        if (viewCompanyAddr) viewCompanyAddr.innerText = inputCompanyAddr.value;
        if (viewCompanyPhone) viewCompanyPhone.innerText = inputCompanyPhone.value;
        if (viewCompanyEmail) viewCompanyEmail.innerText = inputCompanyEmail.value;
        if (viewCompanyWeb) viewCompanyWeb.innerText = inputCompanyWeb.value;
        if (viewCompanyTax) viewCompanyTax.innerText = inputCompanyTax.value;
        if (viewCompanyLicense) viewCompanyLicense.innerText = inputCompanyLicense.value;

        // Exporter card duplicates
        viewCompanyNameCard.innerText = inputCompanyName.value;
        viewCompanyAddrCard.innerText = inputCompanyAddr.value;
        viewCompanyTaxCard.innerText = inputCompanyTax.value;
        viewCompanyLicenseCard.innerText = inputCompanyLicense.value;
        
        const viewCompanyPhoneCard = document.getElementById('view-company-phone-card');
        const viewCompanyEmailCard = document.getElementById('view-company-email-card');
        if (viewCompanyPhoneCard) viewCompanyPhoneCard.innerText = inputCompanyPhone.value;
        if (viewCompanyEmailCard) viewCompanyEmailCard.innerText = inputCompanyEmail.value;

        // Buyer Info
        viewBuyerName.innerText = inputBuyerName.value;
        viewBuyerContact.innerText = inputBuyerContact.value;
        viewBuyerAddr.innerText = inputBuyerAddr.value;
        viewBuyerCountry.innerText = inputBuyerCountry.value;
        viewBuyerTax.innerText = inputBuyerTax.value;
        viewBuyerPhone.innerText = inputBuyerPhone.value;
        viewBuyerEmail.innerText = inputBuyerEmail.value;

        // Notify Party Info: the static legacy preview must never reuse a prior party.
        const notifyValues = [inputNotifyName.value, inputNotifyAddr.value, inputNotifyLicense.value]
            .map(value => String(value || '').trim());
        const hasNotifyParty = notifyValues.some(Boolean);
        if (viewNotifyEmpty) viewNotifyEmpty.hidden = hasNotifyParty;
        const syncNotifyLine = (element, value) => {
            if (!element) return;
            element.innerText = value;
            const line = element.closest('p');
            if (line) line.hidden = !value;
        };
        syncNotifyLine(viewNotifyName, notifyValues[0]);
        syncNotifyLine(viewNotifyAddr, notifyValues[1]);
        syncNotifyLine(viewNotifyLicense, notifyValues[2]);

        // Shipment Grid Info
        viewShipBooking.innerText = inputShipBooking.value;
        viewShipBl.innerText = inputShipBl.value;
        viewShipContainer.innerText = inputShipContainer.value;
        
        // Dynamic select values for container type
        const typeSelect = inputShipType.value;
        let typeText = "40' HC Container";
        if (typeSelect === '20GP') typeText = "20' GP Container";
        else if (typeSelect === '40RF') typeText = "40' RF Reefer";
        else if (typeSelect === 'AIR') typeText = "Air Cargo Consolidation";
        viewShipType.innerText = typeText;

        viewShipSeal.innerText = inputShipSeal.value;
        viewShipCommodity.innerText = inputShipCommodity.value;
        viewShipHscode.innerText = inputShipHscode.value;
        viewShipIncoterms.innerText = inputShipIncoterms.value;
        
        const grossVal = parseFloat(inputShipGross.value);
        viewShipGross.innerText = isNaN(grossVal) ? inputShipGross.value : `${grossVal.toLocaleString()} kg`;
        const netVal = parseFloat(inputShipNet.value);
        viewShipNet.innerText = isNaN(netVal) ? inputShipNet.value : `${netVal.toLocaleString()} kg`;
        const pkgsVal = parseInt(inputShipPackages.value);
        viewShipPackages.innerText = isNaN(pkgsVal) ? inputShipPackages.value : `${pkgsVal} PKGS`;
        
        viewShipLine.innerText = inputShipLine.value;
        viewShipOrigin.innerText = inputShipOrigin.value;
        viewShipDest.innerText = inputShipDest.value;
        viewShipPol.innerText = inputShipPol.value;
        viewShipPod.innerText = inputShipPod.value;
        viewShipVessel.innerText = inputShipVessel.value;
        viewShipVoyage.innerText = inputShipVoyage.value;
        viewShipEtd.innerText = formatDateString(inputShipEtd.value);
        viewShipEta.innerText = formatDateString(inputShipEta.value);

        // Extra Air Cargo fields
        if (viewShipCargoWeight) viewShipCargoWeight.innerText = inputShipCargoWeight.value;
        if (viewShipTotalWeight) viewShipTotalWeight.innerText = inputShipTotalWeight.value;
        if (viewShipMode) viewShipMode.innerText = inputShipMode.value;
        if (viewShipRoute) viewShipRoute.innerText = inputShipRoute.value;
        if (viewShipCargoDesc) viewShipCargoDesc.innerText = inputShipCargoDesc.value;

        // Status Badges Styling
        const status = inputStatus.value;
        viewStatusBadge.innerText = status.toUpperCase();
        viewStatusBadge.className = "status-badge"; // Reset classes
        if (status === 'paid') {
            viewStatusBadge.classList.add('paid');
            if (translations[activeLang]["paid"]) viewStatusBadge.innerText = translations[activeLang]["paid"].toUpperCase();
        } else if (status === 'unpaid') {
            viewStatusBadge.classList.add('unpaid');
            if (translations[activeLang]["unpaid"]) viewStatusBadge.innerText = translations[activeLang]["unpaid"].toUpperCase();
        } else {
            viewStatusBadge.classList.add('partial');
            if (translations[activeLang]["partial"]) viewStatusBadge.innerText = translations[activeLang]["partial"].toUpperCase();
        }

        // Bank Details
        viewBankName.innerText = inputBankName.value;
        viewBankAccName.innerText = inputBankAccName.value;
        viewBankAccNum.innerText = inputBankAccNum.value;
        viewBankIban.innerText = inputBankIban.value;
        viewBankSwift.innerText = inputBankSwift.value;
        viewBankTerms.innerText = inputBankTerms.value;
        
        if (viewBankBranch) viewBankBranch.innerText = inputBankBranch.value;
        if (viewBankAddress) viewBankAddress.innerText = inputBankAddress.value;

        // Declarations Terms
        viewTerms.innerText = inputTerms.value;

        // Signatory Title
        viewSigName.innerText = inputSigName.value;
        viewSigTitle.innerText = inputSigTitle.value;
        
        // Digital approval stamp text
        const stampText = inputSigStamp.value.trim().toUpperCase();
        viewStamp.innerHTML = `<span class="stamp-inner-text">${stampText}</span>`;

        // Render Table Items & Subtotal
        let subtotal = 0;
        itemsTbody.innerHTML = "";

        const freightRate = Math.max(0, Number(inputChargeFreight.value) || 0);
        invoiceItems.forEach((item, index) => {
            const itemTotal = item.quantity * item.unitPrice;
            subtotal += itemTotal;

            const tr = document.createElement("tr");
            
            // Format Weight (e.g. 12,000 KG)
            const formattedWeight = typeof item.quantity === 'number' ? item.quantity.toLocaleString() : item.quantity;
            
            // Format Rate (e.g. USD 1.60 PER KG)
            const safeRate = Number(item.unitPrice) || 0;
            const safeQuantity = Number(item.quantity) || 0;
            const formattedRate = `${currencyVal} ${safeRate.toFixed(2)}`;

            tr.innerHTML = `
                <td class="text-center">${index + 1}</td>
                <td><strong>${item.description}</strong></td>
                <td class="text-center">${formattedWeight}</td>
                <td class="text-center">${item.unit || '—'}</td>
                <td class="text-center">${formattedRate}</td>
                <td class="text-right"><strong>${formatCurrencyVal(Math.round((safeQuantity * safeRate + Number.EPSILON) * 100) / 100)}</strong></td>
            `;
            itemsTbody.appendChild(tr);
        });

        // Render the commercial-goods row with separate goods, freight and CIF rates.
        itemsTbody.innerHTML = '';
        invoiceItems.forEach((item, index) => {
            const quantity = Math.max(0, Number(item.quantity) || 0);
            const goodsRate = Math.max(0, Number(item.unitPrice) || 0);
            const cifUnitRate = roundCurrency(goodsRate + freightRate);
            const row = document.createElement('tr');
            row.innerHTML = `<td class="text-center">${index + 1}</td><td><strong>${item.description}</strong></td><td class="text-center">${item.hsCode || '—'}</td><td class="text-right">${quantity.toLocaleString('en-US')}</td><td class="text-center">${item.unit || 'KG'}</td><td class="text-right">${formatCurrencyVal(goodsRate)} / KG</td><td class="text-right">${formatCurrencyVal(freightRate)} / KG</td><td class="text-right">${formatCurrencyVal(cifUnitRate)} / KG</td><td class="text-right"><strong>${formatCurrencyVal(roundCurrency(quantity * cifUnitRate))}</strong></td>`;
            itemsTbody.appendChild(row);
        });

        // Financial Calculations & VAT
        const weight = Math.max(0, Number(inputShipNet.value) || 0);
        const freight = roundCurrency(weight * freightRate);
        const insurance = Math.max(0, roundCurrency(inputChargeInsurance.value));
        const customs = parseFloat(inputChargeCustoms.value) || 0;
        const docs = parseFloat(inputChargeDocs.value) || 0;
        const handling = parseFloat(inputChargeHandling.value) || 0;
        const discount = parseFloat(inputChargeDiscount.value) || 0;
        const taxRate = parseFloat(inputChargeTax.value) || 0;

        // Calculate VAT/Tax on subtotal + freight + logistics fees
        const taxableAmount = roundCurrency(subtotal + freight + insurance);
        const calculatedTax = roundCurrency((customs + docs + handling - discount) * (taxRate / 100));
        const grandTotal = taxableAmount;

        // Bind Financial fields
        viewSubtotal.innerText = formatCurrencyVal(subtotal);
        viewFreight.innerText = formatCurrencyVal(freight);
        viewInsurance.innerText = formatCurrencyVal(insurance);
        viewCustoms.innerText = formatCurrencyVal(customs);
        viewDocs.innerText = formatCurrencyVal(docs);
        viewHandling.innerText = formatCurrencyVal(handling);
        viewDiscount.innerText = `-${formatCurrencyVal(discount)}`;
        viewTaxRate.innerText = `${taxRate}%`;
        viewTax.innerText = formatCurrencyVal(calculatedTax);
        viewGrandTotal.innerText = formatCurrencyVal(grandTotal);

        const amountWords = numberToWords(grandTotal);
        inputAmountWords.value = amountWords;
        if (viewAmountWords) viewAmountWords.innerText = amountWords;
        const primaryGoodsRate = Math.max(0, Number(invoiceItems[0]?.unitPrice) || 0);
        document.getElementById('calc-goods-value').innerText = formatCurrencyVal(subtotal);
        document.getElementById('calc-freight-value').innerText = formatCurrencyVal(freight);
        document.getElementById('calc-cif-rate').innerText = `${formatCurrencyVal(roundCurrency(primaryGoodsRate + freightRate))} / KG`;
        document.getElementById('calc-cif-total').innerText = formatCurrencyVal(grandTotal);
        document.getElementById('view-delivery-term').innerText = inputShipIncoterms.value;
        saveInvoiceState();
    }

    // ---------------------------------------------------------
    // 9. Interactive Item Controls
    // ---------------------------------------------------------
    function renderEditorItems() {
        itemsListContainer.innerHTML = "";
        invoiceItems.forEach((item, index) => {
            const card = document.createElement("div");
            card.className = "item-entry-card";
            card.innerHTML = `
                <button type="button" class="btn-remove-item" data-index="${index}" title="Remove Item">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
                <div class="item-entry-header">Item #${index + 1}</div>
                <div class="form-group">
                    <label>Description of Goods</label>
                    <input type="text" class="item-desc" data-index="${index}" value="${item.description}">
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>HS Code</label>
                        <input type="text" class="item-hs" data-index="${index}" value="${item.hsCode}">
                    </div>
                    <div class="form-group">
                        <label>Unit (e.g. PCS)</label>
                        <input type="text" class="item-unit" data-index="${index}" value="${item.unit}">
                    </div>
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>Quantity</label>
                        <input type="number" class="item-qty" data-index="${index}" min="1" step="1" value="${item.quantity}">
                    </div>
                    <div class="form-group">
                        <label>Goods Rate per KG</label>
                        <input type="number" class="item-price" data-index="${index}" min="0" step="0.01" value="${item.unitPrice}">
                    </div>
                </div>
            `;
            itemsListContainer.appendChild(card);
        });

        bindItemInputListeners();
    }

    function bindItemInputListeners() {
        document.querySelectorAll('.item-desc').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.index);
                invoiceItems[idx].description = e.target.value;
                updateCalculationsAndPreview();
            });
        });

        document.querySelectorAll('.item-hs').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.index);
                invoiceItems[idx].hsCode = e.target.value;
                updateCalculationsAndPreview();
            });
        });

        document.querySelectorAll('.item-unit').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.index);
                invoiceItems[idx].unit = e.target.value.toUpperCase();
                updateCalculationsAndPreview();
            });
        });

        document.querySelectorAll('.item-qty').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.index);
                invoiceItems[idx].quantity = parseInt(e.target.value) || 0;
                updateCalculationsAndPreview();
            });
        });

        document.querySelectorAll('.item-price').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.index);
                invoiceItems[idx].unitPrice = parseFloat(e.target.value) || 0;
                updateCalculationsAndPreview();
            });
        });

        document.querySelectorAll('.btn-remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.index);
                invoiceItems.splice(idx, 1);
                renderEditorItems();
                updateCalculationsAndPreview();
            });
        });
    }

    addItemBtn.addEventListener('click', () => {
        invoiceItems.push({
            description: "New Logistics Product Line Item",
            hsCode: "0000.00.00",
            quantity: 1,
            unit: "PCS",
            unitPrice: 0.00
        });
        renderEditorItems();
        updateCalculationsAndPreview();
    });

    // ---------------------------------------------------------
    // 10. Excel / CSV Data Export Function
    // ---------------------------------------------------------
    excelExportBtn.addEventListener('click', () => {
        let csvContent = "";
        
        // Helper to escape values for CSV to prevent syntax issues
        const csvEscape = (val) => {
            if (val === undefined || val === null) return "";
            return `"${String(val).replace(/"/g, '""')}"`;
        };
        
        // Add corporate headers
        csvContent += `${csvEscape("Sky Ariana & Balam Bar Baran Commercial Invoice Data")}\n`;
        csvContent += `${csvEscape("Invoice No.")},${csvEscape(inputInvNo.value)},${csvEscape("Reference No.")},${csvEscape(inputRefNo.value)}\n`;
        csvContent += `${csvEscape("Invoice Date")},${csvEscape(inputInvDate.value)},${csvEscape("Due Date")},${csvEscape(inputDueDate.value)}\n\n`;

        // Parties details
        csvContent += `${csvEscape("Exporter/Seller")},${csvEscape(inputCompanyName.value)},${csvEscape("Importer/Buyer")},${csvEscape(inputBuyerName.value)},${csvEscape("Notify Party")},${csvEscape(inputNotifyName.value)}\n\n`;

        // Logistics Details
        csvContent += `${csvEscape("Booking No.")},${csvEscape(inputShipBooking.value)},${csvEscape("B/L AWB No.")},${csvEscape(inputShipBl.value)}\n`;
        csvContent += `${csvEscape("Container No.")},${csvEscape(inputShipContainer.value)},${csvEscape("Container/Equipment Type")},${csvEscape(inputShipType.value)}\n`;
        csvContent += `${csvEscape("Mode of Trans.")},${csvEscape(inputShipMode.value)},${csvEscape("Route")},${csvEscape(inputShipRoute.value)}\n`;
        csvContent += `${csvEscape("Cargo Weight")},${csvEscape(inputShipCargoWeight.value)},${csvEscape("Total Weight")},${csvEscape(inputShipTotalWeight.value)}\n`;
        csvContent += `${csvEscape("Gross Weight (kg)")},${csvEscape(inputShipGross.value)},${csvEscape("Net Weight (kg)")},${csvEscape(inputShipNet.value)}\n`;
        csvContent += `${csvEscape("Packages")},${csvEscape(inputShipPackages.value)},${csvEscape("Incoterms")},${csvEscape(inputShipIncoterms.value)}\n`;
        csvContent += `${csvEscape("Origin")},${csvEscape(inputShipOrigin.value)},${csvEscape("Destination")},${csvEscape(inputShipDest.value)}\n`;
        csvContent += `${csvEscape("Place of Loading")},${csvEscape(inputShipPol.value)},${csvEscape("Dest. Airport/Port")},${csvEscape(inputShipPod.value)}\n`;
        csvContent += `${csvEscape("Cargo Description")},${csvEscape(inputShipCargoDesc.value)}\n\n`;

        // Table headers
        csvContent += `${csvEscape("No.")},${csvEscape("Description")},${csvEscape("HS Code")},${csvEscape("Quantity")},${csvEscape("Unit")},${csvEscape("Unit Price")},${csvEscape("Total Price")}\n`;

        // Add line items
        let subtotal = 0;
        invoiceItems.forEach((item, index) => {
            const lineTotal = item.quantity * item.unitPrice;
            subtotal += lineTotal;
            csvContent += `"${index + 1}",${csvEscape(item.description)},${csvEscape(item.hsCode)},"${item.quantity}",${csvEscape(item.unit)},"${item.unitPrice}","${lineTotal}"\n`;
        });

        // Totals
        const freight = parseFloat(inputChargeFreight.value) || 0;
        const insurance = parseFloat(inputChargeInsurance.value) || 0;
        const customs = parseFloat(inputChargeCustoms.value) || 0;
        const docs = parseFloat(inputChargeDocs.value) || 0;
        const handling = parseFloat(inputChargeHandling.value) || 0;
        const discount = parseFloat(inputChargeDiscount.value) || 0;
        const taxRate = parseFloat(inputChargeTax.value) || 0;

        const taxableAmount = subtotal + freight + insurance + customs + docs + handling - discount;
        const calculatedTax = taxableAmount * (taxRate / 100);
        const grandTotal = taxableAmount + calculatedTax;

        csvContent += `\n`;
        csvContent += `,,,,"Subtotal","${subtotal}"\n`;
        csvContent += `,,,,"Freight","${freight}"\n`;
        csvContent += `,,,,"Insurance","${insurance}"\n`;
        csvContent += `,,,,"Customs Clearance","${customs}"\n`;
        csvContent += `,,,,"Documentation Fee","${docs}"\n`;
        csvContent += `,,,,"Handling Fees","${handling}"\n`;
        csvContent += `,,,,"Loyalty Discount","-${discount}"\n`;
        csvContent += `,,,,"Sales Tax / VAT (${taxRate}%)","${calculatedTax}"\n`;
        csvContent += `,,,,"GRAND TOTAL (${inputCurrency.value})","${grandTotal}"\n\n`;

        // Beneficiary Bank details
        csvContent += `${csvEscape("Beneficiary Bank")},${csvEscape(inputBankName.value)},${csvEscape("Bank Branch")},${csvEscape(inputBankBranch.value)}\n`;
        csvContent += `${csvEscape("Account Number")},${csvEscape(inputBankAccNum.value)},${csvEscape("SWIFT Code")},${csvEscape(inputBankSwift.value)}\n`;
        csvContent += `${csvEscape("Bank Address")},${csvEscape(inputBankAddress.value)}\n`;

        // Create a blob with UTF-8 BOM to ensure Excel opens Persian/Pashto text correctly
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const link = document.createElement("a");
        if (navigator.msSaveBlob) { // IE 10+
            navigator.msSaveBlob(blob, `COMMERCIAL_INVOICE_${inputInvNo.value}.csv`);
        } else {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `COMMERCIAL_INVOICE_${inputInvNo.value}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    });

    // ---------------------------------------------------------
    // 11. Presets Configurations (Ocean Cargo / Air Freight)
    // ---------------------------------------------------------
    // Preset 1: Ocean Cargo Dubai to Kabul
    loadPreset1Btn.addEventListener('click', () => {
        // Set Header
        inputInvNo.value = "SKY-BBB-2026-9042";
        inputRefNo.value = "REF-A81093-X";
        inputCurrency.value = "USD";
        inputStatus.value = "unpaid";
        
        // Exporter
        inputCompanyName.value = "Sky Ariana & Balam Bar Baran Logistics Ltd.";
        inputCompanyAddr.value = "Suite 12, Ariana Logistics Plaza, Airport Road, Kabul, Afghanistan";
        inputCompanyPhone.value = "+93 79 912 3456 / +93 78 898 7654";
        inputCompanyEmail.value = "ops@sky-balam.com";
        inputCompanyWeb.value = "www.sky-balam.com";
        inputCompanyTax.value = "TIN-90812490-K";
        inputCompanyLicense.value = "L-AFG-908234-BBB";

        // Buyer
        inputBuyerName.value = "Asia Transit Trading LLC";
        inputBuyerContact.value = "Ahmad Wali (Operations Manager)";
        inputBuyerAddr.value = "Sector 3, Zarghoon Boulevard, Kandahar, Afghanistan";
        inputBuyerCountry.value = "Afghanistan";
        inputBuyerPhone.value = "+93 70 011 2233";
        inputBuyerEmail.value = "transit@asiatrading.af";
        inputBuyerTax.value = "TIN-77890124-T";

        // Shipping
        inputShipBooking.value = "BKG-908124";
        inputShipBl.value = "BL-SABBB-440129";
        inputShipContainer.value = "SABU-890471-2";
        inputShipType.value = "40HC";
        inputShipSeal.value = "SL-908722";
        inputShipCommodity.value = "Electronics & IT Hardware";
        inputShipHscode.value = "8471.30.10";
        inputShipGross.value = "14250.0";
        inputShipNet.value = "13800.0";
        inputShipPackages.value = "450";
        inputShipOrigin.value = "United Arab Emirates";
        inputShipDest.value = "Afghanistan";
        inputShipPol.value = "Port Jebel Ali, Dubai (AEJEA)";
        inputShipPod.value = "Kabul Customs Depot, AFG";
        inputShipVessel.value = "Ariana Sea Express";
        inputShipVoyage.value = "V.045E";
        inputShipLine.value = "Sky Ariana Logistics Line";
        inputShipIncoterms.value = "DDP";

        // Financials
        inputChargeFreight.value = "1850.00";
        inputChargeInsurance.value = "220.00";
        inputChargeCustoms.value = "450.00";
        inputChargeDocs.value = "75.00";
        inputChargeHandling.value = "130.00";
        inputChargeDiscount.value = "100.00";
        inputChargeTax.value = "4.0";

        // Bank Details
        inputBankName.value = "Kabul Bank (Corporate Division)";
        inputBankAccName.value = "Sky Ariana Logistics Ltd.";
        inputBankAccNum.value = "8942-01124-7809";
        inputBankIban.value = "AF89KABL0008942011247809";
        inputBankSwift.value = "KABLAFKBAXXX";
        inputBankTerms.value = "Net 30 days from ETD date";
        inputTerms.value = "Goods sold as per agreed contract. Payment according to agreed terms. All disputes subject to seller's jurisdiction.";

        // Signature Info
        inputSigName.value = "M. Balam";
        inputSigTitle.value = "Director Operations, BBB";
        inputSigStamp.value = "SKY-BBB LOGISTICS DEPT.";
        inputTrackingUrl.value = "https://tracking.skyariana.com/bl/BL-SABBB-440129";

        // Items
        invoiceItems = [
            {
                description: "Industrial Solar Panel Inverters (5KW Hybrid PLC)",
                hsCode: "8504.40.90",
                quantity: 12,
                unit: "PCS",
                unitPrice: 680.00
            },
            {
                description: "Heavy Duty Lithium-Ion Battery Storage Rack (48V 200Ah)",
                hsCode: "8507.60.00",
                quantity: 8,
                unit: "UNITS",
                unitPrice: 1850.00
            }
        ];

        renderEditorItems();
        updateCalculationsAndPreview();
        updateQrCode();
    });

    // Preset 2: Air Freight Istanbul to Kabul
    loadPreset2Btn.addEventListener('click', () => {
        // Set Header
        inputInvNo.value = "SKY-BBB-2026-AF804";
        inputRefNo.value = "REF-B22984-Z";
        inputCurrency.value = "EUR";
        inputStatus.value = "paid";
        
        // Exporter
        inputCompanyName.value = "Sky Ariana & Balam Bar Baran Logistics Ltd.";
        inputCompanyAddr.value = "Suite 12, Ariana Logistics Plaza, Airport Road, Kabul, Afghanistan";
        inputCompanyPhone.value = "+93 79 912 3456 / +93 78 898 7654";
        inputCompanyEmail.value = "ops@sky-balam.com";
        inputCompanyWeb.value = "www.sky-balam.com";
        inputCompanyTax.value = "TIN-90812490-K";
        inputCompanyLicense.value = "L-AFG-908234-BBB";

        // Buyer
        inputBuyerName.value = "Kabul Merchant & Distributors Co.";
        inputBuyerContact.value = "Mustafa Qaderi (Purchasing Director)";
        inputBuyerAddr.value = "Building 45, Cinema Zainab St, Shahr-e-Naw, Kabul, Afghanistan";
        inputBuyerCountry.value = "Afghanistan";
        inputBuyerPhone.value = "+93 79 334 5566";
        inputBuyerEmail.value = "import@kabulmerchants.af";
        inputBuyerTax.value = "TIN-39014589-M";

        // Shipping details (Air cargo specifics)
        inputShipBooking.value = "BKG-AF-55018";
        inputShipBl.value = "AWB-220-90812349";
        inputShipContainer.value = "ULD-AKE-88914-SKY";
        inputShipType.value = "AIR";
        inputShipSeal.value = "N/A - AIR SECURITY";
        inputShipCommodity.value = "Pharmaceutical Products & Cold Chain Medical Supplies";
        inputShipHscode.value = "3004.90.99";
        inputShipGross.value = "1250.0";
        inputShipNet.value = "1180.0";
        inputShipPackages.value = "85";
        inputShipOrigin.value = "Turkey";
        inputShipDest.value = "Afghanistan";
        inputShipPol.value = "Istanbul Airport, Turkey (IST)";
        inputShipPod.value = "Kabul Airport, AFG (KBL)";
        inputShipVessel.value = "Lufthansa Cargo Flight";
        inputShipVoyage.value = "LH-8440";
        inputShipLine.value = "Lufthansa Cargo Service";
        inputShipIncoterms.value = "CIF";

        // Financials (in EUR, UI binds calculations dynamically)
        inputChargeFreight.value = "3850.00";
        inputChargeInsurance.value = "480.00";
        inputChargeCustoms.value = "250.00";
        inputChargeDocs.value = "120.00";
        inputChargeHandling.value = "90.00";
        inputChargeDiscount.value = "150.00";
        inputChargeTax.value = "2.0";

        // Bank Details
        inputBankName.value = "Kabul Bank (Corporate Division)";
        inputBankAccName.value = "Sky Ariana Logistics Ltd.";
        inputBankAccNum.value = "8942-01124-7809";
        inputBankIban.value = "AF89KABL0008942011247809";
        inputBankSwift.value = "KABLAFKBAXXX";
        inputBankTerms.value = "Advanced Payment Settlement";
        inputTerms.value = "Cold chain logistics protocol strictly enforced.\nDelivery terms: CIP Kabul Airport.\nPayment terms: Advanced T/T Settlement.";

        // Signature Info
        inputSigName.value = "Mustafa Balam";
        inputSigTitle.value = "VP of Air Operations, BBB";
        inputSigStamp.value = "SKY-BBB AIR LOGISTICS DEPT.";
        inputTrackingUrl.value = "https://tracking.skyariana.com/air/AWB-220-90812349";

        // Items
        invoiceItems = [
            {
                description: "Thermostatic Vaccines Carrier Units (Temp Controlled)",
                hsCode: "3822.19.00",
                quantity: 5,
                unit: "PLTS",
                unitPrice: 3200.00
            },
            {
                description: "Medical Grade Sterile Packaging Syringes (Box of 500)",
                hsCode: "9018.31.00",
                quantity: 40,
                unit: "BOXES",
                unitPrice: 85.00
            }
        ];

        renderEditorItems();
        updateCalculationsAndPreview();
        updateQrCode();
    });

    // ---------------------------------------------------------
    // 12. Input Listeners & Initialize
    // ---------------------------------------------------------
    // Listeners for Language Switch
    langSwitcher.addEventListener('change', () => {
        updateCalculationsAndPreview();
        // Clear and redraw databases text options depending on currency / lang
        selectProductDb.innerHTML = '<option value="">-- Add Saved Product --</option>';
        productDatabase.forEach(prod => {
            const opt = document.createElement('option');
            opt.value = prod.id;
            opt.textContent = `${prod.description} [${prod.hsCode}] - ${getCurrencySymbol(inputCurrency.value)}${prod.price}`;
            selectProductDb.appendChild(opt);
        });
    });

    // General listener for all inputs to bind to A4 preview instantly
    const formInputs = [
        inputInvNo, inputRefNo, inputInvDate, inputDueDate, inputCurrency, inputStatus,
        inputCompanyName, inputCompanyAddr, inputCompanyPhone, inputCompanyEmail, inputCompanyWeb, inputCompanyTax, inputCompanyLicense,
        inputBuyerName, inputBuyerContact, inputBuyerAddr, inputBuyerCountry, inputBuyerPhone, inputBuyerEmail, inputBuyerTax,
        inputNotifyName, inputNotifyAddr, inputNotifyLicense,
        inputShipBooking, inputShipBl, inputShipContainer, inputShipType, inputShipSeal, inputShipCommodity, inputShipHscode,
        inputShipGross, inputShipNet, inputShipPackages, inputShipOrigin, inputShipDest,
        inputShipPol, inputShipPod, inputShipVessel, inputShipVoyage, inputShipLine, inputShipEtd, inputShipEta, inputShipIncoterms,
        inputShipCargoWeight, inputShipTotalWeight, inputShipMode, inputShipRoute, inputShipCargoDesc,
        inputChargeFreight, inputChargeInsurance, inputChargeCustoms, inputChargeDocs, inputChargeHandling, inputChargeDiscount, inputChargeTax,
        inputAmountWords,
        inputBankName, inputBankAccName, inputBankAccNum, inputBankIban, inputBankSwift, inputBankTerms, inputBankBranch, inputBankAddress, inputTerms,
        inputSigName, inputSigTitle, inputSigStamp, inputTrackingUrl
    ];

    formInputs.forEach(input => {
        input.addEventListener('input', () => {
            updateCalculationsAndPreview();
        });
    });

    // Specials
    inputInvNo.addEventListener('change', updateQrCode);
    inputTrackingUrl.addEventListener('change', updateQrCode);
    inputCurrency.addEventListener('change', () => {
        updateCalculationsAndPreview();
    });

    // Theme Switcher Layout
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', nextTheme);
        
        const icon = themeToggleBtn.querySelector('i');
        if (nextTheme === 'light') {
            icon.className = 'fa-solid fa-sun';
            themeToggleBtn.title = 'Switch to Dark Mode';
        } else {
            icon.className = 'fa-solid fa-moon';
            themeToggleBtn.title = 'Switch to Light Mode';
        }
    });

    // Print utility
    printBtn.addEventListener('click', () => {
        window.print();
    });
    previewPrintBtn?.addEventListener('click', () => window.print());
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => setPreviewZoom(previewZoom + .1));
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => setPreviewZoom(previewZoom - .1));
    document.getElementById('btn-actual')?.addEventListener('click', () => setPreviewZoom(1));
    document.getElementById('btn-fit')?.addEventListener('click', fitPreview);
    inputShipType.addEventListener('change', updateTransportLayout); inputShipMode.addEventListener('input', updateTransportLayout); window.addEventListener('resize', fitPreview);

    // Persist source fields only; all totals are recalculated when restored.
    const invoiceStateKey = 'sky-commercial-invoice-v2';
    function saveInvoiceState() {
        const fields = {};
        document.querySelectorAll('.control-panel input[id], .control-panel select[id], .control-panel textarea[id]').forEach(field => {
            if (field.type !== 'file' && !field.readOnly) fields[field.id] = field.value;
        });
        localStorage.setItem(invoiceStateKey, JSON.stringify({ fields, invoiceItems }));
    }
    function loadInvoiceState() {
        try {
            const saved = JSON.parse(localStorage.getItem(invoiceStateKey) || 'null');
            if (!saved) return;
            Object.entries(saved.fields || {}).forEach(([id, value]) => { const field = document.getElementById(id); if (field && field.type !== 'file') field.value = value; });
            if (Array.isArray(saved.invoiceItems) && saved.invoiceItems.length) invoiceItems = saved.invoiceItems;
        } catch (error) { console.warn('Saved invoice could not be restored.', error); }
    }
    document.querySelectorAll('.control-panel input, .control-panel select, .control-panel textarea').forEach(field => {
        const persist = () => { if (field.type === 'number' && Number(field.value) < 0) { field.value = '0'; field.setAttribute('aria-invalid', 'true'); } else field.removeAttribute('aria-invalid'); saveInvoiceState(); };
        field.addEventListener('change', persist);
        field.addEventListener('input', persist);
    });

    // Start-up Initializers
    loadInvoiceState();
    initDatabaseOptions();
    renderEditorItems();
    updateCalculationsAndPreview();
    updateQrCode();
    loadOfficeSettings();
    updateTransportLayout(); requestAnimationFrame(fitPreview);
});
