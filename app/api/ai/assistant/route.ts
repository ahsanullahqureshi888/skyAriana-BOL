import { NextRequest, NextResponse } from 'next/server'
import { processUserQuery } from '@/lib/ai/assistant-service'
import { executeConfirmedAction } from '@/lib/ai/action-planner'
import { getAIAssistantConfig, updateAIAssistantConfig, testAIConnection } from '@/lib/ai/ai-provider'
import { AIUserSessionContext } from '@/lib/types/ai-assistant'

export async function GET(request: NextRequest) {
  try {
    const config = await getAIAssistantConfig()
    // Do not return raw API key in cleartext to client
    const safeConfig = {
      ...config,
      apiKey: config.apiKey ? '••••••••••••••••' + config.apiKey.slice(-4) : '',
      hasKeyConfigured: Boolean(config.apiKey),
    }
    return NextResponse.json({ success: true, config: safeConfig })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action = 'ask' } = body

    // 1. Process User Query
    if (action === 'ask') {
      const { prompt, userContext } = body
      if (!prompt || typeof prompt !== 'string') {
        return NextResponse.json({ success: false, error: 'Prompt is required.' }, { status: 400 })
      }

      const sessionUser: AIUserSessionContext = {
        userId: userContext?.id || userContext?.userId || 'usr-anonymous',
        username: userContext?.username || 'user',
        name: userContext?.name || userContext?.username || 'Staff User',
        role: userContext?.role || 'viewer',
        isClientUser: Boolean(userContext?.isClientUser || userContext?.role === 'client' || userContext?.role === 'shipper'),
        clientId: userContext?.clientId,
        clientName: userContext?.clientName,
        language: userContext?.language || 'EN',
      }

      const result = await processUserQuery(prompt, sessionUser)
      return NextResponse.json(result)
    }

    // 2. Confirm & Execute Action Proposal
    if (action === 'confirm-action') {
      const { proposal, userContext } = body
      if (!proposal || !proposal.actionType) {
        return NextResponse.json({ success: false, error: 'Valid action proposal required.' }, { status: 400 })
      }

      const sessionUser: AIUserSessionContext = {
        userId: userContext?.id || userContext?.userId || 'usr-anonymous',
        username: userContext?.username || 'user',
        name: userContext?.name || userContext?.username || 'Staff User',
        role: userContext?.role || 'operations',
        isClientUser: Boolean(userContext?.isClientUser),
        clientId: userContext?.clientId,
        clientName: userContext?.clientName,
      }

      const result = await executeConfirmedAction(proposal, sessionUser)
      return NextResponse.json(result)
    }

    // 3. Test AI Connection
    if (action === 'test-connection') {
      const testRes = await testAIConnection()
      return NextResponse.json(testRes)
    }

    // 4. Update Configuration
    if (action === 'update-config') {
      const { updates } = body
      if (!updates || typeof updates !== 'object') {
        return NextResponse.json({ success: false, error: 'Updates object required.' }, { status: 400 })
      }

      // If user submitted masked key '••••', don't overwrite existing
      if (updates.apiKey && updates.apiKey.startsWith('••••')) {
        delete updates.apiKey
      }

      const newConfig = await updateAIAssistantConfig(updates)
      const safeConfig = {
        ...newConfig,
        apiKey: newConfig.apiKey ? '••••••••••••••••' + newConfig.apiKey.slice(-4) : '',
        hasKeyConfigured: Boolean(newConfig.apiKey),
      }
      return NextResponse.json({ success: true, config: safeConfig })
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error: any) {
    console.error('[AI ASSISTANT API ERROR]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
