import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  Camera,
  Bell,
  Check,
  Edit3,
  Loader2,
  Mail,
  MessageCircle,
  Search,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react'
import { Button } from '../../shared/ui/button'
import { Input } from '../../shared/ui/input'
import { supabase } from '../../shared/lib/supabaseClient'
import { AccountLayout } from './AccountLayout'
import { useSearchAlerts, type SearchAlert } from '../../modules/search/hooks/useSearchAlerts'
import { useSEO } from '../../shared/hooks/useSEO'
import { logSafeEvent, sanitizeErrorReason } from '../../shared/lib/logger'
import {
  AVATAR_IMAGE_RULES,
  validateImageDimensions,
  validateImageFile,
} from '../../shared/lib/imageSecurity'

const AccountPhaseTwoSections = import.meta.env.DEV
  ? lazy(() => import('./AccountPhaseTwoSections').then((module) => ({
      default: module.AccountPhaseTwoSections,
    })))
  : null

type AccountPageProps = {
  user: User
  userRole?: string
  onRoleChange?: (newRole: string) => void
  onBack: () => void
  onNavigateAccount: () => void
  onNavigateFavorites: () => void
  onNavigateMyProperties: () => void
  onNavigateAgentDashboard?: () => void
}

export function AccountPage({
  user,
  userRole: initialUserRole,
  onRoleChange,
  onBack,
  onNavigateAccount,
  onNavigateFavorites,
  onNavigateMyProperties,
  onNavigateAgentDashboard,
}: AccountPageProps) {
  useSEO({
    title: 'Mi Cuenta',
  })

  const initialName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || 'Usuario Cubitat'
  const initialAvatarUrl =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''
  const [fullName, setFullName] = useState(initialName)
  const [draftName, setDraftName] = useState(initialName)
  const [phone, setPhone] = useState('')
  const [phoneVerifiedAt, setPhoneVerifiedAt] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string>(initialAvatarUrl)
  const [isEditingName, setIsEditingName] = useState(false)
  const [isSavingName, setIsSavingName] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [nameMessage, setNameMessage] = useState<string | null>(null)
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const email = user?.email || 'Sin correo registrado'
  const userId = user?.id || ''
  const safeFullName = typeof fullName === 'string' ? fullName : (initialName || 'Usuario Cubitat')
  const initial = (safeFullName || email).substring(0, 1).toUpperCase()
  const {
    alerts: searchAlerts,
    loading: loadingSearchAlerts,
    deleteAlert: deleteSearchAlert,
  } = useSearchAlerts(userId)
  const verifiedItems = [
    Boolean(safeFullName.trim()),
    Boolean(email),
    Boolean(phoneVerifiedAt),
  ]
  const verifiedCount = verifiedItems.filter(Boolean).length

  const [userRole, setUserRole] = useState<string | undefined>(initialUserRole)

  useEffect(() => {
    let active = true
    const requestedUserId = user?.id

    setFullName(initialName)
    setDraftName(initialName)
    setPhone('')
    setPhoneVerifiedAt(null)
    setAvatarUrl(initialAvatarUrl)
    setUserRole(initialUserRole)
    setIsEditingName(false)
    setNameMessage(null)
    setAvatarMessage(null)

    async function loadProfile() {
      if (!requestedUserId) return
      const { data } = await supabase
        .from('profiles')
        .select('role, full_name, phone, avatar_url, phone_verified_at')
        .eq('id', requestedUserId)
        .maybeSingle()

      if (!active || !data) return

      const resolvedName = data.full_name || initialName
      setUserRole(data.role || initialUserRole)
      setFullName(resolvedName)
      setDraftName(resolvedName)
      setPhone(data.phone || '')
      setAvatarUrl(data.avatar_url || initialAvatarUrl)
      setPhoneVerifiedAt(data.phone_verified_at || null)
    }

    void loadProfile()
    return () => {
      active = false
    }
  }, [initialAvatarUrl, initialName, initialUserRole, user?.id])

  const handleResolvedRole = useCallback((nextRole: string) => {
    setUserRole(nextRole)
  }, [])

  async function handleSaveName() {
    const cleanName = (draftName || '').trim()
    if (cleanName.length < 2) {
      setNameMessage('Escribe un nombre valido.')
      return
    }

    setIsSavingName(true)
    setNameMessage(null)

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        full_name: cleanName,
        name: cleanName,
      },
    })

    if (authError) {
      setIsSavingName(false)
      setNameMessage('No se pudo actualizar el nombre.')
      return
    }
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: cleanName })
      .eq('id', userId)

    setIsSavingName(false)

    if (profileError) {
      setNameMessage('Nombre actualizado en la cuenta. Falta sincronizar perfil.')
      setFullName(cleanName)
      setIsEditingName(false)
      return
    }

    setFullName(cleanName)
    setDraftName(cleanName)
    setIsEditingName(false)
    setNameMessage('Nombre actualizado.')
  }

  async function handleAvatarFile(file: File | undefined) {
    if (!file) return

    const validationError = validateImageFile(file, AVATAR_IMAGE_RULES)
    if (validationError) {
      setAvatarMessage(validationError)
      return
    }

    setIsUploadingAvatar(true)
    setAvatarMessage(null)

    let compressedBlob: Blob
    try {
      compressedBlob = await compressAvatarToWebP(file)
    } catch (err) {
      logSafeEvent({
        module: 'account',
        action: 'compress_avatar',
        level: 'error',
        code: sanitizeErrorReason(err),
      })
      setAvatarMessage('No se pudo optimizar la imagen del avatar.')
      setIsUploadingAvatar(false)
      return
    }

    const filePath = `${userId}/avatar.webp`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, compressedBlob, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/webp'
      })

    if (uploadError) {
      setIsUploadingAvatar(false)
      setAvatarMessage('No se pudo subir el avatar. Revisa la migracion del bucket avatars.')
      return
    }

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    const nextAvatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

    await supabase.auth.updateUser({
      data: {
        avatar_url: nextAvatarUrl,
        picture: nextAvatarUrl,
      },
    })

    const { error: profileError2 } = await supabase
      .from('profiles')
      .update({ avatar_url: nextAvatarUrl })
      .eq('id', userId)

    setIsUploadingAvatar(false)

    if (profileError2) {
      setAvatarMessage('Avatar subido. Falta sincronizar el perfil.')
      setAvatarUrl(nextAvatarUrl)
      return
    }

    setAvatarUrl(nextAvatarUrl)
    setAvatarMessage('Avatar actualizado.')
  }

  return (
    <AccountLayout
      active="account"
      userRole={userRole || initialUserRole}
      onNavigateAccount={onNavigateAccount}
      onNavigateFavorites={onNavigateFavorites}
      onNavigateMyProperties={onNavigateMyProperties}
      onNavigateAgentDashboard={onNavigateAgentDashboard}
    >
            <section className="relative overflow-hidden rounded-md bg-gradient-to-r from-[#155b55] to-[#007565] px-4 py-5 text-white shadow-sm sm:px-7 sm:py-8">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black/15 sm:h-10 sm:w-10">
                  <Search size={18} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-[20px] font-black leading-[1.08] tracking-tight sm:text-[28px]">
                  Centro de verificacion y cuenta
                  </h1>
                  <p className="mt-1.5 max-w-2xl text-xs font-semibold leading-snug text-white/85 sm:text-base">
                  Manten tu informacion actualizada y aumenta la confianza de tus contactos.
                  </p>
                </div>
              </div>
            </section>

            <div className="mt-5 grid grid-cols-1 gap-5 items-start xl:mt-8 xl:grid-cols-[280px_minmax(0,1fr)] xl:gap-8">
              <section className="flex items-center justify-center gap-4 xl:flex-col">
                <div className="relative">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={`Avatar de ${safeFullName}`}
                      className="h-24 w-24 rounded-full object-cover shadow-sm sm:h-52 sm:w-52"
                    />
                  ) : (
                    <div className="grid h-24 w-24 place-items-center rounded-full bg-[#1263e6] text-[42px] font-light text-white shadow-sm sm:h-52 sm:w-52 sm:text-[88px]">
                      {initial}
                    </div>
                  )}
                  <input
                    ref={avatarInputRef}
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleAvatarFile(event.target.files?.[0])}
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-[#008f79] px-3 py-1 text-[11px] font-black text-white shadow-sm sm:bottom-2 sm:px-4 sm:py-1.5 sm:text-xs"
                  >
                    {isUploadingAvatar ? <Edit3 size={13} /> : <Camera size={13} />}
                    {isUploadingAvatar ? 'Subiendo...' : 'Editar'}
                  </button>
                </div>
                {avatarMessage ? (
                  <p className="mt-3 max-w-[220px] text-center text-sm font-semibold text-[#008f79]">
                    {avatarMessage}
                  </p>
                ) : null}
              </section>

              <section className="grid gap-5 sm:gap-8">
                {AccountPhaseTwoSections ? (
                  <Suspense fallback={null}>
                    <AccountPhaseTwoSections
                      userId={userId}
                      userRole={userRole}
                      onRoleChange={onRoleChange}
                      onResolvedRole={handleResolvedRole}
                      onNavigateAgentDashboard={onNavigateAgentDashboard}
                    />
                  </Suspense>
                ) : null}

                <VerificationCard
                  verifiedCount={verifiedCount}
                  hasName={Boolean(safeFullName.trim())}
                  hasEmail={Boolean(email)}
                  hasVerifiedPhone={Boolean(phoneVerifiedAt)}
                />

                <SearchAlertsCard
                  alerts={searchAlerts}
                  loading={loadingSearchAlerts}
                  onDelete={deleteSearchAlert}
                />

                <AccountSection title="Informacion de usuario">
                  <EditableNameRow
                    value={safeFullName}
                    draftValue={draftName}
                    isEditing={isEditingName}
                    isSaving={isSavingName}
                    message={nameMessage}
                    onChange={setDraftName}
                    onEdit={() => {
                      setDraftName(fullName)
                      setNameMessage(null)
                      setIsEditingName(true)
                    }}
                    onCancel={() => {
                      setDraftName(fullName)
                      setNameMessage(null)
                      setIsEditingName(false)
                    }}
                    onSave={handleSaveName}
                  />
                  <AccountRow
                    label="Email de la cuenta de usuario"
                    value={email}
                    helper="Este correo es el identificador de acceso y no se modifica desde esta pantalla."
                    status="verified"
                    icon={<Mail size={16} />}
                  />
                </AccountSection>

                <AccountSection title="Informacion de contacto">
                  <AccountRow
                    label="Email de contacto"
                    value={email}
                    helper="Este dato esta validado y activo para recibir contactos."
                    status="verified"
                    icon={<Mail size={16} />}
                  />
                  <AccountRow
                    label="Numero de celular"
                    value={phone || 'Ingresa tu numero de celular'}
                    helper="Este numero se verificara por WhatsApp antes de marcarlo como validado."
                    status={phoneVerifiedAt ? 'verified' : phone ? 'pending' : 'missing'}
                    actionLabel="Verificar por WhatsApp"
                    icon={<MessageCircle size={16} />}
                  />
                </AccountSection>

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    className="rounded-full h-10 px-5 text-sm font-bold"
                    onClick={onBack}
                  >
                    Volver a mi cuenta
                  </Button>
                </div>
              </section>
            </div>

    </AccountLayout>
  )
}

function SearchAlertsCard({
  alerts,
  loading,
  onDelete,
}: {
  alerts: SearchAlert[]
  loading: boolean
  onDelete: (alertId: string) => Promise<void>
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleDelete(alertId: string) {
    setDeletingId(alertId)
    setMessage(null)

    try {
      await onDelete(alertId)
      setMessage('Alerta eliminada.')
    } catch {
      setMessage('No se pudo eliminar la alerta.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#d7faea] text-[#008f79] sm:h-12 sm:w-12">
            <Bell size={22} />
          </span>
          <div>
            <h2 className="text-base font-black leading-tight text-neutral-900 sm:text-lg">
              Alertas de busqueda
            </h2>
            <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
              Guarda filtros importantes y consulta aquí las alertas activas. Los avisos por correo se habilitarán cuando el entorno DEV de entrega esté configurado.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 rounded-lg bg-neutral-50 px-4 py-3 text-sm font-bold text-neutral-500">
            <Loader2 size={16} className="animate-spin" />
            Cargando alertas...
          </div>
        ) : alerts.length > 0 ? (
          <div className="grid gap-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                data-search-alert-id={alert.id}
                className="grid gap-3 rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-neutral-900">
                    {alert.label}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-neutral-500">
                    Creada el {new Date(alert.created_at).toLocaleDateString('es-CU')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-full border-neutral-200 px-4 text-sm font-black text-red-600"
                  disabled={deletingId === alert.id}
                  onClick={() => handleDelete(alert.id)}
                >
                  <Trash2 size={14} />
                  {deletingId === alert.id ? 'Eliminando...' : 'Eliminar'}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-neutral-200 px-4 py-5 text-sm text-neutral-500">
            Todavia no tienes alertas. Entra a resultados, aplica filtros y pulsa Crear alerta.
          </div>
        )}

        {message ? (
          <p className="text-sm font-bold text-[#008f79]">{message}</p>
        ) : null}
      </div>
    </section>
  )
}

function EditableNameRow({
  value,
  draftValue,
  isEditing,
  isSaving,
  message,
  onChange,
  onEdit,
  onCancel,
  onSave,
}: {
  value: string
  draftValue: string
  isEditing: boolean
  isSaving: boolean
  message: string | null
  onChange: (value: string) => void
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
}) {
  return (
    <div className="grid gap-4 border-b border-neutral-100 py-5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div>
        <div className="mb-3 text-sm font-semibold text-neutral-500">
          Nombre completo
        </div>
        {isEditing ? (
          <Input
            value={draftValue}
            onChange={(event) => onChange(event.target.value)}
            className="max-w-md h-10"
            autoFocus
          />
        ) : (
          <p className="text-sm font-bold text-neutral-800">{value}</p>
        )}
        {message ? (
          <p className="mt-2 text-sm font-semibold text-[#008f79]">{message}</p>
        ) : null}
      </div>

      {isEditing ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Button
            variant="outline"
            className="rounded-full h-9 px-4 text-sm font-black border-neutral-200"
            type="button"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            className="rounded-full h-9 px-4 text-sm font-black bg-[#008f79] hover:bg-[#007565] text-white"
            type="button"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="rounded-full h-9 px-4 text-sm font-black text-[#008f79] border-neutral-200"
          type="button"
          onClick={onEdit}
        >
          Modificar
        </Button>
      )}
    </div>
  )
}

function VerificationCard({
  verifiedCount,
  hasName,
  hasEmail,
  hasVerifiedPhone,
}: {
  verifiedCount: number
  hasName: boolean
  hasEmail: boolean
  hasVerifiedPhone: boolean
}) {
  const totalItems = 3
  const percent = Math.round((verifiedCount / totalItems) * 100)
  const missingCount = totalItems - verifiedCount

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:gap-5">
        <div className="flex gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#d7faea] text-[#008f79] sm:h-12 sm:w-12">
            <ShieldCheck size={22} />
          </span>
          <div>
            <h2 className="text-base font-black leading-tight text-neutral-900 sm:text-lg">
              Completa tu verificacion y aumenta tu rendimiento
            </h2>
            <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
              Los usuarios con datos verificados reciben mas contactos y generan mayor confianza.
            </p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-sm font-black">
            <span className="text-neutral-700">
              {verifiedCount} de {totalItems} datos verificados
            </span>
            <span className="text-[#008f79]">{percent}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-neutral-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#008f79] transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <VerificationItem ok={hasName} label="Nombre" />
          <VerificationItem ok={hasEmail} label="Email" />
          <VerificationItem ok={hasVerifiedPhone} label="Celular por WhatsApp" />
        </div>

        <p className="text-sm font-bold text-[#008f79]">
          {missingCount === 0
            ? 'Tu cuenta tiene los datos principales verificados.'
            : `Te ${missingCount === 1 ? 'falta' : 'faltan'} ${missingCount} ${missingCount === 1 ? 'dato' : 'datos'} para obtener el badge de cuenta verificada.`}
        </p>
      </div>
    </section>
  )
}

function VerificationItem({ ok = false, label }: { ok?: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${ok ? 'text-[#008f79]' : 'text-neutral-400'}`}>
      {ok ? <Check size={16} /> : <XCircle size={16} />}
      {label}
    </span>
  )
}

function AccountSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-black text-neutral-900">{title}</h2>
      <div className="rounded-xl border border-neutral-200 bg-white px-6 shadow-sm">
        {children}
      </div>
    </section>
  )
}

function AccountRow({
  label,
  value,
  helper,
  status,
  actionLabel,
  icon,
}: {
  label: string
  value: string
  helper?: string
  status?: 'verified' | 'pending' | 'missing'
  actionLabel?: string
  icon?: ReactNode
}) {
  return (
    <div className="grid gap-4 border-b border-neutral-100 py-5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-500">
          {icon}
          {label}
        </div>
        <p
          className={`text-sm font-bold ${
            status === 'missing' ? 'text-red-500' : 'text-neutral-800'
          }`}
        >
          {value}
        </p>
        {helper ? (
          <p className="mt-1 text-sm text-neutral-500">{helper}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {status ? <StatusPill status={status} /> : null}
        {actionLabel ? (
          <Button
            variant="outline"
            className="rounded-full h-9 px-4 text-sm font-black border-neutral-200 text-[#008f79]"
            type="button"
          >
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: 'verified' | 'pending' | 'missing' }) {
  if (status === 'verified') {
    return (
      <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#d7faea] px-3 text-xs font-black text-[#008f79]">
        <Check size={14} />
        Verificado
      </span>
    )
  }

  if (status === 'missing') {
    return (
      <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-red-50 px-3 text-xs font-black text-red-500">
        <XCircle size={14} />
        No verificado
      </span>
    )
  }

  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-amber-50 px-3 text-xs font-black text-amber-600">
      Pendiente
    </span>
  )
}

/* Helper to compress avatar image to WebP offline with Canvas */
async function compressAvatarToWebP(file: File): Promise<Blob> {
  const fileValidationError = validateImageFile(file, AVATAR_IMAGE_RULES)
  if (fileValidationError) throw new Error(fileValidationError)

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        try {
          const dimensionError = validateImageDimensions(img.width, img.height, AVATAR_IMAGE_RULES)
          if (dimensionError) {
            reject(new Error(dimensionError))
            return
          }
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          
          const MAX_SIZE = 300 // WebP avatar max resolution (perfect size for avatars)
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width
              width = MAX_SIZE
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height
              height = MAX_SIZE
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('No se pudo obtener el contexto 2D del canvas.'))
            return
          }
          ctx.drawImage(img, 0, 0, width, height)
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Fallo al generar Blob de WebP.'))
            }
          }, 'image/webp', 0.8)
        } catch (err) {
          reject(err)
        }
      }
      img.onerror = () => reject(new Error('Error al cargar la imagen.'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo.'))
    reader.readAsDataURL(file)
  })
}
