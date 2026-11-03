import { describe, expect, it } from 'vitest'
import { detectAgentApplicationDocumentMime, inspectAgentApplicationDocument } from './agent-applications'

describe('agent application document inspection', () => {
  it('detects PDF from its signature instead of the client MIME type', () => {
    expect(detectAgentApplicationDocumentMime(new TextEncoder().encode('%PDF-1.7\n'))).toBe('application/pdf')
  })

  it('detects JPEG and PNG signatures', () => {
    expect(detectAgentApplicationDocumentMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe('image/jpeg')
    expect(detectAgentApplicationDocumentMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('image/png')
  })

  it('rejects truncated or unsupported bytes even if the browser claimed a supported type', () => {
    expect(detectAgentApplicationDocumentMime(new Uint8Array([0xff, 0xd8]))).toBeNull()
    expect(detectAgentApplicationDocumentMime(new TextEncoder().encode('<svg></svg>'))).toBeNull()
    expect(detectAgentApplicationDocumentMime(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBeNull()
  })

  it('enforces the per-file byte limit before upload', () => {
    expect(inspectAgentApplicationDocument(new Uint8Array(0))).toMatchObject({ ok: false, reason: 'empty' })
    const maximumPdf = new Uint8Array(10 * 1024 * 1024)
    maximumPdf.set(new TextEncoder().encode('%PDF-1.7'))
    expect(inspectAgentApplicationDocument(maximumPdf)).toMatchObject({ ok: true, mime: 'application/pdf', extension: 'pdf' })
    expect(inspectAgentApplicationDocument(new Uint8Array(10 * 1024 * 1024 + 1))).toMatchObject({ ok: false, reason: 'too_large' })
    expect(inspectAgentApplicationDocument(new TextEncoder().encode('%PDF-1.7'))).toMatchObject({ ok: true, mime: 'application/pdf', extension: 'pdf' })
  })
})
