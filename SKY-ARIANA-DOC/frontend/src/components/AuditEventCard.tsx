import React from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Code2,
  Globe2,
  Hash,
  Info,
  Monitor,
  ShieldAlert,
  UserRound,
} from 'lucide-react'
import {
  formatAuditDateTime,
  formatAuditJson,
  formatAuditTime,
  formatAuditValue,
  type NormalizedAuditEvent,
} from '../utils/auditEvents'

interface AuditEventCardProps {
  event: NormalizedAuditEvent
  expanded: boolean
  onToggle: () => void
  canViewRaw?: boolean
}

const statusIcon = (event: NormalizedAuditEvent) => {
  if (event.status === 'failed' || event.severity === 'danger') return <ShieldAlert size={17} aria-hidden="true" />
  if (event.status === 'warning' || event.severity === 'warning') return <AlertTriangle size={17} aria-hidden="true" />
  if (event.status === 'success') return <CircleCheck size={17} aria-hidden="true" />
  return <Info size={17} aria-hidden="true" />
}

const valueEntries = (value: Record<string, unknown> | null) => Object.entries(value || {})

const AuditEventCard: React.FC<AuditEventCardProps> = ({ event, expanded, onToggle, canViewRaw = false }) => {
  const oldEntries = valueEntries(event.oldValues)
  const newEntries = valueEntries(event.newValues)
  const changedKeys = Array.from(new Set([...oldEntries.map(([key]) => key), ...newEntries.map(([key]) => key)]))

  return (
    <article className={`audit-event audit-event--${event.severity} ${expanded ? 'is-expanded' : ''}`}>
      <div className="audit-event__main">
        <div className="audit-event__status" title={event.status === 'failed' ? 'Failed activity' : 'Recorded activity'}>{statusIcon(event)}</div>
        <time className="audit-event__time" dateTime={event.createdAt}>{formatAuditTime(event.createdAt)}</time>
        <div className="audit-event__actor"><span className="audit-event__avatar">{event.actorInitials}</span><span><strong>{event.actorName}</strong><small>Actor</small></span></div>
        <div className="audit-event__summary"><div className="audit-event__title-row"><h3>{event.actionTitle}</h3><span className="audit-event__module">{event.moduleLabel}</span></div><p>{event.description}</p><div className="audit-event__context"><span><UserRound size={13} />{event.targetLabel}</span><span><Globe2 size={13} />{event.ipAddress}</span></div></div>
        <button type="button" className="audit-event__expand" onClick={onToggle} aria-expanded={expanded} aria-controls={`audit-details-${event.id}`}>
          {expanded ? 'Hide details' : 'Details'}{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && <div id={`audit-details-${event.id}`} className="audit-event__details">
        <div className="audit-event__details-heading"><div><span className="audit-eyebrow">Event details</span><h4>{event.actionTitle}</h4></div><span>{formatAuditDateTime(event.createdAt)}</span></div>
        <div className="audit-event__meta-grid">
          <div><span>Actor</span><strong>{event.actorName}</strong></div>
          <div><span>Target</span><strong>{event.targetLabel}</strong></div>
          <div><span>Module</span><strong>{event.moduleLabel}</strong></div>
          <div><span>IP address</span><strong>{event.ipAddress}</strong></div>
          <div><span>Device / browser</span><strong><Monitor size={13} />{event.userAgent}</strong></div>
          <div><span>Request ID</span><strong><Hash size={13} />{event.requestId}</strong></div>
        </div>

        {changedKeys.length > 0 && <div className="audit-event__changes"><div className="audit-event__details-heading"><div><span className="audit-eyebrow">Change set</span><h4>Before and after</h4></div></div><div className="audit-change-table"><div className="audit-change-table__head"><span>Setting</span><span>Previous</span><span>New</span></div>{changedKeys.map((key) => <div className="audit-change-table__row" key={key}><strong>{key.replace(/[._-]+/g, ' ')}</strong><span>{formatAuditValue(event.oldValues?.[key])}</span><span>{formatAuditValue(event.newValues?.[key])}</span></div>)}</div></div>}

        {canViewRaw && <details className="audit-event__raw"><summary><Code2 size={14} /> View redacted technical payload</summary><pre>{formatAuditJson(event.metadata)}</pre></details>}
      </div>}
    </article>
  )
}

export default AuditEventCard
