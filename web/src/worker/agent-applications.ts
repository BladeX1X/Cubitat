export type AgentApplicationDocumentMime = 'application/pdf' | 'image/jpeg' | 'image/png'
export const MAX_AGENT_APPLICATION_DOCUMENT_BYTES = 10 * 1024 * 1024

export type AgentApplicationDocumentInspection =
  | { ok: true; mime: AgentApplicationDocumentMime; extension: 'pdf' | 'jpg' | 'png' }
  | { ok: false; reason: 'empty' | 'too_large' | 'unsupported' }

const DOCUMENT_SIGNATURES: ReadonlyArray<{
  mime: AgentApplicationDocumentMime
  matches: (bytes: Uint8Array) => boolean
}> = [
  { mime: 'application/pdf', matches: (bytes) => startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]) },
  { mime: 'image/jpeg', matches: (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]) },
  { mime: 'image/png', matches: (bytes) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
]

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return bytes.byteLength >= signature.length && signature.every((byte, index) => bytes[index] === byte)
}

/** Identifies accepted application documents from their bytes, never from client-supplied MIME metadata. */
export function detectAgentApplicationDocumentMime(bytes: Uint8Array): AgentApplicationDocumentMime | null {
  return DOCUMENT_SIGNATURES.find(({ matches }) => matches(bytes))?.mime ?? null
}

/** Validates the upload size and derives its accepted format from its actual bytes. */
export function inspectAgentApplicationDocument(bytes: Uint8Array): AgentApplicationDocumentInspection {
  if (bytes.byteLength === 0) return { ok: false, reason: 'empty' }
  if (bytes.byteLength > MAX_AGENT_APPLICATION_DOCUMENT_BYTES) return { ok: false, reason: 'too_large' }

  const mime = detectAgentApplicationDocumentMime(bytes)
  if (!mime) return { ok: false, reason: 'unsupported' }

  const extension = mime === 'application/pdf' ? 'pdf' : mime === 'image/jpeg' ? 'jpg' : 'png'
  return { ok: true, mime, extension }
}
