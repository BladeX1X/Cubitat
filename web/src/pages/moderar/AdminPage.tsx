import { lazy, Suspense, useState } from 'react'
import { Building2, Loader2 } from 'lucide-react'
import { MetricsTab } from '../../modules/admin/metrics/MetricsTab'
import { PropertiesTab } from '../../modules/admin/properties/PropertiesTab'
import { ReportsTab } from '../../modules/admin/reports/ReportsTab'
import { AuditLogTab } from '../../modules/admin/audit-log/AuditLogTab'
import { AdminMfaGate } from '../../modules/auth/mfa/AdminMfaGate'
import type { AdminSection } from '../../modules/admin/core/types'
import { useSEO } from '../../shared/hooks/useSEO'
import { Button } from '../../shared/ui/button'
import { PHASE_TWO_ENABLED } from '../../shared/config/features'

type AdminPageProps = {
  userRole?: string
  onNavigateHome: () => void
  onSessionExpired: () => Promise<void> | void
  phaseTwoEnabled?: boolean
}

const BASE_SECTIONS: ReadonlyArray<{ id: AdminSection; label: string }> = [
  { id: 'properties', label: 'Propiedades' },
  { id: 'reports', label: 'Reportes' },
  { id: 'audit', label: 'Bitácora' },
  { id: 'metrics', label: 'Métricas' },
]

const PROPERTY_VERIFICATION_ADMIN_UI_ENABLED = import.meta.env.DEV
  || import.meta.env.VITE_PHASE2_UI_ENABLED === 'true'
  || import.meta.env.VITE_PROPERTY_VERIFICATION_UI_ENABLED === 'true'
const PHASE_TWO_ADMIN_UI_ENABLED = PHASE_TWO_ENABLED || PROPERTY_VERIFICATION_ADMIN_UI_ENABLED
const KYC_ADMIN_UI_ENABLED = import.meta.env.DEV
  || import.meta.env.VITE_PHASE2_UI_ENABLED === 'true'
  || import.meta.env.VITE_KYC_UI_ENABLED === 'true'
const PHASE3_APPLICATIONS_ADMIN_UI_ENABLED = import.meta.env.VITE_PHASE3_UI_ENABLED === 'true'

const KycModerationTab = KYC_ADMIN_UI_ENABLED
  ? lazy(() =>
      import('../../modules/admin/kyc/KycModerationTab').then((module) => ({
        default: module.KycModerationTab,
      })),
    )
  : null

const PropertyVerificationModerationTab = PROPERTY_VERIFICATION_ADMIN_UI_ENABLED
  ? lazy(() =>
      import('../../modules/admin/property-verification/PropertyVerificationModerationTab').then((module) => ({
        default: module.PropertyVerificationModerationTab,
      })),
    )
  : null

const AgentApplicationsModerationTab = PHASE3_APPLICATIONS_ADMIN_UI_ENABLED
  ? lazy(() => import('../../modules/admin/agent-applications/AgentApplicationsModerationTab').then((module) => ({
      default: module.AgentApplicationsModerationTab,
    })))
  : null

const PHASE4_SVC_ENABLED = import.meta.env.VITE_PHASE4_SVC_ENABLED === 'true'
const PHASE4_REV_ENABLED = import.meta.env.VITE_PHASE4_REV_ENABLED === 'true'
const PHASE4_MAT_ENABLED = import.meta.env.VITE_PHASE4_MAT_ENABLED === 'true'
const PHASE4_BIZ_ENABLED = import.meta.env.VITE_PHASE4_BIZ_ENABLED === 'true'
const ServiceProviderModerationTab = PHASE4_SVC_ENABLED
  ? lazy(() => import('../../modules/admin/home-services/ServiceProviderModerationTab').then((module) => ({ default: module.ServiceProviderModerationTab })))
  : null
const ServiceReviewModerationTab = PHASE4_REV_ENABLED
  ? lazy(() => import('../../modules/admin/service-reviews/ServiceReviewModerationTab').then((module) => ({ default: module.ServiceReviewModerationTab })))
  : null
const MaterialModerationTab = PHASE4_MAT_ENABLED
  ? lazy(() => import('../../modules/admin/materials/MaterialModerationTab').then((module) => ({ default: module.MaterialModerationTab })))
  : null
const BusinessBenefitsTab = PHASE4_BIZ_ENABLED
  ? lazy(() => import('../../modules/admin/business-benefits/BusinessBenefitsTab').then((module) => ({ default: module.BusinessBenefitsTab })))
  : null

export function AdminPage({
  userRole,
  onNavigateHome,
  onSessionExpired,
  phaseTwoEnabled = PHASE_TWO_ENABLED || PHASE_TWO_ADMIN_UI_ENABLED,
}: AdminPageProps) {
  useSEO({ title: 'Panel de Administración' })

  const [activeSection, setActiveSection] = useState<AdminSection>('properties')
  const hasKycAdmin = KycModerationTab !== null && (phaseTwoEnabled || import.meta.env.VITE_KYC_UI_ENABLED === 'true')
  const hasPropertyVerificationAdmin = phaseTwoEnabled && PropertyVerificationModerationTab !== null
  const sections = [
    ...BASE_SECTIONS.slice(0, 2),
    ...(hasKycAdmin ? [{ id: 'kyc' as const, label: 'KYC' }] : []),
    ...(hasPropertyVerificationAdmin ? [{ id: 'property-verification' as const, label: 'Documentos' }] : []),
    ...(AgentApplicationsModerationTab ? [{ id: 'agent-applications' as const, label: 'Postulaciones' }] : []),
    ...(ServiceProviderModerationTab ? [{ id: 'home-services' as const, label: 'Servicios' }] : []),
    ...(ServiceReviewModerationTab ? [{ id: 'service-reviews' as const, label: 'Reseñas' }] : []),
    ...(MaterialModerationTab ? [{ id: 'materials' as const, label: 'Materiales' }] : []),
    ...(BusinessBenefitsTab ? [{ id: 'business-benefits' as const, label: 'Beneficios' }] : []),
    ...BASE_SECTIONS.slice(2),
  ]

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
    <AdminMfaGate onSessionExpired={onSessionExpired}>
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
            {sections.map((section) => (
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
        {hasKycAdmin && activeSection === 'kyc' && (
          <Suspense fallback={<Loader2 className="mx-auto h-8 w-8 animate-spin text-[#035f53]" />}>
            <KycModerationTab />
          </Suspense>
        )}
        {hasPropertyVerificationAdmin && activeSection === 'property-verification' && (
          <Suspense fallback={<Loader2 className="mx-auto h-8 w-8 animate-spin text-[#035f53]" />}>
            <PropertyVerificationModerationTab />
          </Suspense>
        )}
        {AgentApplicationsModerationTab && activeSection === 'agent-applications' && (
          <Suspense fallback={<Loader2 className="mx-auto h-8 w-8 animate-spin text-[#035f53]" />}>
            <AgentApplicationsModerationTab />
          </Suspense>
        )}
        {ServiceProviderModerationTab && activeSection === 'home-services' && <Suspense fallback={<Loader2 className="mx-auto h-8 w-8 animate-spin text-[#035f53]" />}><ServiceProviderModerationTab /></Suspense>}
        {ServiceReviewModerationTab && activeSection === 'service-reviews' && <Suspense fallback={<Loader2 className="mx-auto h-8 w-8 animate-spin text-[#035f53]" />}><ServiceReviewModerationTab /></Suspense>}
        {MaterialModerationTab && activeSection === 'materials' && <Suspense fallback={<Loader2 className="mx-auto h-8 w-8 animate-spin text-[#035f53]" />}><MaterialModerationTab /></Suspense>}
        {BusinessBenefitsTab && activeSection === 'business-benefits' && <Suspense fallback={<Loader2 className="mx-auto h-8 w-8 animate-spin text-[#035f53]" />}><BusinessBenefitsTab /></Suspense>}
        {activeSection === 'metrics' && <MetricsTab />}
        {activeSection === 'audit' && <AuditLogTab />}
      </div>
    </AdminMfaGate>
  )
}
