import type { AdvertiserContext, AdvertiserContextInput, AdvertiserSignal } from './types'

const DAY_MS = 24 * 60 * 60 * 1000

function getAccountAgeDays(createdAt: string | null, now: Date): number | null {
  if (!createdAt) return null
  const createdTime = new Date(createdAt).getTime()
  if (!Number.isFinite(createdTime)) return null
  return Math.max(0, Math.floor((now.getTime() - createdTime) / DAY_MS))
}

export function buildAdvertiserContext(input: AdvertiserContextInput, now = new Date()): AdvertiserContext {
  const accountAgeDays = getAccountAgeDays(input.profileCreatedAt, now)
  const countStatus = (status: AdvertiserContextInput['propertyStatuses'][number]) => (
    input.propertyStatuses.filter((current) => current === status).length
  )
  const aiRejected = countStatus('ai_rejected')
  const pendingReports = input.reportStatuses.filter((status) => status === 'pending').length
  const signals: AdvertiserSignal[] = []

  if (pendingReports > 0) signals.push({
    code: 'pending_reports',
    label: 'Reportes pendientes',
    detail: `${pendingReports} reporte${pendingReports === 1 ? '' : 's'} requiere${pendingReports === 1 ? '' : 'n'} revisión.`,
    severity: 'danger',
  })
  if (input.reportStatuses.length >= 3) signals.push({
    code: 'repeated_reports',
    label: 'Reportes repetidos',
    detail: `${input.reportStatuses.length} reportes acumulados en sus publicaciones.`,
    severity: 'danger',
  })
  if (accountAgeDays !== null && accountAgeDays < 30) signals.push({
    code: 'new_account',
    label: 'Cuenta reciente',
    detail: `Antigüedad de ${accountAgeDays} día${accountAgeDays === 1 ? '' : 's'}.`,
    severity: 'warning',
  })
  if (aiRejected > 0) signals.push({
    code: 'rejected_properties',
    label: 'Publicaciones rechazadas',
    detail: `${aiRejected} publicación${aiRejected === 1 ? '' : 'es'} rechazada${aiRejected === 1 ? '' : 's'} por moderación automática.`,
    severity: aiRejected >= 3 ? 'danger' : 'warning',
  })

  return {
    profileCreatedAt: input.profileCreatedAt,
    accountAgeDays,
    lastPropertyAt: input.lastPropertyAt,
    propertyCounts: {
      total: input.propertyStatuses.length,
      published: countStatus('published'),
      pendingReview: countStatus('pending_review'),
      aiApproved: countStatus('ai_approved'),
      aiRejected,
      paused: countStatus('paused'),
    },
    reportCounts: { total: input.reportStatuses.length, pending: pendingReports },
    riskLevel: signals.some((signal) => signal.severity === 'danger')
      ? 'high'
      : signals.length > 0 ? 'medium' : 'low',
    signals,
  }
}
