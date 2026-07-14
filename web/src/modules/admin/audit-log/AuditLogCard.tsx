import { Bot, CalendarClock, FileClock, ShieldCheck, UserRound } from 'lucide-react'
import { Badge } from '../../../shared/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import {
  formatAuditAction,
  formatAuditDate,
  formatAuditSource,
  formatAuditStatus,
  getAuditReason,
} from './formatters'
import type { AuditLogEvent } from './types'

export function AuditLogCard({ event }: { event: AuditLogEvent }) {
  const isAutomation = event.source === 'automation'
  const actorLabel = event.actorId ? `${event.actorRole} · ${event.actorId}` : 'Sistema'

  return (
    <Card className="rounded-xl border-neutral-200 shadow-sm">
      <CardHeader className="gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={event.action === 'delete' ? 'accent' : 'secondary'}>{formatAuditAction(event)}</Badge>
          <Badge variant="outline">{formatAuditSource(event.source)}</Badge>
          {event.provider && <Badge variant="outline">{event.provider}</Badge>}
        </div>
        <CardTitle className="text-base leading-snug text-neutral-900">
          {event.propertyTitle || `Propiedad ${event.propertyId.slice(0, 8)}`}
        </CardTitle>
        <p className="flex items-center gap-2 text-xs text-neutral-500">
          <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
          <time dateTime={event.createdAt}>{formatAuditDate(event.createdAt)}</time>
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 pt-0 sm:grid-cols-2 sm:p-5 sm:pt-0">
        <div className="rounded-lg bg-neutral-50 p-3">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
            <FileClock className="h-4 w-4" aria-hidden="true" /> Transición
          </p>
          <p className="mt-2 text-sm font-semibold text-neutral-900">
            {formatAuditStatus(event.oldStatus)} → {formatAuditStatus(event.newStatus)}
          </p>
        </div>
        <div className="rounded-lg bg-neutral-50 p-3">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
            {isAutomation ? <Bot className="h-4 w-4" aria-hidden="true" /> : <UserRound className="h-4 w-4" aria-hidden="true" />}
            Actor
          </p>
          <p className="mt-2 break-all text-sm font-semibold text-neutral-900">{actorLabel}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Motivo registrado
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">{getAuditReason(event)}</p>
        </div>
      </CardContent>
    </Card>
  )
}
