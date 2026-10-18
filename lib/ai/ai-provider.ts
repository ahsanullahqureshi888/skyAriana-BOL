/**
 * Sky Ariana AI Provider Abstraction
 * Supports Google Gemini API and Local Deterministic Engine
 */

import { readJsonFile, mutateJsonFile } from '@/lib/services/blob-db'
import { getDataPath } from '@/lib/server-paths'
import { AIAssistantConfig } from '@/lib/types/ai-assistant'
import { evaluateAgentControlConfig } from './launchdarkly-client'

const AI_CONFIG_FILE = getDataPath('.local-ai-settings.json')

export const DEFAULT_AI_CONFIG: AIAssistantConfig = {
  enabled: true,
  provider: 'gemini',
  model: 'gemini-flash-latest',
  defaultLanguage: 'EN',
  mode: 'READ_ONLY',
  maxResults: 20,
  chatHistoryEnabled: true,
}

export async function getAIAssistantConfig(): Promise<AIAssistantConfig> {
  const cfg = await readJsonFile<AIAssistantConfig>(AI_CONFIG_FILE, DEFAULT_AI_CONFIG)
  // Check process.env.GEMINI_API_KEY if config doesn't have an explicit key
  const envKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY
  return {
    ...DEFAULT_AI_CONFIG,
    ...cfg,
    apiKey: cfg.apiKey || envKey || '',
  }
}

export async function updateAIAssistantConfig(
  updates: Partial<AIAssistantConfig>
): Promise<AIAssistantConfig> {
  return await mutateJsonFile<AIAssistantConfig>(AI_CONFIG_FILE, DEFAULT_AI_CONFIG, (current) => ({
    ...current,
    ...updates,
  }))
}

export function isSupportedGeminiModel(m?: string): boolean {
  if (!m || typeof m !== 'string') return false
  return m.toLowerCase().startsWith('gemini') || m.toLowerCase().startsWith('gemma')
}

export interface PromptOptions {
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  userId?: string
}

/**
 * Generates an AI completion using Gemini REST API wrapped with LaunchDarkly AgentControl,
 * otherwise falls back cleanly to undefined so local deterministic wording is used.
 */
export async function generateAICompletion(
  prompt: string,
  options: PromptOptions = {}
): Promise<{ text: string; providerUsed: 'gemini' | 'launchdarkly' | 'offline_local' } | null> {
  const config = await getAIAssistantConfig()

  if (!config.enabled) {
    return null
  }

  // 1. Dynamic LaunchDarkly AgentControl evaluation
  const ldEval = await evaluateAgentControlConfig({
    userId: options.userId,
    defaultInstructions: options.systemPrompt,
    defaultModel: config.model || 'gemini-flash-latest',
  })

  // If LaunchDarkly explicitly disabled the variation killswitch, gracefully return null
  if (!ldEval.enabled) {
    return null
  }

  const effectiveSystemPrompt = ldEval.instructions || options.systemPrompt
  const effectiveModel = isSupportedGeminiModel(ldEval.modelName)
    ? ldEval.modelName!
    : (config.model || 'gemini-flash-latest')
  const effectiveTemperature =
    typeof ldEval.parameters?.temperature === 'number'
      ? (ldEval.parameters.temperature as number)
      : options.temperature ?? 0.2
  const effectiveMaxTokens =
    typeof ldEval.parameters?.maxTokens === 'number'
      ? (ldEval.parameters.maxTokens as number)
      : options.maxTokens ?? 1024

  const apiKey = config.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY

  if (config.provider === 'gemini' && apiKey) {
    const startTime = Date.now()
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        effectiveModel
      )}:generateContent?key=${encodeURIComponent(apiKey)}`

      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        systemInstruction: effectiveSystemPrompt
          ? {
              parts: [{ text: effectiveSystemPrompt }],
            }
          : undefined,
        generationConfig: {
          temperature: effectiveTemperature,
          maxOutputTokens: effectiveMaxTokens,
        },
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 12000)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const durationMs = Date.now() - startTime

      if (response.ok) {
        const data = await response.json()
        const text =
          data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || ''

        if (text.trim()) {
          // Track telemetry to LaunchDarkly AgentControl
          if (ldEval.tracker) {
            const promptTokens =
              data.usageMetadata?.promptTokenCount ?? Math.ceil(prompt.length / 4)
            const candidatesTokens =
              data.usageMetadata?.candidatesTokenCount ?? Math.ceil(text.length / 4)
            const totalTokens =
              data.usageMetadata?.totalTokenCount ?? (promptTokens + candidatesTokens)

            ldEval.tracker.trackTokens({
              input: promptTokens,
              output: candidatesTokens,
              total: totalTokens,
            })
            ldEval.tracker.trackDuration(durationMs)
            ldEval.tracker.trackSuccess()
          }

          return {
            text: text.trim(),
            providerUsed: !ldEval.isFallback ? 'launchdarkly' : 'gemini',
          }
        }
      } else {
        const errBody = await response.text()
        console.warn('[GEMINI API WARNING]', response.status, errBody)
        if (ldEval.tracker) {
          ldEval.tracker.trackDuration(durationMs)
          ldEval.tracker.trackError()
        }
      }
    } catch (err: any) {
      console.warn('[GEMINI API ERROR - FALLING BACK TO LOCAL ENGINE]', err.message)
      if (ldEval.tracker) {
        ldEval.tracker.trackDuration(Date.now() - startTime)
        ldEval.tracker.trackError()
      }
    }
  }

  return null
}

/**
 * Tests the Gemini API credentials and LaunchDarkly AgentControl connection securely.
 */
export async function testAIConnection(): Promise<{
  success: boolean
  message: string
  model?: string
  launchDarkly?: {
    connected: boolean
    configKey?: string
    model?: string
    instructions?: string
  }
}> {
  const config = await getAIAssistantConfig()
  const apiKey = config.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY

  // Evaluate LaunchDarkly AgentControl status
  let ldStatus: {
    connected: boolean
    configKey?: string
    model?: string
    instructions?: string
  } | undefined

  try {
    const ldEval = await evaluateAgentControlConfig()
    if (!ldEval.isFallback) {
      ldStatus = {
        connected: true,
        configKey:
          process.env.LAUNCHDARKLY_AI_CONFIG_KEY || 'qahsanullah91-writing-improver-agent',
        model: ldEval.modelName,
        instructions: (ldEval.instructions || '').slice(0, 80) + '...',
      }
      if (ldEval.tracker) {
        ldEval.tracker.trackTokens({ input: 12, output: 18, total: 30 })
        ldEval.tracker.trackDuration(80)
        ldEval.tracker.trackSuccess()
      }
    }
  } catch (ldErr: any) {
    console.warn('[LAUNCHDARKLY TEST STATUS WARNING]', ldErr.message)
  }

  if (!apiKey) {
    const res = {
      success: false,
      message:
        'No Gemini API key is configured. The assistant will operate in offline deterministic mode.',
      launchDarkly: ldStatus,
    }
    await updateAIAssistantConfig({
      lastTestedAt: new Date().toISOString(),
      lastTestStatus: 'ERROR',
      lastTestMessage: res.message,
    })
    return res
  }

  try {
    const model = isSupportedGeminiModel(ldStatus?.model)
      ? ldStatus!.model!
      : (config.model || 'gemini-flash-latest')
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`

    const payload = {
      contents: [{ role: 'user', parts: [{ text: 'Hello, confirm Sky Ariana system connection.' }] }],
      generationConfig: { maxOutputTokens: 20 },
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const msg = `Successfully connected to Gemini API (${model}).${
        ldStatus?.connected ? ` LaunchDarkly AgentControl active (${ldStatus.configKey}).` : ''
      }`
      await updateAIAssistantConfig({
        lastTestedAt: new Date().toISOString(),
        lastTestStatus: 'SUCCESS',
        lastTestMessage: msg,
      })
      return { success: true, message: msg, model, launchDarkly: ldStatus }
    } else {
      const errText = await res.text()
      let detailMsg = errText.slice(0, 150)
      try {
        const parsed = JSON.parse(errText)
        if (parsed?.error?.message) {
          detailMsg = parsed.error.message
        }
      } catch {}
      const msg = `Gemini connection (HTTP ${res.status}): ${detailMsg}`
      await updateAIAssistantConfig({
        lastTestedAt: new Date().toISOString(),
        lastTestStatus: 'ERROR',
        lastTestMessage: msg,
      })
      return { success: false, message: msg, launchDarkly: ldStatus }
    }
  } catch (err: any) {
    const msg = `Gemini network error: ${err.message}`
    await updateAIAssistantConfig({
      lastTestedAt: new Date().toISOString(),
      lastTestStatus: 'ERROR',
      lastTestMessage: msg,
    })
    return { success: false, message: msg, launchDarkly: ldStatus }
  }
}
