import { getDataPath } from "@/lib/server-paths"
import { readJsonFile, writeJsonFile } from "@/lib/services/blob-db"
import type {
  WhatsAppHistoryEntry,
  WhatsAppSettings,
  WhatsAppTemplate,
} from "./message-types"
import { BUILTIN_TEMPLATES } from "./template-engine"

import { DEFAULT_WHATSAPP_SETTINGS } from "./constants"
export { DEFAULT_WHATSAPP_SETTINGS }

const settingsFile = getDataPath(".local-whatsapp-settings.json")
const templatesFile = getDataPath(".local-whatsapp-templates.json")
const historyFile = getDataPath(".local-whatsapp-history.json")

/**
 * Read WhatsApp Settings (Server-side)
 */
export async function getWhatsAppSettings(): Promise<WhatsAppSettings> {
  try {
    const data = await readJsonFile<WhatsAppSettings>(settingsFile, DEFAULT_WHATSAPP_SETTINGS)
    return { ...DEFAULT_WHATSAPP_SETTINGS, ...data }
  } catch {
    return DEFAULT_WHATSAPP_SETTINGS
  }
}

/**
 * Save WhatsApp Settings (Server-side atomic write)
 */
export async function saveWhatsAppSettings(settings: Partial<WhatsAppSettings>): Promise<WhatsAppSettings> {
  const current = await getWhatsAppSettings()
  const updated = { ...current, ...settings }
  await writeJsonFile(settingsFile, updated)
  return updated
}

/**
 * Get all templates (built-in merged with custom)
 */
export async function getAllTemplates(): Promise<WhatsAppTemplate[]> {
  try {
    const custom = await readJsonFile<WhatsAppTemplate[]>(templatesFile, [])
    const combined = new Map<string, WhatsAppTemplate>()

    for (const bt of BUILTIN_TEMPLATES) {
      combined.set(bt.id, bt)
    }
    for (const ct of custom) {
      combined.set(ct.id, ct)
    }

    return Array.from(combined.values())
  } catch {
    return [...BUILTIN_TEMPLATES]
  }
}

/**
 * Save a custom template
 */
export async function saveCustomTemplate(template: WhatsAppTemplate): Promise<WhatsAppTemplate[]> {
  const all = await getAllTemplates()
  const customOnly = all.filter((t) => !t.isBuiltIn && t.id !== template.id)
  customOnly.unshift(template)
  await writeJsonFile(templatesFile, customOnly)
  return getAllTemplates()
}

/**
 * Delete a custom template
 */
export async function deleteCustomTemplate(id: string): Promise<WhatsAppTemplate[]> {
  const all = await getAllTemplates()
  const customOnly = all.filter((t) => !t.isBuiltIn && t.id !== id)
  await writeJsonFile(templatesFile, customOnly)
  return getAllTemplates()
}

/**
 * Get Message History (Server-side)
 */
export async function getWhatsAppHistory(limit = 100): Promise<WhatsAppHistoryEntry[]> {
  try {
    const history = await readJsonFile<WhatsAppHistoryEntry[]>(historyFile, [])
    return history.slice(0, limit)
  } catch {
    return []
  }
}

/**
 * Append entry to Message History
 */
export async function appendWhatsAppHistory(entry: Omit<WhatsAppHistoryEntry, "id" | "generatedAt">): Promise<WhatsAppHistoryEntry> {
  const history = await getWhatsAppHistory(300)
  const settings = await getWhatsAppSettings()

  const newEntry: WhatsAppHistoryEntry = {
    ...entry,
    id: `wah-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    generatedAt: new Date().toISOString(),
    // Strictly respect privacy setting: Requirement 50
    messageText: settings.storeMessageTextInHistory ? entry.messageText : undefined,
  }

  history.unshift(newEntry)
  await writeJsonFile(historyFile, history)
  return newEntry
}
