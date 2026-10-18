import { NextRequest, NextResponse } from 'next/server'
import {
  getWorkflowRules,
  updateWorkflowRule,
  getWorkflowTemplates,
} from '@/lib/workflows/task-service'
import { evaluateRuleDryRun } from '@/lib/workflows/workflow-engine'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rules = await getWorkflowRules()
    const templates = await getWorkflowTemplates()
    return NextResponse.json({ success: true, rules, templates })
  } catch (error: any) {
    console.error('[API Workflow Rules] GET error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, updates } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Rule ID is required' }, { status: 400 })
    }

    const updated = await updateWorkflowRule(id, updates || {})
    return NextResponse.json({ success: !!updated, rule: updated })
  } catch (error: any) {
    console.error('[API Workflow Rules] PATCH error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, rule, sampleEvent } = body

    if (action === 'test' && rule && sampleEvent) {
      const evaluation = evaluateRuleDryRun(rule, sampleEvent)
      return NextResponse.json({ success: true, evaluation })
    }

    return NextResponse.json({ success: false, error: 'Unsupported rule action' }, { status: 400 })
  } catch (error: any) {
    console.error('[API Workflow Rules] POST error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
