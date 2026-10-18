import fs from "fs"
import path from "path"
import { BolCompanyAccess } from "@/lib/types/client-portal"
import { randomUUID } from "crypto"

const DATA_DIR = path.join(process.cwd(), "data")
const CLIENT_ACCESS_FILE = path.join(DATA_DIR, ".local-bol-company-access.json")

export function getClientAccessRules(): BolCompanyAccess[] {
  if (!fs.existsSync(CLIENT_ACCESS_FILE)) return []
  try {
    const data = fs.readFileSync(CLIENT_ACCESS_FILE, "utf-8")
    return JSON.parse(data) as BolCompanyAccess[]
  } catch (err) {
    console.error("Failed to read client access rules", err)
    return []
  }
}

export function saveClientAccessRules(rules: BolCompanyAccess[]) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  const tmpFile = `${CLIENT_ACCESS_FILE}.tmp-${Date.now()}`
  fs.writeFileSync(tmpFile, JSON.stringify(rules, null, 2))
  fs.renameSync(tmpFile, CLIENT_ACCESS_FILE)
}

export function getAccessByBolId(bolId: string): BolCompanyAccess[] {
  return getClientAccessRules().filter(r => r.bol_id === bolId)
}

export function getAccessByCompanyId(companyId: string): BolCompanyAccess[] {
  return getClientAccessRules().filter(r => r.company_id === companyId)
}

export function checkBolAccess(bolId: string, companyId: string): BolCompanyAccess | undefined {
  return getClientAccessRules().find(r => r.bol_id === bolId && r.company_id === companyId)
}

export function grantBolAccess(data: Omit<BolCompanyAccess, "id" | "created_at" | "updated_at">): BolCompanyAccess {
  const rules = getClientAccessRules()
  
  // Update if exists
  const existingIndex = rules.findIndex(r => r.bol_id === data.bol_id && r.company_id === data.company_id)
  
  if (existingIndex !== -1) {
    rules[existingIndex] = {
      ...rules[existingIndex],
      ...data,
      updated_at: new Date().toISOString()
    }
    saveClientAccessRules(rules)
    return rules[existingIndex]
  }

  // Create new
  const newRule: BolCompanyAccess = {
    ...data,
    id: `access-${randomUUID()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  rules.push(newRule)
  saveClientAccessRules(rules)
  return newRule
}

export function revokeBolAccess(bolId: string, companyId: string) {
  const rules = getClientAccessRules()
  const filtered = rules.filter(r => !(r.bol_id === bolId && r.company_id === companyId))
  if (filtered.length !== rules.length) {
    saveClientAccessRules(filtered)
  }
}
