import { NextResponse } from "next/server"
import path from "path"
import { readJsonFile, writeJsonFile } from "@/lib/services/blob-db"

const ENTITIES_FILE = path.join(process.cwd(), ".local-cmr-entities.json")

const DEFAULT_PRESET_ENTITIES = [
  // Senders
  { id: "ent_s_1", type: "consignor", name: "SABOOR ADEL TRADING COMPANY", details: '"SABOOR ADEL TRADING COMPANY"\nAdd: Afghanistan-Balkh Province Mazar Business Center 5th floor Office No: 07\nTel: +93780780288\nTIN: 1010411161', usage_count: 10 },
  { id: "ent_s_2", type: "consignor", name: "NAJIB AMIN LTD", details: 'NAJIB AMIN LTD\nT.L 27-975 T.L SHORANDAM INDUSTRIAL AREA KANDAHAR AFGHANISTAN. TELL: +93700308086\nNOTIFY PARTY: PAYMENT HAS TO BE MADE TO YAAQOUB HAMDAN FOODSTUFF TRADING CO LLC SHOP NO:28 AL HAWAI BUILDING AL RAS STREET DEIRA DUBAI\nUAE TRN NO : 100340961000003', usage_count: 8 },
  { id: "ent_s_3", type: "consignor", name: "SKY ARIANA EXPORT CO.", details: 'SKY ARIANA EXPORT & TRADING CO.\nKabul & Kandahar, Afghanistan\nTel: +93 700 939 565\nTIN: 1004829102', usage_count: 5 },
  // Consignees
  { id: "ent_c_1", type: "consignee", name: "MUHEB RAHMAN GLOBALTRADING LTD", details: 'MUHEB RAHMAN GLOBALTRADING LTD\nAdd: REPUBLIC OF UZBEKISTAN SURXONDARYA REGION TERMEZ CITY JAYHUN MFYAJ HAKIMAT-TERMIZY STREE\nTIN: 312034734', usage_count: 10 },
  { id: "ent_c_2", type: "consignee", name: "JDM ENTERPRISES", details: "JDM ENTERPRISES\n132 / B, BEHIND GEETA VIHAR HOTEL, NEAR SPENCER'S GYM, SANTACRUZ (EAST) MUMBAI 400029 INDIA.\nFSSAI NO: 10018022007908\nGSTIN: 27BAAPA6587K1ZH\nIEC: BAAPA6587K\nPAN NO: BAAPA6587K", usage_count: 8 },
  { id: "ent_c_3", type: "consignee", name: "RCA EXIM PRIVATE LIMITED", details: 'RCA EXIM PRIVATE LIMITED\n1112 2ND AND 3RD FLOOR GANDHI GALI FATEHPURI DELHI 110006 INDIA\nGSTIN: 07AABCR1234F1Z5\nIEC: 0511012345', usage_count: 7 },
  { id: "ent_c_4", type: "consignee", name: "EURO-ASIA LOGISTICS GMBH", details: 'EURO-ASIA LOGISTICS GMBH\nHafenstrasse 45, Hamburg, Germany\nVAT: DE 298471902', usage_count: 4 },
  // Carriers
  { id: "ent_car_1", type: "carrier", name: "SKY ARIANA LIMITED", details: 'SKY ARIANA LIMITED\nImport & Export - International Transportation\nLicense: 2481-2198\nWebsite: www.skyariana.com\nEmails: info@skyariana.com, transport@skyariana.com\nPhones: +93 700 939 565, +93 711 435 529\nKandahar Office: 2nd Floor, 16 No. Office, Shahidano Chowk, Etimad Rahmi Market, Kandahar, Afghanistan\nKabul Office: Shahr-e-now, Haji Yaqoub Square', usage_count: 10 },
  { id: "ent_car_2", type: "carrier", name: "MANDUZAY TRANSPORTATION", details: '“MANDUZAY TRANSPORTATION COMPANY”\nInternational Freight & Transit Services\nKabul - Mazar - Hairatan', usage_count: 6 },
  // Commodities
  { id: "ent_g_1", type: "commodity", name: "AFGHAN BROOM (360 BUNDLES 16000 PCS)", details: '1.   360 BUNDLES 16000 PCS 10000 KG AFGHAN BROOM', usage_count: 10 },
  { id: "ent_g_2", type: "commodity", name: "BLACK RAISINS BEST (631 CTNS)", details: '1.   631 CTNS - BLACK-RAISNIS (BEST)', usage_count: 8 },
  { id: "ent_g_3", type: "commodity", name: "GREEN RAISINS KANDAHAR (521 CTNS)", details: '1.   521 CTNS - GREEN RAISINS (KANDAHAR CHOICE)', usage_count: 7 },
  { id: "ent_g_4", type: "commodity", name: "DRIED FIGS AAA (450 BAGS)", details: '1.   450 BAGS - DRIED FIGS AAA QUALITY', usage_count: 5 },
  // Customs
  { id: "ent_cus_1", type: "customs", name: "CUSTOM POST Termiz", details: 'CUSTOM POST "Termiz"\nCODE POST: 22005', usage_count: 10 },
  { id: "ent_cus_2", type: "customs", name: "TOSHKENT AVIA YUKLAR", details: 'COUSTOM POST : TOSHKENT AVIA YUKLAR\nVED CODE:00102', usage_count: 8 },
]

async function getEntities(): Promise<any[]> {
  try {
    const parsed = await readJsonFile<any[]>(ENTITIES_FILE, [])
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch (e) {}
  return DEFAULT_PRESET_ENTITIES
}

async function saveEntities(list: any[]): Promise<void> {
  try {
    await writeJsonFile(ENTITIES_FILE, list)
  } catch (e) {}
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")?.toLowerCase()
  const q = searchParams.get("q")?.toLowerCase()

  let list = await getEntities()

  if (type) {
    list = list.filter((item: any) => (item.type || "").toLowerCase() === type)
  }

  if (q) {
    list = list.filter((item: any) => {
      const h = ((item.name || "") + " " + (item.details || "")).toLowerCase()
      return h.includes(q)
    })
  }

  list.sort((a: any, b: any) => (b.usage_count || 0) - (a.usage_count || 0))
  return NextResponse.json(list)
}

export async function POST(request: Request) {
  try {
    const ent = await request.json()
    let list = await getEntities()
    const entId = ent.id || `ent_${Date.now()}`
    const existingIndex = list.findIndex((e: any) => e.type === ent.type && e.name === ent.name)

    if (existingIndex !== -1) {
      list[existingIndex].usage_count = (list[existingIndex].usage_count || 1) + 1
      list[existingIndex].details = ent.details || list[existingIndex].details
    } else {
      list.unshift({
        id: entId,
        type: ent.type,
        name: ent.name,
        details: ent.details,
        usage_count: 1,
        updated_at: new Date().toISOString(),
      })
    }

    await saveEntities(list)
    return NextResponse.json({ status: "saved", id: entId, name: ent.name })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to save entity" },
      { status: 500 }
    )
  }
}
