import { useState } from 'react'
import { Building2, Loader2 } from 'lucide-react'
import { MetricsTab } from '../../modules/admin/metrics/MetricsTab'
import { PropertiesTab } from '../../modules/admin/properties/PropertiesTab'
import { ReportsTab } from '../../modules/admin/reports/ReportsTab'
import { AuditLogTab } from '../../modules/admin/audit-log/AuditLogTab'
import { AdminMfaGate } from '../../modules/auth/mfa/AdminMfaGate'
import type { AdminSection } from '../../modules/admin/core/types'
import { useSEO } from '../../shared/hooks/useSEO'
import { Button } from '../../shared/ui/button'

type AdminPageProps = {
  userRole?: string
  onNavigateHome: () => void
}

const SECTIONS: ReadonlyArray<{ id: AdminSection; label: string }> = [
  { id: 'properties', label: 'Propiedades' },
  { id: 'reports', label: 'Reportes' },
  { id: 'audit', label: 'Bitácora' },
  { id: 'metrics', label: 'Métricas' },
]

export function AdminPage({ userRole, onNavigateHome }: AdminPageProps) {
  useSEO({ title: 'Panel de Administración' })

  const [activeSection, setActiveSection] = useState<AdminSection>('properties')

  if (userRole === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-20">
        <Loader2 className="h-10 w-10 animate-spin text-[#035f53]" />
      </div>
    )
  }

  if (userRole !== 'admin') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-20">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100">
          <Building2 className="h-10 w-10 text-neutral-400" />
        </div>
        <h1 className="text-xl font-bold text-neutral-800">Acceso restringido</h1>
        <p className="mt-2 max-w-sm text-center text-sm text-neutral-500">
          No tienes permisos para acceder al panel de moderación.
        </p>
        <Button
          className="mt-6 rounded-full bg-[#035f53] px-6 text-white hover:bg-[#024a41]"
          onClick={onNavigateHome}
        >
          Ir al inicio
        </Button>
      </div>
    )
  }

  return (
    <AdminMfaGate>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-neutral-400">Administración</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-neutral-900 sm:text-[28px]">
            Panel de moderación
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Revisión de anuncios publicados y reportes enviados por usuarios.
          </p>
          </div>

          <nav aria-label="Secciones de moderación" className="flex h-fit w-full gap-2 overflow-x-auto rounded-xl bg-neutral-100 p-1.5 sm:w-fit sm:rounded-full">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                aria-current={activeSection === section.id ? 'page' : undefined}
                onClick={() => setActiveSection(section.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  activeSection === section.id
                    ? 'bg-[#035f53] text-white shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </header>

        {activeSection === 'properties' && <PropertiesTab />}
        {activeSection === 'reports' && <ReportsTab />}
        {activeSection === 'metrics' && <MetricsTab />}
        {activeSection === 'audit' && <AuditLogTab />}
      </div>
    </AdminMfaGate>
  )
}
