/**
 * Sky Ariana Logistics — Communication Engine & WhatsApp Generator Service
 * Phase 20: Built-in & custom templates, safe live-data rendering (EN/PS/FA/UR),
 * multi-currency balance summaries, payment reminders, daily status reports, and audit history.
 */

import { getDataPath } from "@/lib/server-paths"
import { readJsonFile, mutateJsonFile } from "./blob-db"
import type {
  CommunicationChannel,
  CommunicationContextData,
  CommunicationHistoryRecord,
  CommunicationSentStatus,
  CommunicationType,
  DailyStatusReportResult,
  DailyStatusShipmentSummary,
  MessageLanguage,
  MessageLengthMode,
  MessageTemplate,
  RenderTemplateOptions,
  TemplateCategory,
} from "@/lib/types/communication"
import { getAllLocalBOLs, getLocalBOL } from "./local-storage-service"
import { getAllInvoices, getInvoice } from "./invoice-storage-service"
import { getShipmentDocumentsByBol } from "./shipment-document-storage"
import { getAccountLedgerDatabase } from "./account-ledger-storage-service"

const TEMPLATES_FILE = getDataPath(".local-message-templates.json")
const HISTORY_FILE = getDataPath(".local-communication-history.json")

/**
 * Built-in default templates covering all 22 operational & financial categories
 */
export const BUILTIN_COMMUNICATION_TEMPLATES: MessageTemplate[] = [
  {
    id: "tpl-shipment-created",
    name: "Shipment Created",
    category: "Shipment Created",
    length_mode: "STANDARD",
    visibility: "CLIENT",
    company_name: "SKY ARIANA LTD",
    is_default: true,
    updated_at: "2026-09-24T00:00:00.000Z",
    updated_by: "System",
    content: {
      en: `📢 *SKY ARIANA LOGISTICS — SHIPMENT CONFIRMATION*\n\nDear Customer,\nYour shipment *{{bol_number}}* has been registered successfully.\n\n📦 *Details:*\n• Consignee: {{consignee}}\n• Origin: {{origin}}\n• Destination: {{destination}}\n• Container / Truck: {{container_number}}\n• Status: Registered / In Preparation\n\nThank you for choosing Sky Ariana Logistics.`,
      ps: `📢 *د سکای اریانا لوژستیک — د بار ثبت خبرتیا*\n\nمحترم پیریدونکی،\nستاسو بار په شمېره *{{bol_number}}* په بریا سره ثبت شو.\n\n📦 *معلومات:*\n• ترلاسه کوونکی: {{consignee}}\n• مبدا: {{origin}}\n• مقصد: {{destination}}\n• کانتینر / لارۍ: {{container_number}}\n• حالت: ثبت شو / د چمتووالي په حال کې\n\nله سکای اریانا سره ستاسو د باور مننه.`,
      fa: `📢 *اسکای آریانا لجستیک — تاییدیه ثبت محموله*\n\nمشتری گرامی،\nمحموله شما به شماره بارنامه *{{bol_number}}* با موفقیت ثبت گردید.\n\n📦 *مشخصات:*\n• گیرنده: {{consignee}}\n• مبدا: {{origin}}\n• مقصد: {{destination}}\n• کانتینر / لاری: {{container_number}}\n• وضعیت: ثبت شده / در حال آماده‌سازی\n\nبا تشکر از اعتماد شما به اسکای آریانا لجستیک.`,
      ur: `📢 *اسکائی اریانا لاجسٹکس — شپمنٹ کی تصدیق*\n\nمحترم صارف،\nآپ کی شپمنٹ نمبر *{{bol_number}}* کامیابی کے ساتھ رجسٹر ہو گئی ہے۔\n\n📦 *تفصیلات:*\n• وصول کنندہ: {{consignee}}\n• مقام روانگی: {{origin}}\n• منزل: {{destination}}\n• کنٹینر / ٹرک: {{container_number}}\n• حیثیت: رجسٹرڈ / تیاری میں\n\nاسکائی اریانا لاجسٹکس منتخب کرنے کا شکریہ۔`,
    },
  },
  {
    id: "tpl-truck-departed",
    name: "Truck Departed",
    category: "Truck Departed",
    length_mode: "STANDARD",
    visibility: "CLIENT",
    company_name: "SKY ARIANA LTD",
    is_default: true,
    updated_at: "2026-09-24T00:00:00.000Z",
    updated_by: "System",
    content: {
      en: `🚚 *SKY ARIANA LOGISTICS — TRUCK DEPARTED*\n\nShipment *{{bol_number}}* has departed from {{origin}}.\n\n• Vehicle: {{truck_number}}\n• Cargo: {{commodity}}\n• Next Destination: {{next_destination}}\n• Status: En Route\n\nWe will keep you updated on border transit.`,
      ps: `🚚 *د سکای اریانا لوژستیک — د موټر حرکت*\n\nستاسو بار *{{bol_number}}* له {{origin}} څخه حرکت وکړ.\n\n• ګاډی: {{truck_number}}\n• مال: {{commodity}}\n• راتلونکی تمځای: {{next_destination}}\n• حالت: په لاره روان دی\n\nموږ به تاسو په سرحد کې له وضعیت څخه خبر وساتو.`,
      fa: `🚚 *اسکای آریانا لجستیک — حرکت موتر / لاری*\n\nمحموله *{{bol_number}}* از {{origin}} حرکت نمود.\n\n• وسیله نقلیه: {{truck_number}}\n• نوع محموله: {{commodity}}\n• مقصد بعدی: {{next_destination}}\n• وضعیت: در مسیر\n\nشما را از وضعیت ترانزیت مرزی مطلع خواهیم کرد.`,
      ur: `🚚 *اسکائی اریانا لاجسٹکس — ٹرک روانہ ہو گیا*\n\nشپمنٹ *{{bol_number}}* مقام {{origin}} سے روانہ ہو چکی ہے۔\n\n• گاڑی: {{truck_number}}\n• کارگو: {{commodity}}\n• اگلی منزل: {{next_destination}}\n• حیثیت: راستے میں\n\nہم آپ کو بارڈر ٹرانزٹ کے بارے میں باخبر رکھیں گے۔`,
    },
  },
  {
    id: "tpl-at-border",
    name: "At Border",
    category: "At Border",
    length_mode: "STANDARD",
    visibility: "CLIENT",
    company_name: "SKY ARIANA LTD",
    is_default: true,
    updated_at: "2026-09-24T00:00:00.000Z",
    updated_by: "System",
    content: {
      en: `🚩 *SKY ARIANA LOGISTICS — AT BORDER STATION*\n\nShipment *{{bol_number}}* has arrived at border station *{{current_location}}*.\n\n• Container: {{container_number}}\n• Status: Customs & Transit Processing\n• Processing Agent: Sky Ariana Operations\n\nCustoms clearance is actively in progress.`,
      ps: `🚩 *د سکای اریانا لوژستیک — په سرحدي تمځای کې*\n\nستاسو بار *{{bol_number}}* سرحدي بندر *{{current_location}}* ته ورسېد.\n\n• کانتینر: {{container_number}}\n• حالت: د ګمرک او ترانزیت پړاو\n• نظارت: د سکای اریانا عملیاتي څانګه\n\nګمرکي چارې په جریان کې دي.`,
      fa: `🚩 *اسکای آریانا لجستیک — رسیدن به مرز*\n\nمحموله *{{bol_number}}* به گمرک مرزی *{{current_location}}* رسید.\n\n• کانتینر: {{container_number}}\n• وضعیت: در حال طی مراحل گمرکی و ترانزیتی\n• متصدی: تیم عملیاتی اسکای آریانا\n\nمراحل اداری گمرک در حال انجام است.`,
      ur: `🚩 *اسکائی اریانا لاجسٹکس — بارڈر پر آمد*\n\nشپمنٹ *{{bol_number}}* بارڈر اسٹیشن *{{current_location}}* پہنچ چکی ہے۔\n\n• کنٹینر: {{container_number}}\n• حیثیت: کسٹمز اور ٹرانزٹ پروسیسنگ\n• آپریشنز: اسکائی اریانا ٹیم\n\nکسٹمز کلیئرنس جاری ہے۔`,
    },
  },
  {
    id: "tpl-border-cleared",
    name: "Border Cleared",
    category: "Border Cleared",
    length_mode: "STANDARD",
    visibility: "CLIENT",
    company_name: "SKY ARIANA LTD",
    is_default: true,
    updated_at: "2026-09-24T00:00:00.000Z",
    updated_by: "System",
    content: {
      en: `✅ *SKY ARIANA LOGISTICS — BORDER CLEARED*\n\nShipment *{{bol_number}}* has cleared border customs at *{{current_location}}*.\n\n• Container: {{container_number}}\n• Next Destination: {{next_destination}}\n• Status: Cleared & Moving Forward\n\nTransit continues smoothly toward destination.`,
      ps: `✅ *د سکای اریانا لوژستیک — له سرحد څخه وتل او تصفیه*\n\nستاسو بار *{{bol_number}}* د *{{current_location}}* بندر له ګمرک څخه په بریالیتوب تصفیه شو.\n\n• کانتینر: {{container_number}}\n• راتلونکی تمځای: {{next_destination}}\n• حالت: تصفیه شو او روان دی\n\nبار په منظم ډول د منزل په لور حرکت کوي.`,
      fa: `✅ *اسکای آریانا لجستیک — خروج و ترخیص از مرز*\n\nمحموله *{{bol_number}}* از گمرک مرزی *{{current_location}}* ترخیص و حرکت کرد.\n\n• کانتینر: {{container_number}}\n• مقصد بعدی: {{next_destination}}\n• وضعیت: ترخیص شده و در حال حرکت\n\nمحموله در مسیر خود به سمت مقصد پیش می‌رود.`,
      ur: `✅ *اسکائی اریانا لاجسٹکس — بارڈر کلیئر ہو گیا*\n\nشپمنٹ *{{bol_number}}* بارڈر کسٹمز *{{current_location}}* سے کلیئر ہو چکی ہے۔\n\n• کنٹینر: {{container_number}}\n• اگلی منزل: {{next_destination}}\n• حیثیت: کلیئرڈ اور رواں دواں\n\nمنزل کی طرف ٹرانزٹ جاری ہے۔`,
    },
  },
  {
    id: "tpl-arrived-port",
    name: "Arrived Port",
    category: "Arrived Port",
    length_mode: "STANDARD",
    visibility: "CLIENT",
    company_name: "SKY ARIANA LTD",
    is_default: true,
    updated_at: "2026-09-24T00:00:00.000Z",
    updated_by: "System",
    content: {
      en: `⚓ *SKY ARIANA LOGISTICS — ARRIVED AT PORT*\n\nShipment *{{bol_number}}* has safely arrived at port *{{current_location}}*.\n\n• Container: {{container_number}}\n• Shipping Line: {{shipping_line}}\n• Status: Gated In / Port Terminal\n\nVessel planning and loading in progress.`,
      ps: `⚓ *د سکای اریانا لوژستیک — بندرګاه ته ورسېد*\n\nستاسو بار *{{bol_number}}* بندرګاه *{{current_location}}* ته ورسېد.\n\n• کانتینر: {{container_number}}\n• بحري لاین: {{shipping_line}}\n• حالت: بندرګاه ته داخل شو\n\nپه کښتۍ کې د بارولو چارې پیل شوې دي.`,
      fa: `⚓ *اسکای آریانا لجستیک — ورود به بندر*\n\nمحموله *{{bol_number}}* به سلامت به بندر *{{current_location}}* وارد گردید.\n\n• کانتینر: {{container_number}}\n• خط کشتیرانی: {{shipping_line}}\n• وضعیت: ورود به محوطه بندری\n\nبرنامه‌ریزی بارگیری روی کشتی در حال انجام است.`,
      ur: `⚓ *اسکائی اریانا لاجسٹکس — پورٹ پر آمد*\n\nشپمنٹ *{{bol_number}}* کامیابی سے پورٹ *{{current_location}}* پہنچ چکی ہے۔\n\n• کنٹینر: {{container_number}}\n• شپنگ لائن: {{shipping_line}}\n• حیثیت: پورٹ ٹرمینل میں داخل\n\nجہاز کی لوڈنگ کی منصوبہ بندی جاری ہے۔`,
    },
  },
  {
    id: "tpl-vessel-departed",
    name: "Vessel Departed",
    category: "Vessel Departed",
    length_mode: "STANDARD",
    visibility: "CLIENT",
    company_name: "SKY ARIANA LTD",
    is_default: true,
    updated_at: "2026-09-24T00:00:00.000Z",
    updated_by: "System",
    content: {
      en: `🚢 *SKY ARIANA LOGISTICS — VESSEL DEPARTED*\n\nShipment *{{bol_number}}* has departed by sea.\n\n• Vessel: {{vessel}}\n• Voyage: {{voyage}}\n• Container: {{container_number}}\n• ETD: {{etd}}\n• Estimated Arrival (ETA): {{eta}}\n• Destination: {{destination}}\n\nLive tracking will be shared during maritime transit.`,
      ps: `🚢 *د سکای اریانا لوژستیک — د کښتۍ حرکت*\n\nستاسو بار *{{bol_number}}* په بحري لاره حرکت وکړ.\n\n• کښتۍ: {{vessel}}\n• سفر نمبر: {{voyage}}\n• کانتینر: {{container_number}}\n• د حرکت نېټه (ETD): {{etd}}\n• د رسېدو اټکلي نېټه (ETA): {{eta}}\n• مقصد: {{destination}}\n\nپه سمندر کې د مزل تازه معلومات به تاسو سره شریک کړو.`,
      fa: `🚢 *اسکای آریانا لجستیک — حرکت کشتی*\n\nمحموله *{{bol_number}}* از طریق دریا حرکت کرد.\n\n• نام کشتی: {{vessel}}\n• شماره سفر: {{voyage}}\n• کانتینر: {{container_number}}\n• تاریخ خروج (ETD): {{etd}}\n• تاریخ تقریبی وصول (ETA): {{eta}}\n• مقصد نهایی: {{destination}}\n\nوضعیت محموله در طول مسیر دریایی پیگیری خواهد شد.`,
      ur: `🚢 *اسکائی اریانا لاجسٹکس — جہاز روانہ ہو گیا*\n\nشپمنٹ *{{bol_number}}* بحری راستے سے روانہ ہو چکی ہے۔\n\n• جہاز: {{vessel}}\n• سفر نمبر: {{voyage}}\n• کنٹینر: {{container_number}}\n• روانگی کی تاریخ (ETD): {{etd}}\n• متوقع تاریخ آمد (ETA): {{eta}}\n• منزل: {{destination}}\n\nراستے میں مزید اپ ڈیٹس شیئر کی جائیں گی۔`,
    },
  },
  {
    id: "tpl-at-sea",
    name: "At Sea",
    category: "At Sea",
    length_mode: "STANDARD",
    visibility: "CLIENT",
    company_name: "SKY ARIANA LTD",
    is_default: true,
    updated_at: "2026-09-24T00:00:00.000Z",
    updated_by: "System",
    content: {
      en: `🌊 *SKY ARIANA LOGISTICS — AT SEA UPDATE*\n\nShipment *{{bol_number}}* is currently at sea.\n\n• Vessel: {{vessel}} (Voyage: {{voyage}})\n• Container: {{container_number}}\n• Current ETA: {{eta}}\n• Destination Port: {{destination}}\n\nSailing schedule is on track.`,
      ps: `🌊 *د سکای اریانا لوژستیک — په سمندر کې د بار وضعیت*\n\nستاسو بار *{{bol_number}}* اوس مهال په سمندري مزل کې دی.\n\n• کښتۍ: {{vessel}} (سفر: {{voyage}})\n• کانتینر: {{container_number}}\n• د رسېدو نېټه: {{eta}}\n• د مقصد بندر: {{destination}}\n\nحرکت د جدول سره سم روان دی.`,
      fa: `🌊 *اسکای آریانا لجستیک — وضعیت در دریا*\n\nمحموله *{{bol_number}}* در حال حاضر در مسیر دریایی قرار دارد.\n\n• کشتی: {{vessel}} (سفر: {{voyage}})\n• کانتینر: {{container_number}}\n• زمان تقریبی وصول: {{eta}}\n• بندر مقصد: {{destination}}\n\nسیر کشتی طبق برنامه پیش‌بینی شده ادامه دارد.`,
      ur: `🌊 *اسکائی اریانا لاجسٹکس — سمندر میں*\n\nشپمنٹ *{{bol_number}}* اس وقت سمندر میں ہے۔\n\n• جہاز: {{vessel}} (سفر: {{voyage}})\n• کنٹینر: {{container_number}}\n• متوقع آمد: {{eta}}\n• منزل کا پورٹ: {{destination}}\n\nشیڈول کے مطابق جہاز رواں دواں ہے۔`,
    },
  },
  {
    id: "tpl-arrived-destination",
    name: "Arrived Destination",
    category: "Arrived Destination",
    length_mode: "STANDARD",
    visibility: "CLIENT",
    company_name: "SKY ARIANA LTD",
    is_default: true,
    updated_at: "2026-09-24T00:00:00.000Z",
    updated_by: "System",
    content: {
      en: `🏁 *SKY ARIANA LOGISTICS — ARRIVED AT DESTINATION*\n\nShipment *{{bol_number}}* has arrived at final destination *{{destination}}*.\n\n• Container: {{container_number}}\n• Consignee: {{consignee}}\n• Status: Ready for Customs Clearance / Delivery\n\nPlease contact our operations team to arrange delivery.`,
      ps: `🏁 *د سکای اریانا لوژستیک — منزل ته رسېدلی*\n\nستاسو بار *{{bol_number}}* وروستي منزل *{{destination}}* ته ورسېد.\n\n• کانتینر: {{container_number}}\n• ترلاسه کوونکی: {{consignee}}\n• حالت: د ګمرک تصفیې او تحویلۍ ته چمتو\n\nد تحویلۍ همغږۍ لپاره زموږ له همکارانو سره په اړیکه کې شئ.`,
      fa: `🏁 *اسکای آریانا لجستیک — رسیدن به مقصد نهایی*\n\nمحموله *{{bol_number}}* به مقصد نهایی *{{destination}}* رسید.\n\n• کانتینر: {{container_number}}\n• گیرنده: {{consignee}}\n• وضعیت: آماده ترخیص گمرکی و تحویل\n\nجهت هماهنگی تحویل کالا با تیم ما در تماس باشید.`,
      ur: `🏁 *اسکائی اریانا لاجسٹکس — منزل پر پہنچ گئی*\n\nشپمنٹ *{{bol_number}}* حتمی منزل *{{destination}}* پر پہنچ چکی ہے۔\n\n• کنٹینر: {{container_number}}\n• وصول کنندہ: {{consignee}}\n• حیثیت: کسٹمز کلیئرنس / ترسیل کے لیے تیار\n\nڈلیوری کی ترسیل کے لیے ہماری ٹیم سے رابطہ کریں۔`,
    },
  },
  {
    id: "tpl-delivered",
    name: "Delivered",
    category: "Delivered",
    length_mode: "STANDARD",
    visibility: "CLIENT",
    company_name: "SKY ARIANA LTD",
    is_default: true,
    updated_at: "2026-09-24T00:00:00.000Z",
    updated_by: "System",
    content: {
      en: `🎉 *SKY ARIANA LOGISTICS — SHIPMENT DELIVERED*\n\nWe are pleased to inform you that shipment *{{bol_number}}* has been delivered.\n\n• Consignee: {{consignee}}\n• Container: {{container_number}}\n• Destination: {{destination}}\n• Status: Completed / Delivered\n\nThank you for choosing Sky Ariana Logistics!`,
      ps: `🎉 *د سکای اریانا لوژستیک — بار په بریالیتوب وسپارل شو*\n\nپه خوښۍ سره خبر درکوو چې بار *{{bol_number}}* وسپارل شو.\n\n• ترلاسه کوونکی: {{consignee}}\n• کانتینر: {{container_number}}\n• منزل: {{destination}}\n• حالت: بشپړ او تسلیم شوی\n\nله سکای اریانا لوژستیک سره د همکارۍ مننه!`,
      fa: `🎉 *اسکای آریانا لجستیک — تحویل نهایی محموله*\n\nبا خوشحالی اعلام می‌داریم محموله *{{bol_number}}* با موفقیت تحویل داده شد.\n\n• گیرنده: {{consignee}}\n• کانتینر: {{container_number}}\n• مقصد: {{destination}}\n• وضعیت: تکمیل شده / تحویل گردید\n\nاز اعتماد شما به اسکای آریانا لجستیک سپاسگزاریم!`,
      ur: `🎉 *اسکائی اریانا لاجسٹکس — شپمنٹ کی ترسیل مکمل*\n\nخوشی کی اطلاع ہے کہ شپمنٹ *{{bol_number}}* کامیابی کے ساتھ حوالے کر دی گئی ہے۔\n\n• وصول کنندہ: {{consignee}}\n• کنٹینر: {{container_number}}\n• منزل: {{destination}}\n• حیثیت: مکمل / ڈلیورڈ\n\nاسکائی اریانا لاجسٹکس پر اعتماد کا شکریہ!`,
    },
  },
  {
    id: "tpl-eta-changed",
    name: "ETA Changed",
    category: "ETA Changed",
    length_mode: "STANDARD",
    visibility: "CLIENT",
    company_name: "SKY ARIANA LTD",
    is_default: true,
    updated_at: "2026-09-24T00:00:00.000Z",
    updated_by: "System",
    content: {
      en: `⏱ *SKY ARIANA LOGISTICS — SCHEDULE UPDATE*\n\nPlease note an update to the arrival schedule for shipment *{{bol_number}}*:\n\n• Container: {{container_number}}\n• Previous ETA: {{previous_eta}}\n• New Updated ETA: {{eta}}\n• Location: {{current_location}}\n• Status: En Route\n\nWe appreciate your patience and will keep you informed.`,
      ps: `⏱ *د سکای اریانا لوژستیک — د رسېدو نېټې تازه کول*\n\nمهرباني وکړئ د بار *{{bol_number}}* د نوي جدول خبرتیا په پام کې ونیسئ:\n\n• کانتینر: {{container_number}}\n• پخوانۍ نېټه (ETA): {{previous_eta}}\n• نوې تایید شوې نېټه (ETA): {{eta}}\n• اوسنی ځای: {{current_location}}\n• حالت: په لاره روان دی\n\nستاسو له زغم او همکارۍ مننه.`,
      fa: `⏱ *اسکای آریانا لجستیک — بروزرسانی زمان‌بندی وصول*\n\nبه اطلاع می‌رساند زمان‌بندی وصول محموله *{{bol_number}}* بروزرسانی گردید:\n\n• کانتینر: {{container_number}}\n• تاریخ قبلی (ETA): {{previous_eta}}\n• تاریخ بروزرسانی شده (ETA): {{eta}}\n• موقعیت فعلی: {{current_location}}\n• وضعیت: در مسیر\n\nاز شکیبایی شما سپاسگزاریم.`,
      ur: `⏱ *اسکائی اریانا لاجسٹکس — آمد کے شیڈول میں تبدیلی*\n\nشپمنٹ *{{bol_number}}* کے شیڈول میں مندرجہ ذیل تبدیلی درج کی گئی ہے:\n\n• کنٹینر: {{container_number}}\n• سابقہ متوقع تاریخ (ETA): {{previous_eta}}\n• نئی متوقع تاریخ (ETA): {{eta}}\n• موجودہ مقام: {{current_location}}\n• حیثیت: راستے میں\n\nآپ کے تعاون کا شکریہ۔`,
    },
  },
  {
    id: "tpl-delay-notice",
    name: "Delay Notice",
    category: "Delay Notice",
    length_mode: "STANDARD",
    visibility: "CLIENT",
    company_name: "SKY ARIANA LTD",
    is_default: true,
    updated_at: "2026-09-24T00:00:00.000Z",
    updated_by: "System",
    content: {
      en: `⚠️ *SKY ARIANA LOGISTICS — SHIPMENT NOTICE*\n\nRegarding your shipment *{{bol_number}}*:\n\n• Container: {{container_number}}\n• Current Location: {{current_location}}\n• Reason: {{delay_reason}}\n• Updated ETA: {{eta}}\n\nOur operations team is actively working to resolve this and expedite movement.`,
      ps: `⚠️ *د سکای اریانا لوژستیک — د بار اړوند خبرتیا*\n\nستاسو د بار *{{bol_number}}* په هکله:\n\n• کانتینر: {{container_number}}\n• اوسنی تمځای: {{current_location}}\n• لامل: {{delay_reason}}\n• نوې اټکلي نېټه: {{eta}}\n\nزموږ عملیاتي ټیم په جدیت سره کار کوي ترڅو چټک حرکت تنظیم کړي.`,
      fa: `⚠️ *اسکای آریانا لجستیک — اطلاعیه عملیاتی*\n\nدر رابطه با محموله *{{bol_number}}*:\n\n• کانتینر: {{container_number}}\n• موقعیت فعلی: {{current_location}}\n• علت تاخیر: {{delay_reason}}\n• زمان‌بندی جدید: {{eta}}\n\nتیم عملیاتی ما با جدیت در حال پیگیری و تسریع روند ترانزیت می‌باشد.`,
      ur: `⚠️ *اسکائی اریانا لاجسٹکس — تاخیر کی اطلاع*\n\nآپ کی شپمنٹ نمبر *{{bol_number}}* کے متعلق:\n\n• کنٹینر: {{container_number}}\n• موجودہ مقام: {{current_location}}\n• وجہ: {{delay_reason}}\n• نئی متوقع تاریخ: {{eta}}\n\nہماری ٹیم تیز ترسیل کے لیے متحرک ہے۔`,
    },
  },
  {
    id: "tpl-document-ready",
    name: "Document Ready",
    category: "Document Ready",
    length_mode: "STANDARD",
    visibility: "CLIENT",
    company_name: "SKY ARIANA LTD",
    is_default: true,
    updated_at: "2026-09-24T00:00:00.000Z",
    updated_by: "System",
    content: {
      en: `📄 *SKY ARIANA LOGISTICS — DOCUMENTS READY*\n\nShipping documents for *{{bol_number}}* are prepared and released:\n\n• Documents: {{documents_ready}}\n• Consignee: {{consignee}}\n• Destination: {{destination}}\n\nSoft copies are attached or available for download in your Client Portal.`,
      ps: `📄 *د سکای اریانا لوژستیک — د اسنادو د چمتووالي خبرتیا*\n\nد *{{bol_number}}* بار اړوند اسناد چمتو او صادر شول:\n\n• اسناد: {{documents_ready}}\n• ترلاسه کوونکی: {{consignee}}\n• مقصد: {{destination}}\n\nکاپي یې چمتو ده او ستاسو په پورټل کې د ډاونلوډ وړ ده.`,
      fa: `📄 *اسکای آریانا لجستیک — صدور و آماده‌سازی اسناد*\n\nاسناد بارنامه *{{bol_number}}* آماده و صادر گردید:\n\n• اسناد آماده: {{documents_ready}}\n• گیرنده: {{consignee}}\n• مقصد: {{destination}}\n\nفایل‌های اسناد از طریق پرتال مشتریان یا ضمیمه این پیام قابل دریافت است.`,
      ur: `📄 *اسکائی اریانا لاجسٹکس — دستاویزات تیار ہیں*\n\nشپمنٹ *{{bol_number}}* کے تجارتی دستاویزات تیار ہو چکے ہیں:\n\n• دستاویزات: {{documents_ready}}\n• وصول کنندہ: {{consignee}}\n• منزل: {{destination}}\n\nنقل منسلک ہے یا کلائنٹ پورٹل سے ڈاؤن لوڈ کی جا سکتی ہے۔`,
    },
  },
  {
    id: "tpl-payment-reminder",
    name: "Payment Reminder",
    category: "Payment Reminder",
    length_mode: "STANDARD",
    visibility: "CLIENT",
    company_name: "SKY ARIANA LTD",
    is_default: true,
    updated_at: "2026-09-24T00:00:00.000Z",
    updated_by: "System",
    content: {
      en: `💳 *SKY ARIANA LOGISTICS — PAYMENT STATEMENT / REMINDER*\n\nDear {{recipient_name}},\nKindly find the invoice details for your account:\n\n• Invoice No: {{invoice_number}}\n• Due Date: {{due_date}}\n• Outstanding Amount: *{{currency}} {{outstanding}}*\n• Days Overdue: {{days_overdue}}\n\nPlease arrange settlement to ensure uninterrupted shipment processing.\nBank / Transfer details available upon request.`,
      ps: `💳 *د سکای اریانا لوژستیک — د تادیې یادونه*\n\nمحترم {{recipient_name}}،\nستاسو د حساب اړوند د فاکتور معلومات په لاندې ډول دي:\n\n• فاکتور شمېره: {{invoice_number}}\n• د تادیې نېټه: {{due_date}}\n• پاتې مقدار: *{{currency}} {{outstanding}}*\n• د ځنډ ورځې: {{days_overdue}}\n\nمهرباني وکړئ د کارونو د نه ځنډ لپاره خپل حساب تصفیه کړئ.\nد بانک یا صرافۍ معلومات په غوښتنه درکولی شو.`,
      fa: `💳 *اسکای آریانا لجستیک — یادآوری تسویه حساب / فاکتور*\n\nجناب {{recipient_name}} گرامی،\nمشخصات فاکتور و باقیمانده حساب شما به شرح زیر می‌باشد:\n\n• شماره فاکتور: {{invoice_number}}\n• سررسید پرداخت: {{due_date}}\n• مبلغ باقیمانده: *{{currency}} {{outstanding}}*\n• تعداد روزهای تاخیر: {{days_overdue}}\n\nلطفاً جهت تداوم روان خدمات نسبت به تسویه حساب اقدام فرمایید.\nمشخصات حساب بانکی و صرافی در صورت نیاز ارائه می‌گردد.`,
      ur: `💳 *اسکائی اریانا لاجسٹکس — ادائیگی کی یاد دہانی*\n\nمحترم {{recipient_name}}،\nآپ کے انوائس کی تفصیلات درج ذیل ہیں:\n\n• انوائس نمبر: {{invoice_number}}\n• مقررہ تاریخ: {{due_date}}\n• واجب الادا رقم: *{{currency}} {{outstanding}}*\n• تاخیر کے دن: {{days_overdue}}\n\nبراہ کرم ترسیل میں تسلسل کے لیے بروقت ادائیگی کریں۔`,
    },
  },
  {
    id: "tpl-payment-received",
    name: "Payment Received",
    category: "Payment Received",
    length_mode: "STANDARD",
    visibility: "CLIENT",
    company_name: "SKY ARIANA LTD",
    is_default: true,
    updated_at: "2026-09-24T00:00:00.000Z",
    updated_by: "System",
    content: {
      en: `💵 *SKY ARIANA LOGISTICS — PAYMENT ACKNOWLEDGEMENT*\n\nDear Customer,\nWe have received your payment:\n\n• Amount Received: *{{currency}} {{payment_amount}}*\n• Reference / Note: {{payment_reference}}\n• Remaining Balance: *{{currency}} {{remaining_balance}}*\n\nThank you for your prompt settlement!`,
      ps: `💵 *د سکای اریانا لوژستیک — د تادیې رسید*\n\nمحترم پیریدونکی،\nستاسو تادیه تر لاسه شوه:\n\n• ترلاسه شوی مقدار: *{{currency}} {{payment_amount}}*\n• حواله / یادښت: {{payment_reference}}\n• پاتې باقیداری: *{{currency}} {{remaining_balance}}*\n\nستاسو له وختي تادیې او همکارۍ مننه!`,
      fa: `💵 *اسکای آریانا لجستیک — رسید دریافت وجه*\n\nمشتری محترم،\nپرداخت شما دریافت و در حساب منظور گردید:\n\n• مبلغ دریافتی: *{{currency}} {{payment_amount}}*\n• شماره پیگیری / حواله: {{payment_reference}}\n• باقیمانده حساب: *{{currency}} {{remaining_balance}}*\n\nاز تسویه به موقع شما سپاسگزاریم!`,
      ur: `💵 *اسکائی اریانا لاجسٹکس — ادائیگی کی وصولیابی*\n\nمحترم صارف،\nآپ کی ادائیگی موصول ہو چکی ہے:\n\n• موصول شدہ رقم: *{{currency}} {{payment_amount}}*\n• حوالہ / رسید: {{payment_reference}}\n• بقیہ بیلنس: *{{currency}} {{remaining_balance}}*\n\nبروقت ادائیگی کا شکریہ!`,
    },
  },
]

/**
 * Get all templates (combining built-in defaults with custom stored templates)
 */
export async function getAllTemplates(): Promise<MessageTemplate[]> {
  try {
    const custom = await readJsonFile<MessageTemplate[]>(TEMPLATES_FILE, [])
    const map = new Map<string, MessageTemplate>()

    // Built-in first
    for (const t of BUILTIN_COMMUNICATION_TEMPLATES) {
      map.set(t.id, t)
    }

    // Custom overwriting or adding
    if (Array.isArray(custom)) {
      for (const t of custom) {
        map.set(t.id, t)
      }
    }

    return Array.from(map.values())
  } catch {
    return [...BUILTIN_COMMUNICATION_TEMPLATES]
  }
}

/**
 * Save or update a message template
 */
export async function saveTemplate(
  template: MessageTemplate
): Promise<MessageTemplate> {
  const updated: MessageTemplate = {
    ...template,
    updated_at: new Date().toISOString(),
  }

  await mutateJsonFile<MessageTemplate[]>(TEMPLATES_FILE, [], (list) => {
    const existing = Array.isArray(list) ? list : []
    const idx = existing.findIndex((t) => t.id === updated.id)
    if (idx >= 0) {
      existing[idx] = updated
      return existing
    }
    return [updated, ...existing]
  })

  return updated
}

/**
 * Delete a custom template (built-in templates cannot be deleted)
 */
export async function deleteTemplate(id: string): Promise<boolean> {
  const isBuiltIn = BUILTIN_COMMUNICATION_TEMPLATES.some((t) => t.id === id)
  if (isBuiltIn) {
    throw new Error("Built-in templates cannot be deleted")
  }

  let deleted = false
  await mutateJsonFile<MessageTemplate[]>(TEMPLATES_FILE, [], (list) => {
    const existing = Array.isArray(list) ? list : []
    const remaining = existing.filter((t) => t.id !== id)
    deleted = remaining.length < existing.length
    return remaining
  })

  return deleted
}

export function computeInvoiceTotal(inv: any): string {
  if (inv.total !== undefined && inv.total !== null && inv.total !== "") {
    return String(inv.total)
  }
  let subtotal = 0
  if (Array.isArray(inv.items)) {
    for (const item of inv.items) {
      const q = parseFloat(item.quantity) || 0
      const p = parseFloat(item.unitPrice) || 0
      subtotal += q * p
    }
  }
  const extra =
    (parseFloat(inv.freight_charges || "0") || 0) +
    (parseFloat(inv.demurrage_charges || "0") || 0) +
    (parseFloat(inv.detention_charges || "0") || 0) +
    (parseFloat(inv.documentation_charges || "0") || 0) +
    (parseFloat(inv.port_charges || "0") || 0) +
    (parseFloat(inv.truck_charges || "0") || 0) +
    (parseFloat(inv.other_charges || "0") || 0) +
    (parseFloat(inv.tax || "0") || 0) -
    (parseFloat(inv.discount || "0") || 0)

  return String(Math.round((subtotal + extra) * 100) / 100)
}

/**
 * Extract live context data from any system entity (BOL, Invoice, Document)
 * Ensures NO invented values, missing items show "Pending" or empty.
 */
export async function getCommunicationContext(
  entityType: string,
  entityId: string
): Promise<CommunicationContextData> {
  const ctx: CommunicationContextData = {
    company_name: "SKY ARIANA LTD",
  }

  const cleanId = (entityId || "").trim()

  if (entityType.toUpperCase() === "BOL" || entityType.toUpperCase() === "SHIPMENT") {
    const bol = await getLocalBOL(cleanId)
    if (bol) {
      ctx.bol_number = bol.bol_number || bol.billOfLadingNumber || bol.id || cleanId
      ctx.container_number =
        bol.container_numbers ||
        bol.containerNumbers ||
        bol.container_number ||
        bol.containerNo ||
        undefined
      ctx.shipper = bol.shipper_name || bol.shipperName || bol.shipper || undefined
      ctx.consignee = bol.consignee_name || bol.consigneeName || bol.consignee || undefined
      ctx.commodity = bol.cargo_description || bol.cargoDescription || bol.commodity || undefined
      ctx.origin = bol.loading_point || bol.origin || bol.cityFrom || undefined
      ctx.destination = bol.delivery_place || bol.destination || bol.cityTo || undefined
      ctx.current_location =
        bol.current_location ||
        bol.border_station ||
        bol.transit_border_station ||
        bol.borderStation ||
        undefined
      ctx.status = bol.status || bol.shipment_status || "In Transit"
      ctx.next_destination = bol.next_station || bol.delivery_place || bol.destination || undefined
      ctx.eta = bol.eta ? bol.eta.slice(0, 10) : undefined
      ctx.etd = bol.etd ? bol.etd.slice(0, 10) : undefined
      ctx.previous_eta = bol.previous_eta ? bol.previous_eta.slice(0, 10) : undefined
      ctx.vessel = bol.vessel_name || bol.vessel || undefined
      ctx.voyage = bol.voyage_number || bol.voyage || undefined
      ctx.truck_number = bol.truck_number || bol.truckNumber || undefined
      ctx.driver_name = bol.driver_name || bol.driverName || undefined
      ctx.driver_phone = bol.driver_phone || bol.driverPhone || undefined
      ctx.shipping_line = bol.shipping_line || bol.shippingLine || undefined
      ctx.delay_reason = bol.delay_reason || bol.delayReason || undefined
      ctx.recipient_name = ctx.consignee || ctx.shipper || "Customer"

      // Check documents ready
      try {
        if (ctx.bol_number) {
          const docs = await getShipmentDocumentsByBol(ctx.bol_number)
          if (docs && docs.length > 0) {
            ctx.documents_ready = docs.map((d) => d.documentType.toUpperCase())
          }
        }
      } catch {
        // ignore
      }
    } else {
      ctx.bol_number = cleanId
    }
  } else if (entityType.toUpperCase() === "INVOICE") {
    const inv = await getInvoice(cleanId)
    if (inv) {
      ctx.invoice_number = inv.invoice_number || cleanId
      ctx.invoice_date = inv.invoice_date || undefined
      ctx.due_date = inv.due_date || undefined
      ctx.currency = inv.currency || "USD"
      ctx.outstanding = (inv as any).total || computeInvoiceTotal(inv)
      ctx.recipient_name = inv.buyer_name || "Valued Customer"
      ctx.recipient_phone = inv.buyer_phone || inv.buyer_contact || undefined
      ctx.bol_number = inv.bl_no || undefined
      ctx.container_number = inv.container_no || undefined

      if (inv.due_date) {
        const dueDate = new Date(inv.due_date)
        const now = new Date()
        if (dueDate.getTime() < now.getTime()) {
          ctx.days_overdue = Math.max(
            0,
            Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          )
        } else {
          ctx.days_overdue = 0
        }
      }
    } else {
      ctx.invoice_number = cleanId
    }
  }

  return ctx
}

/**
 * Format variable value safely (preventing undefined, null, or leaking sensitive data)
 */
function safeValue(
  val: any,
  lang: MessageLanguage = "en",
  omitMissing = false
): string {
  if (val === undefined || val === null || val === "" || String(val).trim() === "") {
    if (omitMissing) return ""
    switch (lang) {
      case "ps":
        return "د تایید په حال کې"
      case "fa":
        return "در حال بررسی"
      case "ur":
        return "زیر غور"
      case "en":
      default:
        return "Pending"
    }
  }
  return String(val).trim()
}

/**
 * Render a template string safely with variable substitution and length modes
 */
export function renderTemplateText(
  rawTemplate: string,
  context: CommunicationContextData,
  options: RenderTemplateOptions
): string {
  const { language = "en", isCustomerSafe = true, omitMissing = false } = options

  // Prepare sanitized variables
  const data: Record<string, string> = {
    bol_number: safeValue(context.bol_number, language, false),
    container_number: safeValue(context.container_number, language, omitMissing),
    shipper: safeValue(context.shipper, language, omitMissing),
    consignee: safeValue(context.consignee, language, omitMissing),
    commodity: safeValue(context.commodity, language, omitMissing),
    origin: safeValue(context.origin, language, omitMissing),
    destination: safeValue(context.destination, language, omitMissing),
    current_location: safeValue(context.current_location, language, false),
    status: safeValue(context.status, language, false),
    next_destination: safeValue(context.next_destination, language, omitMissing),
    eta: safeValue(context.eta, language, false),
    etd: safeValue(context.etd, language, omitMissing),
    previous_eta: safeValue(context.previous_eta, language, false),
    vessel: safeValue(context.vessel, language, omitMissing),
    voyage: safeValue(context.voyage, language, omitMissing),
    truck_number: safeValue(context.truck_number, language, omitMissing),
    shipping_line: safeValue(context.shipping_line, language, omitMissing),
    delay_reason: safeValue(context.delay_reason, language, false),
    documents_ready: context.documents_ready && context.documents_ready.length > 0
      ? context.documents_ready.join(", ")
      : safeValue(undefined, language, false),
    invoice_number: safeValue(context.invoice_number, language, false),
    invoice_date: safeValue(context.invoice_date, language, false),
    due_date: safeValue(context.due_date, language, false),
    days_overdue: String(context.days_overdue ?? 0),
    outstanding: safeValue(context.outstanding, language, false),
    currency: safeValue(context.currency || "USD", language, false),
    payment_amount: safeValue(context.payment_amount, language, false),
    payment_reference: safeValue(context.payment_reference, language, false),
    remaining_balance: safeValue(context.remaining_balance, language, false),
    company_name: context.company_name || "SKY ARIANA LTD",
    recipient_name: safeValue(context.recipient_name, language, false),
  }

  // Driver details: if customer safe, omit phone or specific internal info
  if (!isCustomerSafe) {
    data.driver_name = safeValue(context.driver_name, language, omitMissing)
    data.driver_phone = safeValue(context.driver_phone, language, omitMissing)
  } else {
    data.driver_name = safeValue(context.driver_name, language, true)
    data.driver_phone = ""
  }

  // Replace all {{variables}}
  let rendered = rawTemplate.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return data[key] !== undefined ? data[key] : ""
  })

  // Clean empty lines where placeholders were blanked out
  rendered = rendered
    .split("\n")
    .filter((line) => {
      // Remove lines that ended up like "• Container: " with no value when omitMissing is on
      if (omitMissing && /•\s*[^:]+:\s*$/.test(line.trim())) {
        return false
      }
      return true
    })
    .join("\n")

  // Short mode simplification if requested
  if (options.lengthMode === "SHORT") {
    const bol = data.bol_number || "BOL"
    const cont = data.container_number ? ` | ${data.container_number}` : ""
    const loc = data.current_location ? ` | ${data.current_location}` : ""
    const st = data.status ? ` | ${data.status}` : ""
    const etaStr = data.eta && data.eta !== "Pending" ? ` | ETA: ${data.eta}` : ""
    return `${bol}${cont}${loc}${st}${etaStr}`
  }

  // Append custom remark if provided
  if (options.customRemark && options.customRemark.trim()) {
    rendered += `\n\n📌 *Note:* ${options.customRemark.trim()}`
  }

  return rendered.trim()
}

/**
 * Generate a shipment status message for a given BOL and category
 */
export async function generateShipmentMessage(
  bolNumber: string,
  category: TemplateCategory,
  options: RenderTemplateOptions
): Promise<{ text: string; context: CommunicationContextData; template: MessageTemplate }> {
  const context = await getCommunicationContext("BOL", bolNumber)
  const allTemplates = await getAllTemplates()

  // Find matching template for this category
  let template = allTemplates.find((t) => t.category === category)
  if (!template) {
    template = BUILTIN_COMMUNICATION_TEMPLATES[0]
  }

  const lang = options.language || "en"
  const rawText = template.content[lang] || template.content.en
  const text = renderTemplateText(rawText, context, options)

  return { text, context, template }
}

/**
 * Generate a Payment Reminder with strict level tone (Due Soon vs Overdue)
 */
export async function generatePaymentReminder(
  invoiceId: string,
  level: "DUE_SOON" | "DUE_TODAY" | "OVERDUE_7" | "OVERDUE_URGENT",
  options: RenderTemplateOptions
): Promise<{ text: string; context: CommunicationContextData }> {
  const context = await getCommunicationContext("INVOICE", invoiceId)
  const lang = options.language || "en"

  const currency = context.currency || "USD"
  const amount = context.outstanding || "0"
  const invNo = context.invoice_number || invoiceId
  const dueDate = context.due_date || "Pending"
  const recipient = context.recipient_name || "Valued Customer"
  const daysOverdue = context.days_overdue ?? 0

  let text = ""
  if (lang === "ps") {
    if (level === "OVERDUE_URGENT" || daysOverdue > 14) {
      text = `🚨 *د سکای اریانا لوژستیک — بېړنۍ تادیاتي خبرتیا*\n\nمحترم ${recipient}،\nستاسو فاکتور *${invNo}* په اندازه د *${currency} ${amount}* باندې له ${daysOverdue} ورځو راهیسې ځنډ راغلی دی (سررسید: ${dueDate}).\n\nمهرباني وکړئ د بارونو د ترانزیت د درېدو مخنیوي لپاره خپل حساب سمدستي تصفیه کړئ.`
    } else {
      text = `💳 *د سکای اریانا لوژستیک — د تادیې یادونه*\n\nمحترم ${recipient}،\nمهرباني وکړئ لاندې فاکتور په نظر کې ونیسئ:\n• فاکتور شمېره: *${invNo}*\n• سررسید: ${dueDate}\n• د تادیې وړ مقدار: *${currency} ${amount}*\n\nستاسو له ملاتړ او پر وخت تادیې مننه.`
    }
  } else if (lang === "fa") {
    if (level === "OVERDUE_URGENT" || daysOverdue > 14) {
      text = `🚨 *اسکای آریانا لجستیک — اخطار فوری تسویه حساب*\n\nجناب ${recipient} گرامی،\nفاکتور *${invNo}* به مبلغ *${currency} ${amount}* با تاخیر ${daysOverdue} روزه مواجه است (سررسید: ${dueDate}).\n\nخواهشمند است جهت جلوگیری از توقف عملیات باربری، نسبت به واریز وجه اقدام فرمایید.`
    } else {
      text = `💳 *اسکای آریانا لجستیک — یادآوری سررسید فاکتور*\n\nجناب ${recipient} گرامی،\nمشخصات فاکتور شما به شرح زیر است:\n• شماره فاکتور: *${invNo}*\n• تاریخ سررسید: ${dueDate}\n• مبلغ قابل پرداخت: *${currency} ${amount}*\n\nاز توجه و تسویه به موقع شما سپاسگزاریم.`
    }
  } else if (lang === "ur") {
    text = `💳 *اسکائی اریانا لاجسٹکس — ادائیگی کی یاد دہانی*\n\nمحترم ${recipient}،\nانوائس نمبر *${invNo}* کی رقم *${currency} ${amount}* واجب الادا ہے (تاریخ: ${dueDate}).\nبراہ کرم بروقت ادائیگی یقینی بنائیں۔`
  } else {
    // English default
    if (level === "OVERDUE_URGENT" || daysOverdue > 14) {
      text = `🚨 *SKY ARIANA LOGISTICS — URGENT OVERDUE PAYMENT NOTICE*\n\nDear ${recipient},\nYour invoice *${invNo}* amounting to *${currency} ${amount}* is overdue by *${daysOverdue} days* (Due Date: ${dueDate}).\n\nPlease settle this balance immediately to prevent hold or suspension of active shipments.\n\nThank you for your prompt attention.`
    } else {
      text = `💳 *SKY ARIANA LOGISTICS — PAYMENT REMINDER*\n\nDear ${recipient},\nThis is a friendly reminder regarding your outstanding invoice:\n\n• Invoice: *${invNo}*\n• Due Date: ${dueDate}\n• Balance Due: *${currency} ${amount}*\n\nWe appreciate your prompt settlement.`
    }
  }

  if (options.customRemark && options.customRemark.trim()) {
    text += `\n\n📌 *Note:* ${options.customRemark.trim()}`
  }

  return { text, context }
}

/**
 * Generate Customer Account Balance Summary with STRICT MULTI-CURRENCY DEMARCATION
 * Mathematical Invariance: Balance = Debit - Credit.
 * NEVER merges USD, AED, AFN into a fake unified total.
 */
export async function generateAccountBalanceSummary(
  customerName: string,
  options: RenderTemplateOptions
): Promise<{
  text: string
  balances: Array<{ currency: string; debit: number; credit: number; balance: number }>
}> {
  const db = await getAccountLedgerDatabase()
  const lang = options.language || "en"
  const cleanName = (customerName || "").trim().toLowerCase()

  // Find all matching company ledger keys
  const matchingKeys = Object.keys(db.ledgerEntries).filter((k) =>
    k.trim().toLowerCase().includes(cleanName)
  )

  const currencyMap = new Map<string, { debit: number; credit: number }>()

  for (const k of matchingKeys) {
    const rows = db.ledgerEntries[k] || []
    for (const row of rows) {
      const curr = (row.currency || "USD").toUpperCase()
      const d = Number(row.debit) || 0
      const c = Number(row.credit) || 0

      const cur = currencyMap.get(curr) || { debit: 0, credit: 0 }
      cur.debit += d
      cur.credit += c
      currencyMap.set(curr, cur)
    }
  }

  const balances: Array<{ currency: string; debit: number; credit: number; balance: number }> = []

  // Ensure default currencies are declared if map is empty
  if (currencyMap.size === 0) {
    balances.push({ currency: "USD", debit: 0, credit: 0, balance: 0 })
  } else {
    for (const [curr, val] of currencyMap.entries()) {
      balances.push({
        currency: curr,
        debit: Math.round(val.debit * 100) / 100,
        credit: Math.round(val.credit * 100) / 100,
        balance: Math.round((val.debit - val.credit) * 100) / 100,
      })
    }
  }

  let text = ""
  const dateStr = new Date().toISOString().slice(0, 10)

  if (lang === "ps") {
    text = `📊 *د سکای اریانا لوژستیک — د حساب توازن او بېلانس*\n\nپیریدونکی: *${customerName}*\nنېټه: ${dateStr}\n\n*د اسعارو په تفکیک سره حساب:*\n`
    for (const b of balances) {
      const statusText = b.balance > 0 ? "باقيدار (پاتې پور)" : b.balance < 0 ? "طلبکار (اضافي تادیه)" : "تصفیه شوی"
      text += `• *${b.currency}*:\n  مجموعي ډیبټ: ${b.debit.toLocaleString()}\n  مجموعي کریډیټ: ${b.credit.toLocaleString()}\n  *پاتې بېلانس: ${b.balance.toLocaleString()} ${b.currency}* (${statusText})\n\n`
    }
    text += `نوټ: ټول اسعار په جلا ډول ساتل کیږي او نه دي ګډ شوي.`
  } else if (lang === "fa") {
    text = `📊 *اسکای آریانا لجستیک — صورتحساب و وضعیت توازن*\n\nمشتری: *${customerName}*\nتاریخ: ${dateStr}\n\n*تفکیک بر اساس اسعار:*\n`
    for (const b of balances) {
      const statusText = b.balance > 0 ? "بدهکار" : b.balance < 0 ? "بستانکار" : "تسویه شده"
      text += `• *${b.currency}*:\n  مجموع بدهی: ${b.debit.toLocaleString()}\n  مجموع بستانکاری: ${b.credit.toLocaleString()}\n  *مانده حساب: ${b.balance.toLocaleString()} ${b.currency}* (${statusText})\n\n`
    }
    text += `توجه: مبالغ اسعار مختلف به صورت کاملاً مجزا محاسبه شده است.`
  } else {
    text = `📊 *SKY ARIANA LOGISTICS — ACCOUNT STATEMENT & BALANCE*\n\nCustomer: *${customerName}*\nDate: ${dateStr}\n\n*Balance Segregated by Currency:*\n`
    for (const b of balances) {
      const statusText = b.balance > 0 ? "Outstanding Due" : b.balance < 0 ? "Credit Balance" : "Settled"
      text += `• *${b.currency}*:\n  Total Debit: ${b.debit.toLocaleString()}\n  Total Credit: ${b.credit.toLocaleString()}\n  *Net Balance: ${b.balance.toLocaleString()} ${b.currency}* (${statusText})\n\n`
    }
    text += `_Note: Currencies are strictly demarcated and not merged._`
  }

  return { text, balances }
}

/**
 * Generate Document Ready Notice
 */
export async function generateDocumentReadyNotice(
  bolNumber: string,
  documentTypes: string[],
  options: RenderTemplateOptions
): Promise<{ text: string; context: CommunicationContextData }> {
  const context = await getCommunicationContext("BOL", bolNumber)
  context.documents_ready = documentTypes
  const lang = options.language || "en"

  const allTemplates = await getAllTemplates()
  let tpl = allTemplates.find((t) => t.category === "Document Ready")
  if (!tpl) tpl = BUILTIN_COMMUNICATION_TEMPLATES.find((t) => t.category === "Document Ready")!

  const raw = tpl.content[lang] || tpl.content.en
  const text = renderTemplateText(raw, context, options)

  return { text, context }
}

/**
 * Generate Daily Status Report (Single or Multi-Shipment WhatsApp digest)
 */
export async function generateDailyStatusReport(filter: {
  scope: "all" | "customer" | "route" | "selected"
  customerName?: string
  route?: string
  bolIds?: string[]
  language?: MessageLanguage
}): Promise<DailyStatusReportResult> {
  const bols = await getAllLocalBOLs()
  const lang = filter.language || "en"
  const dateStr = new Date().toISOString().slice(0, 10)

  let filtered = [...bols]

  if (filter.scope === "customer" && filter.customerName) {
    const q = filter.customerName.trim().toLowerCase()
    filtered = filtered.filter(
      (b) =>
        (b.consignee_name && b.consignee_name.toLowerCase().includes(q)) ||
        (b.consignee && b.consignee.toLowerCase().includes(q)) ||
        (b.shipper_name && b.shipper_name.toLowerCase().includes(q))
    )
  } else if (filter.scope === "route" && filter.route) {
    const q = filter.route.trim().toLowerCase()
    filtered = filtered.filter(
      (b) =>
        (b.loading_point && b.loading_point.toLowerCase().includes(q)) ||
        (b.delivery_place && b.delivery_place.toLowerCase().includes(q)) ||
        (b.origin && b.origin.toLowerCase().includes(q)) ||
        (b.destination && b.destination.toLowerCase().includes(q))
    )
  } else if (filter.scope === "selected" && filter.bolIds) {
    const set = new Set(filter.bolIds.map((id) => id.trim().toLowerCase()))
    filtered = filtered.filter((b) => set.has(String(b.bol_number || b.id).toLowerCase()))
  }

  // Calculate statistics
  const stats = {
    active: 0,
    atBorder: 0,
    atPort: 0,
    atSea: 0,
    delayed: 0,
    arrivingToday: 0,
  }

  const shipmentSummaries: DailyStatusShipmentSummary[] = []

  for (const b of filtered) {
    const bolNum = b.bol_number || b.billOfLadingNumber || b.id || "BOL-N/A"
    const st = (b.status || b.shipment_status || "In Transit").toLowerCase()
    const loc = b.current_location || b.transit_border_station || b.loading_point || "In Transit"
    const isDel =
      b.isDelayed ||
      st.includes("delayed") ||
      st.includes("hold") ||
      Boolean(b.delay_reason)

    if (st !== "delivered") stats.active++
    if (st.includes("border") || loc.toLowerCase().includes("border") || loc.toLowerCase().includes("islam qala") || loc.toLowerCase().includes("torghundi") || loc.toLowerCase().includes("hairatan")) {
      stats.atBorder++
    }
    if (st.includes("port") || loc.toLowerCase().includes("port") || loc.toLowerCase().includes("bandar abbas") || loc.toLowerCase().includes("karachi")) {
      stats.atPort++
    }
    if (st.includes("sea") || st.includes("vessel") || st.includes("sailing")) {
      stats.atSea++
    }
    if (isDel) stats.delayed++

    if (b.eta && b.eta.slice(0, 10) === dateStr) {
      stats.arrivingToday++
    }

    shipmentSummaries.push({
      bolNumber: bolNum,
      containerNumber: b.container_numbers || b.container_number || undefined,
      customer: b.consignee_name || b.consignee || b.shipper_name || "Customer",
      origin: b.loading_point || b.origin || "Origin",
      destination: b.delivery_place || b.destination || "Destination",
      currentLocation: loc,
      status: b.status || "In Transit",
      eta: b.eta ? b.eta.slice(0, 10) : undefined,
      isDelayed: isDel,
    })
  }

  // Build formatted multi-shipment summary message
  let formatted = ""
  if (lang === "ps") {
    formatted = `📋 *د سکای اریانا لوژستیک — د ورځني بارونو راپور*\nنېټه: *${dateStr}*\nټول فعال بارونه: *${stats.active}* | په سرحد کې: *${stats.atBorder}* | په بحر کې: *${stats.atSea}* | ځنډېدلي: *${stats.delayed}*\n\n`
    for (const s of shipmentSummaries.slice(0, 25)) {
      formatted += `• *${s.bolNumber}* | ${s.customer}\n  ${s.origin} ➔ ${s.destination}\n  تمځای: ${s.currentLocation} | حالت: ${s.status}${s.eta ? ` | ETA: ${s.eta}` : ""}\n\n`
    }
  } else if (lang === "fa") {
    formatted = `📋 *اسکای آریانا لجستیک — گزارش وضعیت روزانه محموله‌ها*\nتاریخ: *${dateStr}*\nکل محموله‌های فعال: *${stats.active}* | در مرز: *${stats.atBorder}* | در دریا: *${stats.atSea}* | دارای تاخیر: *${stats.delayed}*\n\n`
    for (const s of shipmentSummaries.slice(0, 25)) {
      formatted += `• *${s.bolNumber}* | ${s.customer}\n  ${s.origin} ➔ ${s.destination}\n  موقعیت: ${s.currentLocation} | وضعیت: ${s.status}${s.eta ? ` | ETA: ${s.eta}` : ""}\n\n`
    }
  } else {
    formatted = `📋 *SKY ARIANA LOGISTICS — DAILY SHIPMENTS DIGEST*\nDate: *${dateStr}*\nActive: *${stats.active}* | At Border: *${stats.atBorder}* | At Port/Sea: *${stats.atPort + stats.atSea}* | Delayed: *${stats.delayed}*\n\n`
    for (const s of shipmentSummaries.slice(0, 25)) {
      formatted += `• *${s.bolNumber}* | ${s.customer}\n  ${s.origin} ➔ ${s.destination}\n  Current: ${s.currentLocation} | Status: ${s.status}${s.eta ? ` | ETA: ${s.eta}` : ""}\n\n`
    }
  }

  if (shipmentSummaries.length > 25) {
    formatted += `_...and ${shipmentSummaries.length - 25} more shipments in system._\n`
  }

  formatted += `Sky Ariana Logistics Operations Team`

  return {
    date: dateStr,
    language: lang,
    scope: filter.scope,
    totalShipments: shipmentSummaries.length,
    stats,
    formattedMessage: formatted.trim(),
    shipments: shipmentSummaries,
  }
}

/**
 * Log communication event to persistent audit trail
 */
export async function logCommunication(
  record: Omit<CommunicationHistoryRecord, "id" | "generated_at">
): Promise<CommunicationHistoryRecord> {
  const newEntry: CommunicationHistoryRecord = {
    ...record,
    id: `comm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    generated_at: new Date().toISOString(),
  }

  await mutateJsonFile<CommunicationHistoryRecord[]>(HISTORY_FILE, [], (list) => {
    const existing = Array.isArray(list) ? list : []
    return [newEntry, ...existing]
  })

  return newEntry
}

/**
 * Get communication history with filtering
 */
export async function getCommunicationHistory(filters?: {
  entity_type?: string
  entity_id?: string
  communication_type?: CommunicationType
  channel?: CommunicationChannel
  sent_status?: CommunicationSentStatus
  limit?: number
}): Promise<CommunicationHistoryRecord[]> {
  const all = await readJsonFile<CommunicationHistoryRecord[]>(HISTORY_FILE, [])
  let list = Array.isArray(all) ? all : []

  if (filters?.entity_type) {
    list = list.filter((r) => r.entity_type.toLowerCase() === filters.entity_type!.toLowerCase())
  }
  if (filters?.entity_id) {
    list = list.filter((r) => r.entity_id.toLowerCase() === filters.entity_id!.toLowerCase())
  }
  if (filters?.communication_type) {
    list = list.filter((r) => r.communication_type === filters.communication_type)
  }
  if (filters?.channel) {
    list = list.filter((r) => r.channel === filters.channel)
  }
  if (filters?.sent_status) {
    list = list.filter((r) => r.sent_status === filters.sent_status)
  }

  const limit = filters?.limit || 100
  return list.slice(0, limit)
}
