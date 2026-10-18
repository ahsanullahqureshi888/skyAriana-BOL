import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  BellRing,
  Check,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  Network,
  RotateCcw,
  Save,
  ShieldCheck,
  Smartphone,
  UserRound,
  X,
} from 'lucide-react'
import { userManagementApi } from '../services/api'
import type { SecuritySettings } from '../types'

type SecurityDraft = Omit<SecuritySettings, 'id' | 'updated_at'>
type SecurityKey = keyof SecurityDraft
type ChangeStrength = 'strengthened' | 'unchanged' | 'weakened'

const DEFAULT_SECURITY_FORM: SecurityDraft = {
  minimum_password_length: 10,
  require_uppercase: true,
  require_lowercase: true,
  require_number: true,
  require_special: true,
  password_expiration_days: 0,
  password_history_count: 5,
  failed_login_limit: 5,
  lock_duration_minutes: 15,
  session_timeout_minutes: 480,
  require_password_change_on_first_login: true,
  require_two_factor: false,
  two_factor_roles: [],
  allow_multiple_sessions: true,
  invitation_expiration_hours: 72,
  password_reset_expiration_minutes: 30,
  login_notification: true,
  new_device_notification: true,
}

const NUMERIC_RULES: Record<string, { min: number; max: number; label: string }> = {
  minimum_password_length: { min: 8, max: 128, label: 'Minimum password length' },
  password_expiration_days: { min: 0, max: 3650, label: 'Password expiration' },
  password_history_count: { min: 0, max: 20, label: 'Password history' },
  failed_login_limit: { min: 3, max: 20, label: 'Failed login limit' },
  lock_duration_minutes: { min: 1, max: 1440, label: 'Lock duration' },
  session_timeout_minutes: { min: 15, max: 43200, label: 'Session timeout' },
  invitation_expiration_hours: { min: 1, max: 720, label: 'Invitation expiry' },
  password_reset_expiration_minutes: { min: 5, max: 1440, label: 'Password reset lifetime' },
}

const FIELD_LABELS: Partial<Record<SecurityKey, string>> = {
  minimum_password_length: 'Minimum password length',
  require_uppercase: 'Require uppercase letters',
  require_lowercase: 'Require lowercase letters',
  require_number: 'Require numbers',
  require_special: 'Require special characters',
  password_expiration_days: 'Password expiration',
  password_history_count: 'Password history',
  failed_login_limit: 'Failed login limit',
  lock_duration_minutes: 'Lock duration',
  session_timeout_minutes: 'Session timeout',
  require_password_change_on_first_login: 'Password change on first login',
  require_two_factor: 'Two-factor authentication',
  allow_multiple_sessions: 'Multiple sessions',
  invitation_expiration_hours: 'Invitation expiry',
  password_reset_expiration_minutes: 'Password reset lifetime',
  login_notification: 'Successful login notification',
  new_device_notification: 'New-device notification',
}

const getErrorMessage = (error: any) => {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (detail?.message) return detail.message
  return error?.message || 'Something went wrong. Please try again.'
}

const toBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.toLowerCase() === 'true' ? true : value.toLowerCase() === 'false' ? false : fallback
  return value == null ? fallback : Boolean(value)
}

const normalizeSecuritySettings = (value?: Partial<SecuritySettings> | null): SecurityDraft => {
  const incoming = value || {}
  const draft = { ...DEFAULT_SECURITY_FORM }
  ;(Object.keys(DEFAULT_SECURITY_FORM) as SecurityKey[]).forEach((key) => {
    const incomingValue = incoming[key]
    if (key === 'two_factor_roles') {
      draft[key] = Array.isArray(incomingValue) ? incomingValue.filter((role): role is string => typeof role === 'string') : [...DEFAULT_SECURITY_FORM.two_factor_roles]
    } else if (typeof DEFAULT_SECURITY_FORM[key] === 'boolean') {
      draft[key] = toBoolean(incomingValue, DEFAULT_SECURITY_FORM[key] as boolean) as never
    } else if (typeof DEFAULT_SECURITY_FORM[key] === 'number') {
      const numericValue = Number(incomingValue)
      ;(draft as Record<string, unknown>)[key] = Number.isFinite(numericValue) ? Math.trunc(numericValue) : DEFAULT_SECURITY_FORM[key]
    }
  })
  return draft
}

const sameDraft = (left: SecurityDraft, right: SecurityDraft) => JSON.stringify(left) === JSON.stringify(right)

const displaySettingValue = (key: SecurityKey, value: unknown) => {
  if (typeof value === 'boolean') return value ? 'On' : 'Off'
  if (key === 'invitation_expiration_hours') return `${value} hours`
  if (key === 'password_expiration_days') return value === 0 ? 'Never' : `${value} days`
  if (key.endsWith('_minutes')) return `${value} minutes`
  if (key === 'two_factor_roles') return Array.isArray(value) && value.length ? value.join(', ') : 'All roles'
  return String(value ?? '—')
}

const classifyChange = (key: SecurityKey, previous: unknown, next: unknown): ChangeStrength => {
  if (JSON.stringify(previous) === JSON.stringify(next)) return 'unchanged'
  if (typeof previous === 'boolean' && typeof next === 'boolean') {
    const requiredSetting = ['require_uppercase', 'require_lowercase', 'require_number', 'require_special', 'require_two_factor', 'require_password_change_on_first_login', 'login_notification', 'new_device_notification'].includes(key)
    if (requiredSetting) return next ? 'strengthened' : 'weakened'
    if (key === 'allow_multiple_sessions') return next ? 'weakened' : 'strengthened'
  }
  if (typeof previous === 'number' && typeof next === 'number') {
    const lowerIsStronger = ['failed_login_limit', 'session_timeout_minutes', 'invitation_expiration_hours', 'password_reset_expiration_minutes', 'password_expiration_days'].includes(key)
    const higherIsStronger = ['minimum_password_length', 'password_history_count'].includes(key)
    if (lowerIsStronger) return next < previous ? 'strengthened' : 'weakened'
    if (higherIsStronger) return next > previous ? 'strengthened' : 'weakened'
  }
  return 'unchanged'
}

interface ToggleProps {
  title: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export const SecuritySettingToggle: React.FC<ToggleProps> = ({ title, description, checked, onChange, disabled = false }) => (
  <label className={`security-setting-toggle ${disabled ? 'is-disabled' : ''}`}>
    <span className="security-setting-toggle__copy"><strong>{title}</strong><small>{description}</small></span>
    <span className="security-setting-toggle__control"><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} aria-label={`${title}, ${checked ? 'enabled' : 'disabled'}`} /><span className="security-setting-toggle__visual" aria-hidden="true" /><span className="sr-only">{checked ? 'Enabled' : 'Disabled'}</span></span>
  </label>
)

const SecuritySection: React.FC<{ icon: React.ElementType; eyebrow: string; title: string; description: string; children: React.ReactNode; className?: string }> = ({ icon: Icon, eyebrow, title, description, children, className = '' }) => (
  <section className={`security-settings-card ${className}`}><div className="security-settings-card__heading"><div className="security-settings-card__icon"><Icon size={18} /></div><div><span className="um-eyebrow">{eyebrow}</span><h3>{title}</h3><p>{description}</p></div></div>{children}</section>
)

const ReviewDialog: React.FC<{ changes: Array<{ key: SecurityKey; previous: unknown; next: unknown; strength: ChangeStrength }>; _requiresConfirmation: boolean; confirmationChecked: boolean; onConfirmChange: (checked: boolean) => void; onClose: () => void; onSave: () => void; isSaving: boolean; error?: string }> = ({ changes, _requiresConfirmation, confirmationChecked, onConfirmChange, onClose, onSave, isSaving, error }) => {
  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) onClose()
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button, input, [href], select, textarea, [tabindex]:not([tabindex="-1"])')).filter((element) => !element.hasAttribute('disabled'))
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', handler)
    return () => { window.removeEventListener('keydown', handler); previousFocus?.focus() }
  }, [isSaving, onClose])

  const weakened = changes.filter((change) => change.strength === 'weakened')
  return <div className="um-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !isSaving && onClose()}><div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="security-review-title" className="um-modal um-modal--wide security-review-dialog"><div className="um-modal__header"><div><span className="um-eyebrow">Security review</span><h2 id="security-review-title">Review policy changes</h2></div><button type="button" className="um-icon-button" onClick={onClose} disabled={isSaving} aria-label="Close security review"><X size={18} /></button></div><div className="um-modal__body"><p className="security-review-dialog__lead">Review the draft before applying it. The backend will validate this policy again and record the old and new values in Activity History.</p><div className="security-review-summary"><span className="security-review-summary__count">{changes.length}</span><span>{changes.length === 1 ? 'setting will change' : 'settings will change'}</span><span className="security-review-summary__status">{weakened.length ? `${weakened.length} weakens protection` : 'No weakening detected'}</span></div><div className="security-change-table"><div className="security-change-table__head"><span>Setting</span><span>Previous</span><span>New</span><span>Assessment</span></div>{changes.map((change) => <div className="security-change-table__row" key={change.key}><strong>{FIELD_LABELS[change.key] || change.key}</strong><span>{displaySettingValue(change.key, change.previous)}</span><span>{displaySettingValue(change.key, change.next)}</span><span className={`security-change-pill security-change-pill--${change.strength}`}>{change.strength === 'strengthened' ? <Check size={13} /> : change.strength === 'weakened' ? <AlertCircle size={13} /> : null}{change.strength}</span></div>)}</div>{weakened.length > 0 && <label className="security-review-confirm"><input type="checkbox" checked={confirmationChecked} onChange={(event) => onConfirmChange(event.target.checked)} /><span><strong>This change reduces protection.</strong><small>I understand the risk and explicitly approve saving the weakened policy.</small></span></label>}{error && <div className="um-inline-error"><AlertCircle size={14} /> {error}</div>}<div className="um-modal__footer"><button type="button" className="um-button um-button--ghost" onClick={onClose} disabled={isSaving}>Keep editing</button><button type="button" className="um-button um-button--primary" onClick={onSave} disabled={isSaving || (weakened.length > 0 && !confirmationChecked)}>{isSaving ? 'Saving…' : 'Apply security policy'}</button></div></div></div></div>
}

const SecuritySettingsPanel: React.FC = () => {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['management-security-settings'], queryFn: userManagementApi.getSecuritySettings })
  const [savedDraft, setSavedDraft] = useState<SecurityDraft>(DEFAULT_SECURITY_FORM)
  const [draft, setDraft] = useState<SecurityDraft>(DEFAULT_SECURITY_FORM)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [confirmationChecked, setConfirmationChecked] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [backendConfirmationRequired, setBackendConfirmationRequired] = useState(false)
  const dirty = !sameDraft(draft, savedDraft)

  useEffect(() => {
    if (!query.data || hydrated) return
    const normalized = normalizeSecuritySettings(query.data)
    setDraft(normalized)
    setSavedDraft(normalized)
    setLastUpdated(query.data.updated_at || null)
    setHydrated(true)
  }, [hydrated, query.data])

  useEffect(() => {
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeLeave)
    return () => window.removeEventListener('beforeunload', warnBeforeLeave)
  }, [dirty])

  const changes = useMemo(() => (Object.keys(DEFAULT_SECURITY_FORM) as SecurityKey[]).filter((key) => JSON.stringify(savedDraft[key]) !== JSON.stringify(draft[key])).map((key) => ({ key, previous: savedDraft[key], next: draft[key], strength: classifyChange(key, savedDraft[key], draft[key]) })), [draft, savedDraft])
  const weakened = changes.some((change) => change.strength === 'weakened')

  const saveMutation = useMutation({
    mutationFn: (confirmWeakening: boolean) => userManagementApi.updateSecuritySettings(draft, confirmWeakening),
    onSuccess: (data) => {
      const normalized = normalizeSecuritySettings(data)
      setDraft(normalized)
      setSavedDraft(normalized)
      setLastUpdated(data.updated_at || new Date().toISOString())
      setReviewOpen(false)
      setConfirmationChecked(false)
      setBackendConfirmationRequired(false)
      setFieldErrors({})
      setNotice({ type: 'success', message: 'Security policy saved and added to Activity History.' })
      queryClient.invalidateQueries({ queryKey: ['management-security-settings'] })
    },
    onError: (error: any) => {
      if (error?.response?.status === 409) {
        setBackendConfirmationRequired(true)
        setNotice({ type: 'error', message: 'This policy change weakens protection. Confirm it explicitly in the review dialog.' })
      } else {
        setNotice({ type: 'error', message: getErrorMessage(error) })
      }
    },
  })

  const validate = () => {
    const errors: Record<string, string> = {}
    Object.entries(NUMERIC_RULES).forEach(([key, rule]) => {
      const value = draft[key as SecurityKey]
      if (typeof value !== 'number' || !Number.isInteger(value) || value < rule.min || value > rule.max) errors[key] = `${rule.label} must be an integer from ${rule.min} to ${rule.max}.`
    })
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const openReview = () => {
    setNotice(null)
    if (!validate()) return
    if (!dirty) return
    setConfirmationChecked(false)
    setReviewOpen(true)
  }

  const save = () => {
    if (!validate()) return
    saveMutation.mutate(confirmationChecked || backendConfirmationRequired)
  }

  const update = <K extends SecurityKey>(key: K, value: SecurityDraft[K]) => {
    setNotice(null)
    setBackendConfirmationRequired(false)
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const discard = () => {
    setDraft(savedDraft)
    setFieldErrors({})
    setConfirmationChecked(false)
    setBackendConfirmationRequired(false)
    setNotice(null)
  }

  const numericField = (key: SecurityKey, label: string, min: number, max: number, helper?: string) => <label className="security-field"><span>{label}</span><input type="number" inputMode="numeric" min={min} max={max} step={1} value={draft[key] as number} onChange={(event) => update(key, event.target.value === '' ? 0 as SecurityDraft[SecurityKey] : Math.trunc(Number(event.target.value)) as SecurityDraft[SecurityKey])} aria-invalid={Boolean(fieldErrors[key])} aria-describedby={fieldErrors[key] ? `${key}-error` : helper ? `${key}-hint` : undefined} />{helper && <small id={`${key}-hint`}>{helper}</small>}{fieldErrors[key] && <em id={`${key}-error`} className="security-field__error">{fieldErrors[key]}</em>}</label>

  if (query.isLoading && !hydrated) return <div className="security-settings-panel"><div className="security-settings-skeleton"><span /><span /><span /><span /></div></div>
  if (query.isError && !hydrated) return <div className="security-settings-panel"><div className="activity-state activity-state--error"><AlertCircle size={26} /><strong>Security policy is unavailable</strong><span>{getErrorMessage(query.error)}</span><button type="button" className="um-button um-button--secondary" onClick={() => query.refetch()}><RotateCcw size={14} /> Try again</button></div></div>

  return <div className="security-settings-panel">
    <div className="security-settings-header"><div><span className="um-eyebrow">Policy controls</span><h2>Security Settings</h2><p>Configure passwords, sessions, access protection, and account notifications.</p></div><div className="security-settings-header__meta"><span className={`security-draft-status ${dirty ? 'is-dirty' : ''}`}><span />{dirty ? 'Unsaved changes' : 'Policy saved'}</span><small>{lastUpdated ? `Last updated ${new Date(lastUpdated).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}` : 'Last updated information is unavailable'}</small></div></div>

    <div className="security-settings-layout">
      <SecuritySection icon={KeyRound} eyebrow="1 · Password policy" title="Credential protection" description="Set the minimum strength and lifecycle for workspace passwords."><div className="security-fields security-fields--three">{numericField('minimum_password_length', 'Minimum password length', 8, 128)}{numericField('password_history_count', 'Password history', 0, 20, 'Number of previous passwords to remember.')}{numericField('password_expiration_days', 'Expiration', 0, 3650, 'Use 0 for passwords that do not expire.')}</div><div className="security-toggle-grid"><SecuritySettingToggle title="Uppercase letters" description="Require at least one uppercase character." checked={draft.require_uppercase} onChange={(value) => update('require_uppercase', value)} /><SecuritySettingToggle title="Lowercase letters" description="Require at least one lowercase character." checked={draft.require_lowercase} onChange={(value) => update('require_lowercase', value)} /><SecuritySettingToggle title="Numbers" description="Require at least one numeric character." checked={draft.require_number} onChange={(value) => update('require_number', value)} /><SecuritySettingToggle title="Special characters" description="Require punctuation or a symbol." checked={draft.require_special} onChange={(value) => update('require_special', value)} /></div></SecuritySection>

      <SecuritySection icon={ShieldCheck} eyebrow="2 · Login protection" title="Protect sign-in attempts" description="Slow down repeated failures and require stronger authentication when appropriate."><div className="security-fields security-fields--two">{numericField('failed_login_limit', 'Failed attempts before lock', 3, 20)}{numericField('lock_duration_minutes', 'Lock duration', 1, 1440)}{numericField('password_reset_expiration_minutes', 'Reset link lifetime', 5, 1440)}</div><div className="security-toggle-grid"><SecuritySettingToggle title="Require two-factor authentication" description="Require a second factor for every workspace account." checked={draft.require_two_factor} onChange={(value) => update('require_two_factor', value)} /><SecuritySettingToggle title="Password change on first login" description="Require invited users to replace their temporary password." checked={draft.require_password_change_on_first_login} onChange={(value) => update('require_password_change_on_first_login', value)} /></div></SecuritySection>

      <SecuritySection icon={Smartphone} eyebrow="3 · Session security" title="Session security" description="Control how long sessions remain active and whether users can sign in on more than one device."><div className="security-fields security-fields--two">{numericField('session_timeout_minutes', 'Session timeout', 15, 43200, '15 minutes to 30 days.')}</div><div className="security-toggle-grid"><SecuritySettingToggle title="Allow multiple sessions" description="Allow a user to stay signed in on multiple devices." checked={draft.allow_multiple_sessions} onChange={(value) => update('allow_multiple_sessions', value)} /></div></SecuritySection>

      <SecuritySection icon={Network} eyebrow="4 · Invitations" title="Invitation lifecycle" description="Keep access invitations short-lived and easy to understand."><div className="security-fields security-fields--two">{numericField('invitation_expiration_hours', 'Invitation expiry', 1, 720, `${draft.invitation_expiration_hours} hours = ${Math.round(draft.invitation_expiration_hours / 24 * 10) / 10} days. Invitations expire if they are not accepted within this period.`)}</div></SecuritySection>

      <SecuritySection icon={BellRing} eyebrow="5 · Login notifications" title="Invitations & Login Notifications" description="Configure invitation expiry and security alerts for user sign-ins." className="security-settings-card--wide"><div className="security-toggle-grid security-toggle-grid--notifications"><SecuritySettingToggle title="Notify on successful login" description="Send an alert when an account signs in successfully." checked={draft.login_notification} onChange={(value) => update('login_notification', value)} /><SecuritySettingToggle title="Notify on a new device" description="Send an alert when an account signs in from an unrecognized device." checked={draft.new_device_notification} onChange={(value) => update('new_device_notification', value)} /></div><div className="security-notification-note"><CheckCircle2 size={15} /><span>Failed sign-ins, account locks, password changes, and role changes remain available in Activity History. The current policy API persists successful-login and new-device notifications only.</span></div></SecuritySection>
    </div>

    <section className="security-review-bar"><div className="security-review-bar__icon"><LockKeyhole size={18} /></div><div><span className="um-eyebrow">6 · Security review</span><h3>{dirty ? 'Unsaved security policy changes' : 'Security policy is up to date'}</h3><p>{dirty ? 'Review your changes before applying them. Changes that weaken security require explicit confirmation and are recorded in Activity History.' : 'Change a setting to prepare a review. Save is disabled until there is a valid draft.'}</p></div><div className="security-review-bar__actions"><button type="button" className="um-button um-button--ghost" onClick={discard} disabled={!dirty || saveMutation.isPending}><RotateCcw size={14} /> Discard</button><button type="button" className="um-button um-button--secondary" onClick={openReview} disabled={!dirty || saveMutation.isPending}><UserRound size={14} /> Review changes</button><button type="button" className="um-button um-button--primary" onClick={openReview} disabled={!dirty || saveMutation.isPending}><Save size={14} /> {saveMutation.isPending ? 'Saving…' : 'Save policy'}</button></div></section>

    {notice && <div className={`security-settings-notice security-settings-notice--${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}<span>{notice.message}</span><button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification"><X size={14} /></button></div>}
    {reviewOpen && <ReviewDialog changes={changes} _requiresConfirmation={weakened || backendConfirmationRequired} confirmationChecked={confirmationChecked} onConfirmChange={setConfirmationChecked} onClose={() => !saveMutation.isPending && setReviewOpen(false)} onSave={save} isSaving={saveMutation.isPending} error={saveMutation.isError ? getErrorMessage(saveMutation.error) : undefined} />}
  </div>
}

export default SecuritySettingsPanel
