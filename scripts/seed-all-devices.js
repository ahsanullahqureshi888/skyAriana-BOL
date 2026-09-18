const fs = require('fs');
const path = require('path');

const prefix = `{
  "app": "SKY_ARIANA_LOGISTICS",
  "version": "5.1pro",
  "exportedAt": "2026-08-27T04:49:47.757Z",
  "totalDocuments": 79,
  "savedDocuments": [
    {
      "truck_number": "71731کابل",
      "driver_name": "  شبیراحمد ولد حاجی محمد",
      "driver_father_name": "",
      "driver_contact": "0706239841",
      "driver_rent": "38,500 - AFN",
      "routes": [
        {
          "id": "3f178fe6-77e5-4b58-8b6a-9dac81d8534d",
          "location": "Kandahar",
          "locationPersian": "کندهار",
          "stopOrder": 1,
          "transportMode": "truck",
          "stopLabel": "Origin"
        },
        {
          "id": "aa9e788a-d58d-4921-baca-157391c7a8f4",
          "location": "Nimroz",
          "locationPersian": "نیمروز / میلک",
          "stopOrder": 2,
          "transportMode": "truck",
          "stopLabel": "Stop 1"
        },
        {
          "id": "077ab376-1f86-46ea-adde-72d577e24ead",
          "location": "Bandar Abbas, IR",
          "locationPersian": "بندرعباس، ایران",
          "stopOrder": 3,
          "transportMode": "vessel",
          "stopLabel": "Stop 2"
        },
        {
          "id": "b4bd0fdb-a730-4271-81d9-306c482b43f2",
          "location": "Dubai, AE",
          "locationPersian": "دبی، امارات",
          "stopOrder": 4,
          "transportMode": "vessel",
          "stopLabel": "Stop 3"
        },
        {
          "id": "4599df8c-036f-4de2-a895-c1984905c689",
          "location": "Nhava Sheva, IN",
          "locationPersian": "نوا شوا، هند",
          "stopOrder": 5,
          "transportMode": "vessel",
          "stopLabel": "Destination"
        }
      ],
      "container_type": "",
      "container_size": "",
      "container_numbers": "",
      "seal_numbers": "",
      "shipper_name": "HAJI-NOOR-MUHMMAD-AYAZ-NOORI",
      "shipper_address": "",
      "shipper_contact": "+93 790 10 7000",
      "shipper_email": "",
      "consignee_name": "",
      "consignee_address": "",
      "consignee_contact": "",
      "consignee_email": "",
      "notify_party": "",
      "notify_party_address": "",
      "vessel_name": "",
      "voyage_number": "",
      "port_of_loading": "",
      "port_of_discharge": "",
      "place_of_delivery": "",
      "cargo_description": "📦 CONTAINER & CARGO DETAILS │ 🧾 DOCUMENT & SHIPPING DETAILS\\n🥬 Cargo:    514-  49.5-KGS     پارسل رویحان │",
      "net_weight": "25,443 KG",
      "gross_weight": "",
      "measurement": "",
      "number_of_packages": "514- CTNS پارسل رویحان- ",
      "kgs_per_carton": "49.5",
      "gross_weight_per_carton": "",
      "rate_per_kgs": "",
      "goods_value": "",
      "freight_payable_at": "",
      "freight_terms": "",
      "remarks": "",
      "notes_1": "نظرمحمد (یارمل)\\n(+93) 0 700 203 307",
      "notes_1_label": "دکندهار بارګیری مسؤل",
      "notes_1_theme": "red",
      "notes_2": "دنیمروز نماینده نمبر:\\n0711 263 528  ,     079 335 3246,   ",
      "notes_2_label": "نماینده نمبرونه",
      "notes_2_theme": "blue",
      "afghanistan_documents": [],
      "afghanistan_document_details": {},
      "id": "BOL-2026-NSA513",
      "bol_number": "BOL-2026-NSA513",
      "issue_date": "2026-08-26",
      "persian_date": "۴ شهریور ۱۴۰۵",
      "persian_date_numeric": "۱۴۰۵/۰۶/۰۴",
      "updated_at": "2026-08-27T04:49:33.856Z"
    },
    {
      "bol_number": "BOL-2026-NSA470",
      "issue_date": "2026-08-27",
      "notes_1": "نظرمحمد (یارمل)\\n(+93) 0 700 203 307",
      "notes_1_label": "دکندهار بارګیری مسؤل",
      "notes_1_theme": "red",
      "notes_2": "عبدالوهاب ریگوال اسلام قلعه/نجیب الله حسین محمودی مقدم\\n0796140001  0703130001\\nنماینده دوغارون /شماره تماس : 09152091993",
      "notes_2_label": "نماینده نمبر",
      "notes_2_theme": "red",
      "truck_number": "",
      "driver_name": "",
      "driver_father_name": "",
      "driver_contact": "",
      "driver_rent": "",
      "routes": [
        {
          "id": "7fa58d94-a33f-418d-99de-5329c6f1e34d",
          "location": "Kandahar",
          "locationPersian": "کندهار",
          "stopOrder": 1,
          "transportMode": "truck",
          "stopLabel": "Origin"
        },
        {
          "id": "e2afea5c-a50c-4816-b662-891cbebf227a",
          "location": "Nimroz",
          "locationPersian": "نیمروز / میلک",
          "stopOrder": 2,
          "transportMode": "truck",
          "stopLabel": "Stop 1"
        },
        {
          "id": "e567792b-2845-4a12-8791-21dd920b9ee3",
          "location": "Bandar Abbas, IR",
          "locationPersian": "بندرعباس، ایران",
          "stopOrder": 3,
          "transportMode": "vessel",
          "stopLabel": "Stop 2"
        },
        {
          "id": "e37f5f8d-ca45-4fd3-bcaa-71faac3cc8cb",
          "location": "Dubai, AE",
          "locationPersian": "دبی، امارات",
          "stopOrder": 4,
          "transportMode": "vessel",
          "stopLabel": "Stop 3"
        },
        {
          "id": "e8a3e561-7bd0-47d8-b039-d17c04a04c37",
          "location": "Nhava Sheva, IN",
          "locationPersian": "نوا شوا، هند",
          "stopOrder": 5,
          "transportMode": "vessel",
          "stopLabel": "Destination"
        }
      ],
      "container_type": "",
      "container_size": "",
      "container_numbers": "",
      "seal_numbers": "",
      "shipper_name": "",
      "shipper_address": "",
      "shipper_contact": "",
      "shipper_email": "",
      "consignee_name": "",
      "consignee_address": "",
      "consignee_contact": "",
      "consignee_email": "",
      "notify_party": "",
      "notify_party_address": "",
      "vessel_name": "",
      "voyage_number": "",
      "port_of_loading": "",
      "port_of_discharge": "",
      "place_of_delivery": "",
      "cargo_description": "📦 CONTAINER & CARGO DETAILS │ 🧾 DOCUMENT & SHIPPING DETAILS\\n🥬 Cargo: | 📅 Transit Date: | 📄 HS CODE:  │ 📄 Afghan TC No:  │ 📄 Invoice NO: ",
      "net_weight": "",
      "gross_weight": "",
      "measurement": "",
      "number_of_packages": "",
      "kgs_per_carton": "",
      "gross_weight_per_carton": "",
      "rate_per_kgs": "",
      "goods_value": "",
      "freight_payable_at": "",
      "freight_terms": "",
      "remarks": "",
      "iran_office_building": "CUBIC BUILDING",
      "iran_office_location": "BANDAR ABBASS - IRAN",
      "iran_office_pobox": "7913973295",
      "iran_office_telefax": "+98 76 32226028",
      "iran_office_cellphone": "+98 09172325086",
      "iran_office_email": "info@balambarbaran.com, ceo@balambarbaran.com",
      "afghanistan_documents": [],
      "afghanistan_document_details": {},
      "persian_date": "۵ شهریور ۱۴۰۵",
      "persian_date_numeric": "۱۴۰۵/۰۶/۰۵",
      "updated_at": "2026-08-27T04:47:21.792Z"
    },
    {
      "bol_number": "BOL-2026-NSA524",
      "issue_date": "2026-08-26",
      "notes_1": "نظرمحمد (یارمل)\\n(+93) 0 700 203 307",
      "notes_1_label": "دکندهار بارګیری مسؤل",
      "notes_1_theme": "red",
      "notes_2": "عبدالوهاب ریگوال اسلام قلعه/نجیب الله حسین محمودی مقدم\\n0796140001  0703130001\\nنماینده دوغارون /شماره تماس : 09152091993",
      "notes_2_label": "نماینده نمبر",
      "notes_2_theme": "red",
      "truck_number": "",
      "driver_name": "",
      "driver_father_name": "",
      "driver_contact": "",
      "driver_rent": "",
      "routes": [
        {
          "id": "55d2c1b2-2c47-42c2-9754-a0e7c97f799c",
          "location": "Kandahar",
          "locationPersian": "کندهار",
          "stopOrder": 1,
          "transportMode": "truck",
          "stopLabel": "Origin"
        },
        {
          "id": "3f88d2c4-c286-467a-9870-5a0664104741",
          "location": "Nimroz",
          "locationPersian": "نیمروز / میلک",
          "stopOrder": 2,
          "transportMode": "truck",
          "stopLabel": "Stop 1"
        },
        {
          "id": "47b89a09-77ca-4b78-8de6-002f344479ca",
          "location": "Bandar Abbas, IR",
          "locationPersian": "بندرعباس، ایران",
          "stopOrder": 3,
          "transportMode": "vessel",
          "stopLabel": "Stop 2"
        },
        {
          "id": "6837e788-396b-4877-9bdc-0bcac4408e74",
          "location": "Dubai, AE",
          "locationPersian": "دبی، امارات",
          "stopOrder": 4,
          "transportMode": "vessel",
          "stopLabel": "Stop 3"
        },
        {
          "id": "fc598dcd-176a-43e9-bd6f-f6b9cec6dc77",
          "location": "Nhava Sheva, IN",
          "locationPersian": "نوا شوا، هند",
          "stopOrder": 5,
          "transportMode": "vessel",
          "stopLabel": "Destination"
        }
      ],
      "container_type": "",
      "container_size": "",
      "container_numbers": "",
      "seal_numbers": "",
      "shipper_name": "",
      "shipper_address": "",
      "shipper_contact": "",
      "shipper_email": "",
      "consignee_name": "",
      "consignee_address": "",
      "consignee_contact": "",
      "consignee_email": "",
      "notify_party": "",
      "notify_party_address": "",
      "vessel_name": "",
      "voyage_number": "",
      "port_of_loading": "",
      "port_of_discharge": "",
      "place_of_delivery": "",
      "cargo_description": "📦 CONTAINER & CARGO DETAILS │ 🧾 DOCUMENT & SHIPPING DETAILS\\n🥬 Cargo: | 📅 Transit Date: | 📄 HS CODE:  │ 📄 Afghan TC No:  │ 📄 Invoice NO: ",
      "net_weight": "",
      "gross_weight": "",
      "measurement": "",
      "number_of_packages": "",
      "kgs_per_carton": "",
      "gross_weight_per_carton": "",
      "rate_per_kgs": "",
      "goods_value": "",
      "freight_payable_at": "",
      "freight_terms": "",
      "remarks": "",
      "iran_office_building": "CUBIC BUILDING",
      "iran_office_location": "BANDAR ABBASS - IRAN",
      "iran_office_pobox": "7913973295",
      "iran_office_telefax": "+98 76 32226028",
      "iran_office_cellphone": "+98 09172325086",
      "iran_office_email": "info@balambarbaran.com, ceo@balambarbaran.com",
      "afghanistan_documents": [],
      "afghanistan_document_details": {},
      "persian_date": "۴ شهریور ۱۴۰۵",
      "persian_date_numeric": "۱۴۰۵/۰۶/۰۴",
      "updated_at": "2026-08-26T17:46:57.399Z"
    },
    {
      "bol_number": "BOL-2026-NSA523",
      "issue_date": "2026-08-26",
      "notes_1": "نظرمحمد (یارمل)\\n(+93) 0 700 203 307",
      "notes_1_label": "دکندهار بارګیری مسؤل",
      "notes_1_theme": "red",
      "notes_2": "عبدالوهاب ریگوال اسلام قلعه/نجیب الله حسین محمودی مقدم\\n0796140001  0703130001\\nنماینده دوغارون /شماره تماس : 09152091993",
      "notes_2_label": "نماینده نمبر",
      "notes_2_theme": "red",
      "truck_number": "",
      "driver_name": "",
      "driver_father_name": "",
      "driver_contact": "",
      "driver_rent": "",
      "routes": [
        {
          "id": "55d2c1b2-2c47-42c2-9754-a0e7c97f799c",
          "location": "Kandahar",
          "locationPersian": "کندهار",
          "stopOrder": 1,
          "transportMode": "truck",
          "stopLabel": "Origin"
        },
        {
          "id": "3f88d2c4-c286-467a-9870-5a0664104741",
          "location": "Nimroz",
          "locationPersian": "نیمروز / میلک",
          "stopOrder": 2,
          "transportMode": "truck",
          "stopLabel": "Stop 1"
        },
        {
          "id": "47b89a09-77ca-4b78-8de6-002f344479ca",
          "location": "Bandar Abbas, IR",
          "locationPersian": "بندرعباس، ایران",
          "stopOrder": 3,
          "transportMode": "vessel",
          "stopLabel": "Stop 2"
        },
        {
          "id": "6837e788-396b-4877-9bdc-0bcac4408e74",
          "location": "Dubai, AE",
          "locationPersian": "دبی، امارات",
          "stopOrder": 4,
          "transportMode": "vessel",
          "stopLabel": "Stop 3"
        },
        {
          "id": "fc598dcd-176a-43e9-bd6f-f6b9cec6dc77",
          "location": "Nhava Sheva, IN",
          "locationPersian": "نوا شوا، هند",
          "stopOrder": 5,
          "transportMode": "vessel",
          "stopLabel": "Destination"
        }
      ],
      "container_type": "",
      "container_size": "",
      "container_numbers": "",
      "seal_numbers": "",
      "shipper_name": "",
      "shipper_address": "",
      "shipper_contact": "",
      "shipper_email": "",
      "consignee_name": "",
      "consignee_address": "",
      "consignee_contact": "",
      "consignee_email": "",
      "notify_party": "",
      "notify_party_address": "",
      "vessel_name": "",
      "voyage_number": "",
      "port_of_loading": "",
      "port_of_discharge": "",
      "place_of_delivery": "",
      "cargo_description": "📦 CONTAINER & CARGO DETAILS │ 🧾 DOCUMENT & SHIPPING DETAILS\\n🥬 Cargo: | 📅 Transit Date: | 📄 HS CODE:  │ 📄 Afghan TC No:  │ 📄 Invoice NO: ",
      "net_weight": "",
      "gross_weight": "",
      "measurement": "",
      "number_of_packages": "",
      "kgs_per_carton": "",
      "gross_weight_per_carton": "",
      "rate_per_kgs": "",
      "goods_value": "",
      "freight_payable_at": "",
      "freight_terms": "",
      "remarks": "",
      "iran_office_building": "CUBIC BUILDING",
      "iran_office_location": "BANDAR ABBASS - IRAN",
      "iran_office_pobox": "7913973295",
      "iran_office_telefax": "+98 76 32226028",
      "iran_office_cellphone": "+98 09172325086",
      "iran_office_email": "info@balambarbaran.com, ceo@balambarbaran.com",
      "afghanistan_documents": [],
      "afghanistan_document_details": {},
      "persian_date": "۴ شهریور ۱۴۰۵",
      "persian_date_numeric": "۱۴۰۵/۰۶/۰۴",
      "updated_at": "2026-08-26T17:38:06.582Z"
    },
    {
      "bol_number": "BOL-2026-NSA522",
      "issue_date": "2026-08-26",
      "notes_1": "نظرمحمد (یارمل)\\n(+93) 0 700 203 307",
      "notes_1_label": "دکندهار بارګیری مسؤل",
      "notes_1_theme": "red",
      "notes_2": "عبدالوهاب ریگوال اسلام قلعه/نجیب الله حسین محمودی مقدم\\n0796140001  0703130001\\nنماینده دوغارون /شماره تماس : 09152091993",
      "notes_2_label": "نماینده نمبر",
      "notes_2_theme": "red",
      "truck_number": "",
      "driver_name": "",
      "driver_father_name": "",
      "driver_contact": "",
      "driver_rent": "",
      "routes": [
        {
          "id": "3e25c9de-803c-46ac-9ddb-71983522a31f",
          "location": "Kandahar",
          "locationPersian": "کندهار",
          "stopOrder": 1,
          "transportMode": "truck",
          "stopLabel": "Origin"
        },
        {
          "id": "323c7b23-c310-41f6-a601-c604bbcb2fc1",
          "location": "Nimroz",
          "locationPersian": "نیمروز / میلک",
          "stopOrder": 2,
          "transportMode": "truck",
          "stopLabel": "Stop 1"
        },
        {
          "id": "0638b155-3a95-410b-b55d-a58981eca3ed",
          "location": "Bandar Abbas, IR",
          "locationPersian": "بندرعباس، ایران",
          "stopOrder": 3,
          "transportMode": "vessel",
          "stopLabel": "Stop 2"
        },
        {
          "id": "cd01bb46-4816-47bc-8aa6-3997c2657a32",
          "location": "Dubai, AE",
          "locationPersian": "دبی، امارات",
          "stopOrder": 4,
          "transportMode": "vessel",
          "stopLabel": "Stop 3"
        },
        {
          "id": "fa69f0b6-f78d-4b74-8e1f-50150c0fd4bd",
          "location": "Nhava Sheva, IN",
          "locationPersian": "نوا شوا، هند",
          "stopOrder": 5,
          "transportMode": "vessel",
          "stopLabel": "Destination"
        }
      ],
      "container_type": "",
      "container_size": "",
      "container_numbers": "",
      "seal_numbers": "",
      "shipper_name": "",
      "shipper_address": "",
      "shipper_contact": "",
      "shipper_email": "",
      "consignee_name": "",
      "consignee_address": "",
      "consignee_contact": "",
      "consignee_email": "",
      "notify_party": "",
      "notify_party_address": "",
      "vessel_name": "",
      "voyage_number": "",
      "port_of_loading": "",
      "port_of_discharge": "",
      "place_of_delivery": "",
      "cargo_description": "📦 CONTAINER & CARGO DETAILS │ 🧾 DOCUMENT & SHIPPING DETAILS\\n🥬 Cargo: | 📅 Transit Date: | 📄 HS CODE:  │ 📄 Afghan TC No:  │ 📄 Invoice NO: ",
      "net_weight": "",
      "gross_weight": "",
      "measurement": "",
      "number_of_packages": "",
      "kgs_per_carton": "",
      "gross_weight_per_carton": "",
      "rate_per_kgs": "",
      "goods_value": "",
      "freight_payable_at": "",
      "freight_terms": "",
      "remarks": "",
      "iran_office_building": "CUBIC BUILDING",
      "iran_office_location": "BANDAR ABBASS - IRAN",
      "iran_office_pobox": "7913973295",
      "iran_office_telefax": "+98 76 32226028",
      "iran_office_cellphone": "+98 09172325086",
      "iran_office_email": "info@balambarbaran.com, ceo@balambarbaran.com",
      "afghanistan_documents": [],
      "afghanistan_document_details": {},
      "persian_date": "۴ شهریور ۱۴۰۵",
      "persian_date_numeric": "۱۴۰۵/۰۶/۰۴",
      "updated_at": "2026-08-26T17:35:45.578Z"
    },
    {
      "bol_number": "BOL-2026-NSA521",
      "issue_date": "2026-08-26",
      "notes_1": "نظرمحمد (یارمل)\\n(+93) 0 700 203 307",
      "notes_1_label": "دکندهار بارګیری مسؤل",
      "notes_1_theme": "red",
      "notes_2": "عبدالوهاب ریگوال اسلام قلعه/نجیب الله حسین محمودی مقدم\\n0796140001  0703130001\\nنماینده دوغارون /شماره تماس : 09152091993",
      "notes_2_label": "نماینده نمبر",
      "notes_2_theme": "red",
      "truck_number": "",
      "driver_name": "",
      "driver_father_name": "",
      "driver_contact": "",
      "driver_rent": "",
      "routes": [
        {
          "id": "3e25c9de-803c-46ac-9ddb-71983522a31f",
          "location": "Kandahar",
          "locationPersian": "کندهار",
          "stopOrder": 1,
          "transportMode": "truck",
          "stopLabel": "Origin"
        },
        {
          "id": "323c7b23-c310-41f6-a601-c604bbcb2fc1",
          "location": "Nimroz",
          "locationPersian": "نیمروز / میلک",
          "stopOrder": 2,
          "transportMode": "truck",
          "stopLabel": "Stop 1"
        },
        {
          "id": "0638b155-3a95-410b-b55d-a58981eca3ed",
          "location": "Bandar Abbas, IR",
          "locationPersian": "بندرعباس، ایران",
          "stopOrder": 3,
          "transportMode": "vessel",
          "stopLabel": "Stop 2"
        },
        {
          "id": "cd01bb46-4816-47bc-8aa6-3997c2657a32",
          "location": "Dubai, AE",
          "locationPersian": "دبی، امارات",
          "stopOrder": 4,
          "transportMode": "vessel",
          "stopLabel": "Stop 3"
        },
        {
          "id": "fa69f0b6-f78d-4b74-8e1f-50150c0fd4bd",
          "location": "Nhava Sheva, IN",
          "locationPersian": "نوا شوا، هند",
          "stopOrder": 5,
          "transportMode": "vessel",
          "stopLabel": "Destination"
        }
      ],
      "container_type": "",
      "container_size": "",
      "container_numbers": "",
      "seal_numbers": "",
      "shipper_name": "",
      "shipper_address": "",
      "shipper_contact": "",
      "shipper_email": "",
      "consignee_name": "",
      "consignee_address": "",
      "consign`;

async function run() {
  const backupFilePath = 'C:/Users/HomePC/Downloads/sky_ariana_full_backup_2026-08-27.json';
  const rest = fs.readFileSync(backupFilePath, 'utf8');
  let fullData;

  try {
    fullData = JSON.parse(rest);
  } catch (e) {
    console.log('File has truncated prefix, applying prefix...');
    const combined = prefix + rest;
    fullData = JSON.parse(combined);
    fs.writeFileSync(backupFilePath, JSON.stringify(fullData, null, 2), 'utf8');
    console.log('Fixed file at:', backupFilePath);
  }

  console.log('Successfully loaded full backup data!');
  console.log('- Total Documents:', fullData.savedDocuments?.length);
  console.log('- Custom Companies:', fullData.customCompanies?.length);
  console.log('- Account Ledgers keys:', Object.keys(fullData.accountLedgers || {}).length);
  console.log('- Route Presets:', fullData.routePresets?.length);
  console.log('- Saved Shippers:', fullData.savedShippers?.length);
  console.log('- Saved Consignees:', fullData.savedConsignees?.length);
  console.log('- Saved Notify Parties:', fullData.savedNotifyParties?.length);

  const rootDir = 'd:/skybalam-26-bol-V3.2/skybalam-26-bol-V3.2';

  // 1. Write to .local-bols.json
  const bolsFile = path.join(rootDir, '.local-bols.json');
  fs.writeFileSync(bolsFile, JSON.stringify(fullData.savedDocuments, null, 2), 'utf8');
  console.log(`Updated ${bolsFile} with ${fullData.savedDocuments.length} documents.`);

  // 2. Write to .local-bol-account-ledgers.json
  const bolLedgersFile = path.join(rootDir, '.local-bol-account-ledgers.json');
  const bolLedgerDb = {
    customCompanies: fullData.customCompanies || [],
    ledgerRecords: fullData.accountLedgers || {},
    updated_at: new Date().toISOString(),
  };
  fs.writeFileSync(bolLedgersFile, JSON.stringify(bolLedgerDb, null, 2), 'utf8');
  console.log(`Updated ${bolLedgersFile} with ${Object.keys(fullData.accountLedgers || {}).length} ledgers and ${fullData.customCompanies?.length} companies.`);

  // 3. Write to .local-full-snapshot.json
  const snapshotFile = path.join(rootDir, '.local-full-snapshot.json');
  const masterSnapshot = {
    documents: fullData.savedDocuments || [],
    accounts: fullData.customCompanies || [],
    ledgerRecords: fullData.accountLedgers || {},
    companySettings: fullData.companySettings || null,
    routePresets: fullData.routePresets || [],
    savedShippers: fullData.savedShippers || [],
    savedConsignees: fullData.savedConsignees || [],
    savedNotifyParties: fullData.savedNotifyParties || [],
    updated_at: new Date().toISOString(),
  };
  fs.writeFileSync(snapshotFile, JSON.stringify(masterSnapshot, null, 2), 'utf8');
  console.log(`Updated ${snapshotFile}`);

  // 4. Update .local-sync-codes.json with default codes
  const syncCodesFile = path.join(rootDir, '.local-sync-codes.json');
  const syncCodes = {
    'SKY-4440': masterSnapshot,
    '4440': masterSnapshot,
    'SKY4440': masterSnapshot,
    'SKY-2026': masterSnapshot,
    '2026': masterSnapshot,
    'SKY-MASTER': masterSnapshot,
    'MASTER': masterSnapshot,
  };
  fs.writeFileSync(syncCodesFile, JSON.stringify(syncCodes, null, 2), 'utf8');
  console.log(`Updated ${syncCodesFile}`);

  // 5. Broadcast to global relays
  const relays = [
    'sky-relay-v3-master',
    'sky-relay-v3-4440',
    'sky-relay-v3-2026',
    'sky-relay-v3-master-backup',
  ];

  for (const rk of relays) {
    try {
      const url = `https://cl1p.net/${encodeURIComponent(rk)}`;
      const bodyStr = new URLSearchParams({ content: JSON.stringify(masterSnapshot) }).toString();
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'SkyArianaLogistics/3.2',
        },
        body: bodyStr,
      });
      console.log(`Broadcast to global relay [${rk}]:`, res.status === 200 ? 'SUCCESS' : `Status ${res.status}`);
    } catch (e) {
      console.warn(`Failed relay [${rk}]:`, e.message);
    }
  }

  console.log('ALL LOCAL, CLOUD, SNAPSHOT, AND RELAY STORAGE SUCCESSFULLY UPDATED!');
}

run().catch(console.error);
