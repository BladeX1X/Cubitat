import { supabase } from '../../shared/lib/supabaseClient'
import { logSafeEvent } from '../../shared/lib/logger'
import { sanitizeErrorReason } from '../../shared/lib/logger'
import type { VerificationStatus } from './types'

export async function submitKycRequest(
  documentType: 'identity_card' | 'passport',
  documentPath: string,
  selfiePath: string,
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('submit_kyc_request', {
      p_document_type: documentType,
      p_document_path: documentPath,
      p_selfie_path: selfiePath,
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

export async function uploadKycImage(
  userId: string,
  file: File,
  evidenceType: 'document' | 'selfie',
): Promise<{ success: boolean; documentPath?: string; error?: string }> {
  try {
    const extensionByMime: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    }
    const fileExtension = extensionByMime[file.type]
    if (!fileExtension || file.size > 10 * 1024 * 1024) {
      return { success: false, error: 'Selecciona una imagen JPG, PNG o WebP de hasta 10 MB.' }
    }

    const filePath = `${userId}/${evidenceType}-${crypto.randomUUID()}.${fileExtension}`

    const { error: uploadError } = await supabase.storage
      .from('kyc_documents')
      .upload(filePath, file, { upsert: false, contentType: file.type })

    if (uploadError) {
      logSafeEvent({
        module: 'kyc',
        action: 'upload_document_storage',
        level: 'error',
        code: sanitizeErrorReason(uploadError),
      })
      return { success: false, error: 'No se pudo subir la evidencia de identidad.' }
    }

    return { success: true, documentPath: filePath }
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

export async function removeKycDocument(documentPath: string): Promise<void> {
  try {
    const { error } = await supabase.storage.from('kyc_documents').remove([documentPath])
    if (error) {
      logSafeEvent({
        module: 'kyc',
        action: 'remove_orphan_document',
        level: 'warn',
        code: sanitizeErrorReason(error),
      })
    }
  } catch (err) {
    logSafeEvent({
      module: 'kyc',
      action: 'remove_orphan_document_exception',
      level: 'warn',
      code: sanitizeErrorReason(err),
    })
  }
}
