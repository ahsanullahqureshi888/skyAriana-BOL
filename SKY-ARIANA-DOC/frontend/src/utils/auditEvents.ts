export type AuditSeverity = 'success' | 'info' | 'warning' | 'danger'

export interface NormalizedAuditEvent {
  id: string | number
  createdAt: string
  actorId?: string | number | null
  actorName: string
  actorInitials: string
  actionKey: string
  actionTitle: string
  description: string
  moduleKey: string
  moduleLabel: string
  targetLabel: string
  targetId?: string | number | null
  ipAddress: string
  userAgent: string
  requestId: string
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  status: 'success' | 'failed' | 'warning' | 'info'
  severity: AuditSeverity
  metadata: Record<string, unknown>
}

export interface AuditFilterOption {
  value: string
  label: string
}

const ACTION_DEFINITIONS: Record<string, { title: string; description: string; module: string; severity: AuditSeverity; status: NormalizedAuditEvent['status'] }> = {
  'login.success': { title: 'Successful sign-in', description: 'A user signed in successfully.', module: 'authentication', severity: 'success', status: 'success' },
  'login.failed': { title: 'Failed sign-in', description: 'A sign-in attempt was rejected.', module: 'authentication', severity: 'warning', status: 'failed' },
  'login.locked': { title: 'Account locked', description: 'A sign-in attempt triggered account protection.', module: 'authentication', severity: 'danger', status: 'failed' },
  'user.created': { title: 'User created', description: 'A new user account was created.', module: 'users', severity: 'success', status: 'success' },
  'user.updated': { title: 'User profile updated', description: 'A user profile was updated.', module: 'users', severity: 'info', status: 'success' },
  'user.suspended': { title: 'User suspended', description: 'A user account was suspended.', module: 'users', severity: 'warning', status: 'warning' },
  'user.activated': { title: 'User activated', description: 'A user account was activated.', module: 'users', severity: 'success', status: 'success' },
  'user.deleted': { title: 'User removed', description: 'A user account was soft-deleted.', module: 'users', severity: 'danger', status: 'warning' },
  'user.role_changed': { title: 'Role changed', description: 'A user role or access profile changed.', module: 'users', severity: 'warning', status: 'warning' },
  'user.password_reset': { title: 'Password reset', description: 'A temporary password was generated for a user.', module: 'users', severity: 'warning', status: 'success' },
  'security.policy_updated': { title: 'Security policy updated', description: 'Workspace security settings were updated.', module: 'security', severity: 'warning', status: 'success' },
  'security.settings_changed': { title: 'Security policy updated', description: 'Workspace security settings were updated.', module: 'security', severity: 'warning', status: 'success' },
  'invoice.created': { title: 'Invoice created', description: 'A commercial invoice was created.', module: 'invoices', severity: 'success', status: 'success' },
  'invoice.updated': { title: 'Invoice updated', description: 'A commercial invoice was updated.', module: 'invoices', severity: 'info', status: 'success' },
  'invoice.deleted': { title: 'Invoice removed', description: 'A commercial invoice was removed.', module: 'invoices', severity: 'danger', status: 'warning' },
  'payment.recorded': { title: 'Payment recorded', description: 'A payment was recorded against an invoice.', module: 'payments', severity: 'success', status: 'success' },
  'backup.created': { title: 'Backup created', description: 'A data backup was created.', module: 'backup', severity: 'success', status: 'success' },
  'backup.restored': { title: 'Backup restored', description: 'A data backup was restored.', module: 'backup', severity: 'warning', status: 'warning' },
}

const SENSITIVE_KEY = /(password|passphrase|token|secret|hash|credential|authorization|cookie|private[_ -]?key|access[_ -]?key|session[_ -]?id)/i

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const humanize = (value: string) => value
  .replace(/[._-]+/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase())
  .trim()

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'SY'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

const parseJsonValue = (value: string): unknown => {
  let current: unknown = value.trim()
  for (let attempt = 0; attempt < 3 && typeof current === 'string'; attempt += 1) {
    const candidate = current.trim()
    if (!candidate) return null
    try {
      current = JSON.parse(candidate) as unknown
    } catch {
      const objectStart = candidate.search(/[{[]/)
      if (objectStart > 0) {
        try {
          current = JSON.parse(candidate.slice(objectStart)) as unknown
        } catch {
          return value
        }
      } else {
        return value
      }
    }
  }
  return current
}

export const safeParseMetadata = (value: unknown): { metadata: Record<string, unknown>; plainText?: string } => {
  if (isRecord(value)) return { metadata: value }
  if (typeof value !== 'string') return { metadata: {} }
  const trimmed = value.trim()
  if (!trimmed) return { metadata: {} }
  const parsed = parseJsonValue(trimmed)
  if (isRecord(parsed)) return { metadata: parsed }
  return { metadata: {}, plainText: typeof parsed === 'string' ? parsed : trimmed }
}

export const redactSensitive = (value: unknown, key?: string): unknown => {
  if (key && SENSITIVE_KEY.test(key)) return '[REDACTED]'
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item))
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redactSensitive(entryValue, entryKey)]))
  }
  return value
}

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value) return null
  if (isRecord(value)) return redactSensitive(value) as Record<string, unknown>
  const parsed = safeParseMetadata(value).metadata
  return Object.keys(parsed).length ? redactSensitive(parsed) as Record<string, unknown> : null
}

const stringValue = (value: unknown, fallback = '') => typeof value === 'string' && value.trim() ? value.trim() : value == null ? fallback : String(value)

const resolveActionKey = (event: Record<string, unknown>, metadata: Record<string, unknown>, plainText?: string) => {
  const rawAction = stringValue(event.action || metadata.action || metadata.event, 'system.event').toLowerCase().replace(/\s+/g, '_')
  if (rawAction === 'login' || rawAction === 'auth.login' || rawAction === 'user.login') {
    const result = stringValue(event.result || metadata.result, '').toLowerCase()
    const description = `${stringValue(event.description)} ${stringValue(metadata.description)} ${plainText || ''}`.toLowerCase()
    if (result.includes('lock') || description.includes('lock')) return 'login.locked'
    if (result.includes('fail') || result.includes('reject') || description.includes('fail') || description.includes('invalid')) return 'login.failed'
    return 'login.success'
  }
  const aliases: Record<string, string> = {
    'login_success': 'login.success', 'login_failed': 'login.failed', 'login_failure': 'login.failed', 'account_locked': 'login.locked',
    'users.created': 'user.created', 'users.updated': 'user.updated', 'users.suspended': 'user.suspended', 'users.activated': 'user.activated',
    'users.deleted': 'user.deleted', 'users.role_changed': 'user.role_changed', 'users.password_reset': 'user.password_reset',
    'security.policy_updated': 'security.policy_updated', 'security.settings_changed': 'security.settings_changed',
    'invoice.created': 'invoice.created', 'invoice.updated': 'invoice.updated', 'invoice.deleted': 'invoice.deleted',
    'payment.recorded': 'payment.recorded', 'backup.created': 'backup.created', 'backup.restored': 'backup.restored',
  }
  return aliases[rawAction] || rawAction
}

const resolveDefinition = (actionKey: string, event: Record<string, unknown>, metadata: Record<string, unknown>, plainText?: string) => {
  const definition = ACTION_DEFINITIONS[actionKey]
  if (definition) return definition
  const actionTitle = humanize(actionKey || 'system event')
  const description = stringValue(event.description || metadata.description, plainText || `${actionTitle} was recorded.`)
  const module = stringValue(event.module || metadata.module || event.entity_type, 'system').toLowerCase()
  const isFailed = /fail|denied|reject|lock/i.test(`${actionKey} ${description}`)
  return {
    title: actionTitle,
    description,
    module,
    severity: isFailed ? 'warning' as const : 'info' as const,
    status: isFailed ? 'failed' as const : 'info' as const,
  }
}

const resolveTarget = (event: Record<string, unknown>, metadata: Record<string, unknown>, module: string) => {
  const explicit = metadata.target_name || metadata.target_label || metadata.target || event.target_name || event.target_label
  if (explicit && typeof explicit !== 'object') return stringValue(explicit)
  const targetId = metadata.target_user_id || metadata.target_id || event.target_user_id || event.entity_id || event.target_id
  if (targetId != null && targetId !== '') return `${humanize(module)} #${targetId}`
  return 'Workspace'
}

export const normalizeAuditEvent = (event: unknown): NormalizedAuditEvent => {
  const source = isRecord(event) ? event : {}
  const detailResult = safeParseMetadata(source.details ?? source.metadata ?? source.description)
  const metadata = { ...detailResult.metadata }
  const plainText = detailResult.plainText
  const actionKey = resolveActionKey(source, metadata, plainText)
  const definition = resolveDefinition(actionKey, source, metadata, plainText)
  const actorName = stringValue(source.actor_name || source.actor || source.user_name || (isRecord(source.user) ? source.user.name : undefined) || metadata.actor_name || metadata.actor, 'System')
  const moduleKey = stringValue(source.module || metadata.module || source.entity_type, definition.module || 'system').toLowerCase()
  const targetId = metadata.target_user_id || metadata.target_id || source.target_user_id || source.entity_id || source.target_id
  const description = stringValue(source.description || metadata.description, definition.description)
  const oldValues = asRecord(source.old_values ?? metadata.old_values)
  const newValues = asRecord(source.new_values ?? metadata.new_values)
  const status = stringValue(source.status || metadata.status, definition.status) as NormalizedAuditEvent['status']
  const severity = status === 'failed' ? 'warning' : definition.severity

  return {
    id: (source.id as string | number | undefined) ?? `${source.created_at || Date.now()}-${actionKey}`,
    createdAt: stringValue(source.created_at || source.timestamp || source.createdAt, new Date().toISOString()),
    actorId: (source.actor_id || source.actor_user_id || source.user_id || metadata.actor_id) as string | number | null | undefined,
    actorName,
    actorInitials: initials(actorName),
    actionKey,
    actionTitle: definition.title,
    description,
    moduleKey,
    moduleLabel: humanize(moduleKey),
    targetLabel: resolveTarget(source, metadata, moduleKey),
    targetId: targetId as string | number | null | undefined,
    ipAddress: stringValue(source.ip_address || source.ipAddress || metadata.ip_address, 'Not available'),
    userAgent: stringValue(source.user_agent || source.userAgent || metadata.user_agent, 'Not available'),
    requestId: stringValue(source.request_id || source.requestId || metadata.request_id, 'Not available'),
    oldValues,
    newValues,
    status: ['success', 'failed', 'warning', 'info'].includes(status) ? status : definition.status,
    severity,
    metadata: redactSensitive({ ...metadata, source_action: source.action }) as Record<string, unknown>,
  }
}

export const formatAuditTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export const formatAuditDateTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export const auditDateGroup = (value: string, reference = new Date()) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Undated activity'
  const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate()).getTime()
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const days = Math.round((start - dateStart) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return date.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

export const formatAuditValue = (value: unknown) => {
  if (value == null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled'
  if (typeof value === 'object') return JSON.stringify(redactSensitive(value))
  return String(value)
}

export const formatAuditJson = (value: unknown) => JSON.stringify(redactSensitive(value), null, 2) || '{}'

export const getActionOptions = (events: NormalizedAuditEvent[]): AuditFilterOption[] => Array.from(new Map(events.map((event) => [event.actionKey, { value: event.actionKey, label: event.actionTitle }])).values()).sort((a, b) => a.label.localeCompare(b.label))

export const getModuleOptions = (events: NormalizedAuditEvent[]): AuditFilterOption[] => Array.from(new Map(events.map((event) => [event.moduleKey, { value: event.moduleKey, label: event.moduleLabel }])).values()).sort((a, b) => a.label.localeCompare(b.label))

export const getActorOptions = (events: NormalizedAuditEvent[]): AuditFilterOption[] => Array.from(new Map(events.map((event) => [event.actorName, { value: event.actorName, label: event.actorName }])).values()).sort((a, b) => a.label.localeCompare(b.label))

export const filterAuditEvents = (events: NormalizedAuditEvent[], filters: { search: string; actor: string; module: string; action: string; severity: string; ip: string; from: string; to: string; status: string }) => {
  const search = filters.search.trim().toLowerCase()
  const from = filters.from ? new Date(`${filters.from}T00:00:00`).getTime() : null
  const to = filters.to ? new Date(`${filters.to}T23:59:59`).getTime() : null
  return events.filter((event) => {
    const timestamp = new Date(event.createdAt).getTime()
    const searchable = [event.actorName, event.actionTitle, event.description, event.moduleLabel, event.targetLabel, event.ipAddress, event.actionKey].join(' ').toLowerCase()
    return (!search || searchable.includes(search))
      && (!filters.actor || event.actorName === filters.actor)
      && (!filters.module || event.moduleKey === filters.module)
      && (!filters.action || event.actionKey === filters.action)
      && (!filters.severity || event.severity === filters.severity)
      && (!filters.status || event.status === filters.status)
      && (!filters.ip || event.ipAddress.toLowerCase().includes(filters.ip.trim().toLowerCase()))
      && (from == null || timestamp >= from)
      && (to == null || timestamp <= to)
  })
}
