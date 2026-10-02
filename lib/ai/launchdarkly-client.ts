/**
 * LaunchDarkly AgentControl Integration
 * Singleton Client, Observability, and Config Evaluator
 */

import { init, type LDClient, type LDContext } from '@launchdarkly/node-server-sdk'
import { Observability } from '@launchdarkly/observability-node'
import {
  initAi,
  type LDAIClient,
  type LDAIAgentConfig,
  type LDAIConfigTracker,
} from '@launchdarkly/server-sdk-ai'

let ldClient: LDClient | null = null
let aiClient: LDAIClient | null = null
let initPromise: Promise<LDAIClient | null> | null = null

/**
 * Returns the singleton LaunchDarkly AI client instance.
 * Initializes the client if it has not yet been initialized.
 */
export async function getLaunchDarklyAiClient(): Promise<LDAIClient | null> {
  if (aiClient) return aiClient
  if (initPromise) return initPromise

  const sdkKey = process.env.LAUNCHDARKLY_SDK_KEY || process.env.LD_SDK_KEY
  if (!sdkKey) {
    return null
  }

  initPromise = (async () => {
    try {
      const client = init(sdkKey, {
        plugins: [
          new Observability({
            serviceName: process.env.SERVICE_NAME || process.env.LD_SERVICE_NAME || 'aq-companies-bol',
            serviceVersion: process.env.SERVICE_VERSION || '5.1.0',
          }),
        ],
      })

      // Wait up to 5 seconds for initialization
      await client.waitForInitialization({ timeout: 5 })
      ldClient = client
      aiClient = initAi(ldClient)
      return aiClient
    } catch (err: any) {
      console.warn('[LAUNCHDARKLY INIT WARNING]', err?.message || err)
      return null
    }
  })()

  return initPromise
}

export interface ResolvedAgentControlConfig {
  enabled: boolean
  instructions?: string
  modelName: string
  parameters: Record<string, unknown>
  tracker?: LDAIConfigTracker
  isFallback: boolean
}

/**
 * Evaluates the LaunchDarkly AgentControl configuration for an AI run.
 * Safely falls back to local defaults if LaunchDarkly is unreachable or not configured.
 */
export async function evaluateAgentControlConfig(options?: {
  configKey?: string
  userId?: string
  defaultModel?: string
  defaultInstructions?: string
}): Promise<ResolvedAgentControlConfig> {
  const configKey =
    options?.configKey ||
    process.env.LAUNCHDARKLY_AI_CONFIG_KEY ||
    'qahsanullah91-writing-improver-agent'
  const defaultModel = options?.defaultModel || 'gemini-2.5-flash'
  const defaultInstructions =
    options?.defaultInstructions ||
    'You are SKY AI, the logistics operations assistant for Sky Ariana Limited. Explain the verified database facts concisely, respectfully, and clearly. Keep all BOL numbers, container numbers, and currency distinctions intact.'

  const fallback: ResolvedAgentControlConfig = {
    enabled: true,
    instructions: defaultInstructions,
    modelName: defaultModel,
    parameters: {},
    isFallback: true,
  }

  try {
    const client = await getLaunchDarklyAiClient()
    if (!client) {
      return fallback
    }

    const currentUserId = options?.userId || process.env.USER_ID || 'anonymous'
    const context: LDContext = { kind: 'user', key: currentUserId }

    const agentConfig: LDAIAgentConfig = await client.agentConfig(
      configKey,
      context,
      {
        enabled: true,
        model: { name: defaultModel },
        instructions: defaultInstructions,
      }
    )

    if (!agentConfig.enabled) {
      return {
        enabled: false,
        instructions: agentConfig.instructions || defaultInstructions,
        modelName: agentConfig.model?.name || defaultModel,
        parameters: agentConfig.model?.parameters || {},
        isFallback: false,
      }
    }

    const tracker = agentConfig.createTracker()

    return {
      enabled: true,
      instructions: agentConfig.instructions || defaultInstructions,
      modelName: agentConfig.model?.name || defaultModel,
      parameters: agentConfig.model?.parameters || {},
      tracker,
      isFallback: false,
    }
  } catch (err: any) {
    console.warn('[LAUNCHDARKLY EVALUATION WARNING - USING FALLBACK]', err?.message || err)
    return fallback
  }
}

/**
 * Gracefully flushes and closes LaunchDarkly connections on shutdown.
 */
export async function closeLaunchDarkly(): Promise<void> {
  if (ldClient) {
    try {
      await ldClient.flush()
      await ldClient.close()
    } catch (e: any) {
      console.warn('[LAUNCHDARKLY CLOSE WARNING]', e?.message || e)
    } finally {
      ldClient = null
      aiClient = null
      initPromise = null
    }
  }
}
