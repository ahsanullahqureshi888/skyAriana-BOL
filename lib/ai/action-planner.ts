/**
 * Sky Ariana AI Operations Assistant - Action Planner
 * Two-phase write actions with mandatory explicit user confirmation.
 * Never silently executes destructive or modifying operations.
 */

import { AIActionProposal, AIUserSessionContext } from '@/lib/types/ai-assistant'
import { checkActionPermission } from './permission-filter'
import { logAuditEvent } from '@/lib/rbac/audit-service'
import { mutateJsonFile } from '@/lib/services/blob-db'
import { getDataPath } from '@/lib/server-paths'

export interface CreateProposalParams {
  actionType: 'UPDATE_TRACKING' | 'CREATE_TASK' | 'PREPARE_DOCUMENT' | 'PREPARE_PAYMENT' | 'NAVIGATE'
  entityType: 'shipment' | 'container' | 'task' | 'document' | 'payment'
  entityId: string
  entityRef: string
  title: string
  description: string
  currentValues: Record<string, any>
  proposedValues: Record<string, any>
}

/**
 * Creates a structured action proposal awaiting user confirmation.
 */
export function createActionProposal(
  params: CreateProposalParams,
  user: AIUserSessionContext
): { proposal?: AIActionProposal; error?: string } {
  // 1. Permission check
  const perm = checkActionPermission(user, params.actionType)
  if (!perm.allowed) {
    return { error: perm.reason || 'Permission denied for this action.' }
  }

  const proposalId = `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  const proposal: AIActionProposal = {
    id: proposalId,
    actionType: params.actionType,
    title: params.title,
    description: params.description,
    entityType: params.entityType,
    entityId: params.entityId,
    entityRef: params.entityRef,
    currentValues: params.currentValues,
    proposedValues: params.proposedValues,
    requiresConfirmation: true,
    confirmed: false,
  }

  return { proposal }
}

/**
 * Executes a confirmed action proposal through the authoritative business service.
 */
export async function executeConfirmedAction(
  proposal: AIActionProposal,
  user: AIUserSessionContext
): Promise<{ success: boolean; message: string }> {
  // Re-verify permission at execution time
  const perm = checkActionPermission(user, proposal.actionType)
  if (!perm.allowed) {
    return { success: false, message: perm.reason || 'Permission denied.' }
  }

  const now = new Date().toISOString()

  // 1. UPDATE TRACKING
  if (proposal.actionType === 'UPDATE_TRACKING') {
    const shipmentFile = getDataPath('.local-shipments.json')
    let updated = false

    await mutateJsonFile<any[]>(shipmentFile, [], (shipments) => {
      const idx = shipments.findIndex(
        (s) =>
          (s.bolNumber && s.bolNumber.toUpperCase() === proposal.entityRef.toUpperCase()) ||
          (s.id && s.id === proposal.entityId)
      )
      if (idx >= 0) {
        const cur = shipments[idx]
        const nextStatus = proposal.proposedValues.status || cur.status
        const nextLoc = proposal.proposedValues.currentLocation || cur.currentLocation

        const newMilestone = {
          id: `ms-${Date.now()}`,
          status: nextStatus,
          location: nextLoc,
          timestamp: now,
          description: proposal.proposedValues.note || `Status updated to ${nextStatus} via Sky AI`,
          updatedBy: user.name || user.username,
        }

        shipments[idx] = {
          ...cur,
          status: nextStatus,
          currentLocation: nextLoc,
          updatedAt: now,
          milestones: [...(cur.milestones || []), newMilestone],
        }
        updated = true
      }
      return shipments
    })

    if (updated) {
      logAuditEvent({
        userId: user.userId || 'system',
        userName: user.name || user.username,
        action: 'SHIPMENT_UPDATED',
        entityType: 'shipment',
        entityId: proposal.entityRef,
        description: `Tracking updated via AI Assistant: ${proposal.description}`,
        newValues: { ...proposal.proposedValues, source: 'AI_ASSISTED' },
      })
      return { success: true, message: `Tracking for ${proposal.entityRef} has been updated successfully.` }
    } else {
      return { success: false, message: `Shipment record ${proposal.entityRef} was not found.` }
    }
  }

  // 2. CREATE TASK
  if (proposal.actionType === 'CREATE_TASK') {
    const tasksFile = getDataPath('.local-daily-tasks.json')
    await mutateJsonFile<any[]>(tasksFile, [], (tasks) => {
      const newTask = {
        id: `TSK-${new Date().getFullYear()}-${String(tasks.length + 1).padStart(4, '0')}`,
        title: proposal.proposedValues.title || proposal.title,
        description: proposal.proposedValues.description || proposal.description,
        task_type: proposal.proposedValues.taskType || 'MANUAL',
        assigned_department: proposal.proposedValues.department || 'Operations',
        priority: proposal.proposedValues.priority || 'NORMAL',
        status: 'OPEN',
        source: 'AI_ASSISTED',
        bol_number: proposal.entityRef,
        due_date: proposal.proposedValues.dueDate || now.split('T')[0],
        created_at: now,
        updated_at: now,
        activity_history: [
          {
            id: `act-${Date.now()}`,
            timestamp: now,
            user: user.name || user.username,
            action: 'CREATED',
            details: `Task created via AI Assistant`,
          },
        ],
      }
      return [newTask, ...tasks]
    })

    logAuditEvent({
      userId: user.userId || 'system',
      userName: user.name || user.username,
      action: 'TASK_CREATED' as any,
      entityType: 'task',
      entityId: proposal.entityRef,
      description: `Task created via AI Assistant: ${proposal.title}`,
      newValues: { source: 'AI_ASSISTED' },
    })

    return { success: true, message: `Task "${proposal.title}" has been created and assigned.` }
  }

  return { success: false, message: `Action type ${proposal.actionType} is not directly executable.` }
}
