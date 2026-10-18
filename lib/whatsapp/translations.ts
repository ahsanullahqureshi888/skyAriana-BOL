import type { WhatsAppLanguage } from "./message-types"

/**
 * Directional Isolation:
 * In RTL scripts (Persian, Pashto, Urdu), numbers, BOL codes, container numbers,
 * and dates can scramble if not isolated with Left-to-Right Mark (\u200E).
 */
export function ltrIsolate(text: string | number | undefined | null): string {
  if (!text && text !== 0) return ""
  return `\u200E${String(text)}\u200E`
}

export function rtlIsolate(text: string | number | undefined | null): string {
  if (!text && text !== 0) return ""
  return `\u200F${String(text)}\u200F`
}

export interface StatusTranslationNarrative {
  en: (loc: string, dest?: string, next?: string, vessel?: string) => string
  fa: (loc: string, dest?: string, next?: string, vessel?: string) => string
  ps: (loc: string, dest?: string, next?: string, vessel?: string) => string
  ur: (loc: string, dest?: string, next?: string, vessel?: string) => string
  hi: (loc: string, dest?: string, next?: string, vessel?: string) => string
}

export const STATUS_NARRATIVES: Record<string, StatusTranslationNarrative> = {
  cargo_loaded: {
    en: (loc) => `Cargo has been safely loaded at ${loc} and is preparing for transit.`,
    fa: (loc) => `بارگیری کالا در ${loc} با موفقیت انجام شد و آماده حرکت به مسیر ترانزیت می‌باشد.`,
    ps: (loc) => `توکي په ${loc} کې په خوندي ډول بار شوي او د تګ لپاره چمتو دي.`,
    ur: (loc) => `کارگو ${loc} پر بحفاظت لوڈ ہو چکا ہے اور روانگی کے لیے تیار ہے۔`,
    hi: (loc) => `कार्गो को ${loc} पर सुरक्षित रूप से लोड कर दिया गया है और रवानगी के लिए तैयार है।`,
  },
  in_transit: {
    en: (loc, dest) =>
      dest ? `The shipment is currently in transit through ${loc} proceeding toward ${dest}.` : `The shipment is currently in transit through ${loc}.`,
    fa: (loc, dest) =>
      dest ? `محموله در حال حاضر در مسیر ترانزیت از طریق ${loc} به سمت ${dest} در حرکت است.` : `محموله در حال حاضر در مسیر ترانزیت از طریق ${loc} در حرکت است.`,
    ps: (loc, dest) =>
      dest ? `بار دا مهال له ${loc} څخه د ${dest} په لور په ترانزیتي حرکت کې دی.` : `بار دا مهال په ${loc} کې د ترانزیت په حال کې دی.`,
    ur: (loc, dest) =>
      dest ? `کھیپ اس وقت ${loc} سے گزرتے ہوئے ${dest} کی طرف روانہ ہے۔` : `کھیپ اس وقت ${loc} سے ترانزٹ میں ہے۔`,
    hi: (loc, dest) =>
      dest ? `शिपमेंट वर्तमान में ${loc} से होते हुए ${dest} की ओर अग्रसर है।` : `शिपमेंट वर्तमान में ${loc} के माध्यम से पारगमन में है।`,
  },
  at_border: {
    en: (loc) => `The truck has reached ${loc} and is awaiting border customs processing.`,
    fa: (loc) => `لاری به مرز ${loc} رسیده و در انتظار انجام تشریفات گمرکی مرزی می‌باشد.`,
    ps: (loc) => `موټر د ${loc} پولې ته رسیدلی او د ګمرکي پړاوونو د تېرېدو په تمه دی.`,
    ur: (loc) => `ٹرک ${loc} بارڈر پر پہنچ چکا ہے اور کسٹم کلیئرنس کے عمل میں ہے۔`,
    hi: (loc) => `ट्रक ${loc} सीमा पर पहुंच चुका है और सीमा शुल्क निकासी की प्रतीक्षा कर रहा है।`,
  },
  border_crossed: {
    en: (loc, _, next) =>
      next ? `The truck has crossed ${loc} border and is proceeding toward ${next}.` : `The truck has successfully crossed ${loc} border.`,
    fa: (loc, _, next) =>
      next ? `لاری از مرز ${loc} عبور کرده و به سمت ${next} در حال حرکت است.` : `لاری با موفقیت از مرز ${loc} عبور کرده است.`,
    ps: (loc, _, next) =>
      next ? `موټر له ${loc} پولې څخه په بریا سره تېر شوی او د ${next} په لور روان دی.` : `موټر له ${loc} پولې څخه په بریا سره تېر شوی دی.`,
    ur: (loc, _, next) =>
      next ? `ٹرک ${loc} بارڈر عبور کر چکا ہے اور ${next} کی طرف رواں دواں ہے۔` : `ٹرک نے ${loc} بارڈر کامیابی سے عبور کر لیا ہے۔`,
    hi: (loc, _, next) =>
      next ? `ट्रक ${loc} सीमा पार कर चुका है और ${next} की ओर आगे बढ़ रहा है।` : `ट्रक ने ${loc} सीमा को सफलतापूर्वक पार कर लिया है।`,
  },
  at_port: {
    en: (loc) => `The shipment has reached ${loc} port yard and is staged for container handling.`,
    fa: (loc) => `محموله به محوطه بندر ${loc} رسیده و جهت بارگیری و هماهنگی کانتینر مستقر گردیده است.`,
    ps: (loc) => `بار د ${loc} بندر ته رسیدلی او د کانټینر بارولو لپاره چمتو شوی دی.`,
    ur: (loc) => `کھیپ ${loc} پورٹ پہنچ چکی ہے اور کنٹینر ہینڈلنگ کے لیے تیار ہے۔`,
    hi: (loc) => `शिपमेंट ${loc} बंदरगाह पर पहुंच चुका है और कंटेनर लोडिंग के लिए तैयार है।`,
  },
  container_loading: {
    en: (loc) => `Container loading and inspection are currently underway at ${loc}.`,
    fa: (loc) => `عملیات بارگیری کانتینر و بازرسی اسناد در ${loc} در حال انجام است.`,
    ps: (loc) => `په ${loc} کې د کانټینر بارول او معاینه روانه ده.`,
    ur: (loc) => `${loc} پر کنٹینر لوڈنگ اور معائنہ جاری ہے۔`,
    hi: (loc) => `${loc} पर कंटेनर लोडिंग और निरीक्षण की प्रक्रिया जारी है।`,
  },
  on_vessel: {
    en: (loc, _, __, vessel) =>
      vessel ? `The container is loaded on board vessel ${vessel} at ${loc}.` : `The container is loaded on board the vessel at ${loc}.`,
    fa: (loc, _, __, vessel) =>
      vessel ? `کانتینر بر روی کشتی ${vessel} در ${loc} بارگیری گردید.` : `کانتینر بر روی کشتی در ${loc} بارگیری گردید.`,
    ps: (loc, _, __, vessel) =>
      vessel ? `کانټینر په ${loc} کې په ${vessel} کښتۍ کې بار شو.` : `کانټینر په ${loc} کې په کښتۍ کې بار شو.`,
    ur: (loc, _, __, vessel) =>
      vessel ? `کنٹینر ${loc} پر بحری جہاز ${vessel} پر لوڈ ہو چکا ہے۔` : `کنٹینر ${loc} پر بحری جہاز پر لوڈ ہو چکا ہے۔`,
    hi: (loc, _, __, vessel) =>
      vessel ? `कंटेनर को ${loc} पर जहाज ${vessel} पर लोड कर दिया गया है।` : `कंटेनर को ${loc} पर जहाज पर लोड कर दिया गया है।`,
  },
  vessel_departed: {
    en: (loc, dest, _, vessel) => {
      const v = vessel ? `vessel ${vessel}` : "The vessel"
      return dest ? `${v} has departed from ${loc} and is proceeding toward ${dest}.` : `${v} has departed from ${loc}.`
    },
    fa: (loc, dest, _, vessel) => {
      const v = vessel ? `کشتی ${vessel}` : "کشتی"
      return dest ? `${v} از ${loc} به سمت ${dest} حرکت کرده است.` : `${v} از ${loc} حرکت کرده است.`
    },
    ps: (loc, dest, _, vessel) => {
      const v = vessel ? `${vessel} کښتۍ` : "کښتۍ"
      return dest ? `${v} له ${loc} څخه د ${dest} په لور حرکت کړی دی.` : `${v} له ${loc} څخه حرکت کړی دی.`
    },
    ur: (loc, dest, _, vessel) => {
      const v = vessel ? `بحری جہاز ${vessel}` : "بحری جہاز"
      return dest ? `${v} ${loc} سے ${dest} کی طرف روانہ ہو چکا ہے۔` : `${v} ${loc} سے روانہ ہو چکا ہے۔`
    },
    hi: (loc, dest, _, vessel) => {
      const v = vessel ? `जहाज ${vessel}` : "जहाज"
      return dest ? `${v} ${loc} से ${dest} की ओर रवाना हो चुका है।` : `${v} ${loc} से रवाना हो चुका है।`
    },
  },
  transshipment: {
    en: (loc, dest) =>
      dest ? `The shipment has arrived at transshipment port ${loc} awaiting connecting vessel to ${dest}.` : `The shipment has arrived at transshipment hub ${loc}.`,
    fa: (loc, dest) =>
      dest ? `محموله به بندر ترانزیت ${loc} رسیده و در انتظار اتصال به کشتی دوم به مقصد ${dest} می‌باشد.` : `محموله به بندر ترانزیت ${loc} رسیده است.`,
    ps: (loc, dest) =>
      dest ? `بار د ترانزیت بندر ${loc} ته رسیدلی او د ${dest} لپاره دویمې کښتۍ ته په تمه دی.` : `بار د ${loc} ترانزیتي بندر ته رسیدلی دی.`,
    ur: (loc, dest) =>
      dest ? `کھیپ ٹرانزٹ پورٹ ${loc} پہنچ چکی ہے اور ${dest} کے لیے دوسرے جہاز کی منتظر ہے۔` : `کھیپ ٹرانزٹ پورٹ ${loc} پہنچ چکی ہے۔`,
    hi: (loc, dest) =>
      dest ? `शिपमेंट ट्रांसशिपमेंट बंदरगाह ${loc} पहुंच चुका है और ${dest} के लिए कनेक्टिंग जहाज की प्रतीक्षा कर रहा है।` : `शिपमेंट ट्रांसशिपमेंट हब ${loc} पहुंच चुका है।`,
  },
  arrived_destination: {
    en: (loc) => `The shipment has arrived at destination port ${loc} and is discharging.`,
    fa: (loc) => `محموله به بندر مقصد ${loc} رسیده و عملیات تخلیه در حال انجام است.`,
    ps: (loc) => `بار د مقصد بندر ${loc} ته رسیدلی او د تخلیې چارې روانې دي.`,
    ur: (loc) => `کھیپ منزل کے پورٹ ${loc} پہنچ چکی ہے اور ان لوڈنگ جاری ہے۔`,
    hi: (loc) => `शिपमेंट गंतव्य बंदरगाह ${loc} पहुंच चुका है और अनलोडिंग जारी है।`,
  },
  customs_cleared: {
    en: (loc) => `Import customs clearance has been completed successfully at ${loc}.`,
    fa: (loc) => `ترخیص گمرکی واردات با موفقیت در ${loc} به پایان رسید.`,
    ps: (loc) => `د وارداتو ګمرکي پړاوونه په ${loc} کې په بریالیتوب بشپړ شول.`,
    ur: (loc) => `${loc} پر کسٹم کلیئرنس کا عمل کامیابی سے مکمل ہو گیا ہے۔`,
    hi: (loc) => `${loc} पर आयात सीमा शुल्क निकासी सफलतापूर्वक पूरी हो गई है।`,
  },
  delivered: {
    en: (loc) => `The shipment has been safely delivered to customer warehouse at ${loc}.`,
    fa: (loc) => `محموله به طور کامل و سالم در گدام مشتری در ${loc} تحویل داده شد.`,
    ps: (loc) => `بار په خوندي ډول په ${loc} کې د پیرودونکي ګودام ته وسپارل شو.`,
    ur: (loc) => `کھیپ بحفاظت ${loc} پر کسٹمر کے گودام میں پہنچا دی گئی ہے۔`,
    hi: (loc) => `शिपमेंट को ${loc} पर ग्राहक के गोदाम में सुरक्षित रूप से वितरित कर दिया गया है।`,
  },
  delayed: {
    en: (loc) => `The shipment is experiencing a temporary operational delay at ${loc}. Our operations team is actively coordinating.`,
    fa: (loc) => `محموله در ${loc} با تاخیر موقت عملیاتی مواجه گردیده است. تیم عملیات در حال هماهنگی و تسریع امور می‌باشد.`,
    ps: (loc) => `بار په ${loc} کې د لنډمهاله ځنډ سره مخ دی. زموږ عملیاتي ټیم په چټکۍ سره کار کوي.`,
    ur: (loc) => `کھیپ کو ${loc} پر عارضی تاخیر کا سامنا ہے۔ ہماری آپریشن ٹیم جلد از جلد کلیئرنس کے لیے کوشاں ہے۔`,
    hi: (loc) => `शिपमेंट में ${loc} पर अस्थायी परिचालन विलंब हो रहा है। हमारी टीम सक्रिय रूप से समन्वय कर रही है।`,
  },
}

export interface LabelDictionary {
  companyName: string
  title: string
  bol: string
  shipper: string
  consignee: string
  notifyParty: string
  cargo: string
  packages: string
  netWeight: string
  grossWeight: string
  truck: string
  container: string
  currentStatus: string
  currentLocation: string
  destination: string
  origin: string
  vessel: string
  voyage: string
  eta: string
  etd: string
  lastUpdated: string
  thankYou: string
  na: string
  internalBanner: string
  dailyTitle: string
  activeShipmentsCount: string
  needsAttention: string
  firstLeg: string
  secondLeg: string
}

export const LABELS: Record<"en" | "fa" | "ps" | "ur" | "hi", LabelDictionary> = {
  en: {
    companyName: "SKY ARIANA LIMITED",
    title: "SHIPMENT UPDATE",
    bol: "BOL",
    shipper: "Shipper",
    consignee: "Consignee",
    notifyParty: "Notify Party",
    cargo: "Cargo",
    packages: "Packages",
    netWeight: "Net Weight",
    grossWeight: "Gross Weight",
    truck: "Truck",
    container: "Container",
    currentStatus: "Current Status",
    currentLocation: "Current Location",
    destination: "Destination",
    origin: "Origin",
    vessel: "Vessel",
    voyage: "Voyage",
    eta: "ETA",
    etd: "ETD",
    lastUpdated: "Last Updated",
    thankYou: "Thank you,\nSKY ARIANA LIMITED",
    na: "Not available",
    internalBanner: "🔒 [INTERNAL OPERATIONS - SKY ARIANA]",
    dailyTitle: "DAILY SHIPMENT STATUS",
    activeShipmentsCount: "Total Active Shipments",
    needsAttention: "Needs Attention",
    firstLeg: "FIRST LEG",
    secondLeg: "SECOND LEG",
  },
  fa: {
    companyName: "شرکت ترانسپورتی بین المللی اسکای آریانا",
    title: "به‌روزرسانی وضعیت محموله",
    bol: "بارنامه",
    shipper: "فرستنده",
    consignee: "گیرنده",
    notifyParty: "طرف اطلاع",
    cargo: "نوع کالا",
    packages: "تعداد بسته‌ها",
    netWeight: "وزن خالص",
    grossWeight: "وزن ناخالص",
    truck: "شماره لاری",
    container: "کانتینر",
    currentStatus: "وضعیت فعلی",
    currentLocation: "موقعیت فعلی",
    destination: "مقصد",
    origin: "مبدا",
    vessel: "کشتی",
    voyage: "شماره سفر",
    eta: "تاریخ تخمینی رسیدن (ETA)",
    etd: "تاریخ حرکت (ETD)",
    lastUpdated: "آخرین بروزرسانی",
    thankYou: "با احترام و تشکر،\nاسکای آریانا لمیتد",
    na: "نامشخص",
    internalBanner: "🔒 [عملیات داخلی - محرمانه اسکای آریانا]",
    dailyTitle: "گزارش روزانه محموله‌ها",
    activeShipmentsCount: "مجموع محموله‌های فعال",
    needsAttention: "نیازمند پیگیری فوری",
    firstLeg: "مسیر اول",
    secondLeg: "مسیر دوم",
  },
  ps: {
    companyName: "سکای اریانا لمیټډ - نړیوال ترانسپورت",
    title: "د بار وړلو وضعیت تازه معلومات",
    bol: "بارنامه",
    shipper: "لیږونکی",
    consignee: "ترلاسه کوونکی",
    notifyParty: "خبر ورکوونکی",
    cargo: "د توکو ډول",
    packages: "د کارتنونو شمېر",
    netWeight: "خالص وزن",
    grossWeight: "ناخالص وزن",
    truck: "د موټر شمېره",
    container: "کانټینر",
    currentStatus: "اوسنی وضعیت",
    currentLocation: "اوسنی موقعیت",
    destination: "منزل",
    origin: "مبدا",
    vessel: "کښتۍ",
    voyage: "د سفر شمېره",
    eta: "د رارسیدو نیټه (ETA)",
    etd: "د حرکت نیټه (ETD)",
    lastUpdated: "وروستی تازه معلومات",
    thankYou: "مننه،\nسکای اریانا لمیټډ",
    na: "شتون نلري",
    internalBanner: "🔒 [داخلي عملیاتي معلومات - سکای اریانا]",
    dailyTitle: "د ورځنیو بارونو وضعیت",
    activeShipmentsCount: "ټول فعال بارونه",
    needsAttention: "بیړنۍ پاملرنې ته اړتیا لري",
    firstLeg: "لومړی پړاو",
    secondLeg: "دوهم پړاو",
  },
  ur: {
    companyName: "اسکائی آریانا لمیٹڈ",
    title: "کھیپ کی صورتحال کا اپ ڈیٹ",
    bol: "بی ایل نمبر",
    shipper: "ارسال کنندہ",
    consignee: "وصول کنندہ",
    notifyParty: "مطلع فریق",
    cargo: "سامان کی قسم",
    packages: "پیکجز کی تعداد",
    netWeight: "خالص وزن",
    grossWeight: "مجموعی وزن",
    truck: "ٹرک نمبر",
    container: "کنٹینر",
    currentStatus: "موجودہ صورتحال",
    currentLocation: "موجودہ مقام",
    destination: "منزل",
    origin: "مقام روانگی",
    vessel: "بحری جہاز",
    voyage: "سفر نمبر",
    eta: "متوقع آمد (ETA)",
    etd: "روانگی کی تاریخ (ETD)",
    lastUpdated: "آخری اپ ڈیٹ",
    thankYou: "شکریہ،\nاسکائی آریانا لمیٹڈ",
    na: "دستیاب نہیں",
    internalBanner: "🔒 [اندرونی آپریشنز - اسکائی آریانا]",
    dailyTitle: "روزانہ کھیپ کی رپورٹ",
    activeShipmentsCount: "کل فعال کھیپیں",
    needsAttention: "توجہ طلب امور",
    firstLeg: "پہلا مرحلہ",
    secondLeg: "دوسرا مرحلہ",
  },
  hi: {
    companyName: "स्काई एरियाना लिमिटेड",
    title: "शिपमेंट स्थिति अपडेट",
    bol: "बीओएल नंबर",
    shipper: "प्रेषक (Shipper)",
    consignee: "प्राप्तकर्ता (Consignee)",
    notifyParty: "अधिसूचित पक्ष",
    cargo: "माल का विवरण",
    packages: "पैकेज संख्या",
    netWeight: "शुद्ध वजन",
    grossWeight: "सकल वजन",
    truck: "ट्रक नंबर",
    container: "कंटेनर",
    currentStatus: "वर्तमान स्थिति",
    currentLocation: "वर्तमान स्थान",
    destination: "गंतव्य",
    origin: "उत्पत्ति स्थल",
    vessel: "जहाज",
    voyage: "यात्रा संख्या",
    eta: "अनुमानित आगमन (ETA)",
    etd: "अनुमानित प्रस्थान (ETD)",
    lastUpdated: "अंतिम अपडेट",
    thankYou: "धन्यवाद,\nस्काई एरियाना लिमिटेड",
    na: "उपलब्ध नहीं",
    internalBanner: "🔒 [आंतरिक परिचालन - स्काई एरियाना]",
    dailyTitle: "दैनिक शिपमेंट स्थिति",
    activeShipmentsCount: "कुल सक्रिय शिपमेंट",
    needsAttention: "तत्काल ध्यान देने योग्य",
    firstLeg: "पहला चरण",
    secondLeg: "दूसरा चरण",
  },
}

export function getStatusNarrative(
  status: string,
  lang: "en" | "fa" | "ps" | "ur" | "hi",
  location: string,
  destination?: string,
  nextLocation?: string,
  vessel?: string
): string {
  const normKey = status.toLowerCase().replace(/[\s-]+/g, "_")
  const entry = STATUS_NARRATIVES[normKey] || STATUS_NARRATIVES.in_transit
  const locIsolate = lang === "en" ? location : ltrIsolate(location)
  const destIsolate = destination ? (lang === "en" ? destination : ltrIsolate(destination)) : undefined
  const nextIsolate = nextLocation ? (lang === "en" ? nextLocation : ltrIsolate(nextLocation)) : undefined
  const vesselIsolate = vessel ? (lang === "en" ? vessel : ltrIsolate(vessel)) : undefined

  return entry[lang](locIsolate, destIsolate, nextIsolate, vesselIsolate)
}
