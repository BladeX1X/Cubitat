import { supabase } from '../../shared/lib/supabaseClient'
import { logSafeEvent } from '../../shared/lib/logger'
import { sanitizeErrorReason } from '../../shared/lib/logger'
import type { VerificationStatus } from './types'

export async function submitKycRequest(
  documentType: 'identity_card' | 'license' | 'passport',
  documentUrl: string,
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('submit_kyc_request', {
      p_document_type: documentType,
      p_document_url: documentUrl,
    })

    if (error) {
      logSafeEvent({
        module: 'kyc',
        action: 'submit_request',
        level: 'error',
        code: sanitizeErrorReason(error),
      })
      return { success: false, error: 'No se pudo enviar la solicitud de verificación.' }
    }

    return { success: true, requestId: data as string }
  } catch (err) {
    logSafeEvent({
      module: 'kyc',
      action: 'submit_request_exception',
      level: 'error',
      code: sanitizeErrorReason(err),
    })
    return { success: false, error: 'Ocurrió un error inesperado al procesar tu solicitud.' }
  }
}

export async function fetchUserKycStatus(
  userId: string,
): Promise<{ status: VerificationStatus; reason?: string | null }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('verification_status, verification_reason')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return { status: 'unverified' }
    }

    return {
      status: (data.verification_status as VerificationStatus) || 'unverified',
      reason: data.verification_reason,
    }
  } catch (err) {
    logSafeEvent({
      module: 'kyc',
      action: 'fetch_status_exception',
      level: 'warn',
      code: sanitizeErrorReason(err),
    })
    return { status: 'unverified' }
  }
}

export async function uploadKycDocument(
  userId: string,
  file: File,
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  try {
    const fileExt = file.name.split('.').pop() || 'jpg'
    const filePath = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('kyc_documents')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      logSafeEvent({
        module: 'kyc',
        action: 'upload_document_storage',
        level: 'error',
        code: sanitizeErrorReason(uploadError),
      })
      return { success: false, error: 'No se pudo subir la foto del documento.' }
    }

    const { data: publicUrlData } = supabase.storage
      .from('kyc_documents')
      .getPublicUrl(filePath)

    return { success: true, publicUrl: publicUrlData.publicUrl }
  } catch (err) {
    logSafeEvent({
      module: 'kyc',
      action: 'upload_document_exception',
      level: 'error',
      code: sanitizeErrorReason(err),
    })
    return { success: false, error: 'Error al procesar el archivo.' }
  }
}
