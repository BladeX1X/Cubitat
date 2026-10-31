import { describe, expect, it, vi } from 'vitest'
import { readBoundedBytes, readBoundedJsonObject } from './boundedJson'

describe('readBoundedJsonObject', () => {
  it('preserves arbitrary bytes for streamed Storage payload checks', async () => {
    const request = new Request('https://cubitat.local/storage/v1/object/property_images/test', {
      method: 'PUT',
      body: new Uint8Array([0xff, 0x00, 0x80]),
    })

    await expect(readBoundedBytes(request, 3)).resolves.toMatchObject({
      ok: true,
      value: new Uint8Array([0xff, 0x00, 0x80]),
    })
  })

  it('parses JSON objects when Content-Length is absent and the byte stream fits', async () => {
    const request = new Request('https://cubitat.local/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"first":'))
          controller.enqueue(new TextEncoder().encode('"Ada"}'))
          controller.close()
        },
      }),
    })

    await expect(readBoundedJsonObject(request, 64)).resolves.toEqual({
      ok: true,
      value: { first: 'Ada' },
    })
  })

  it('rejects an oversized declared body before reading the stream', async () => {
    const request = new Request('https://cubitat.local/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': '65' },
      body: '{}',
    })
    const getReader = vi.spyOn(request.body!, 'getReader')

    Object.defineProperty(request.headers, 'get', {
      value: (name: string) => name.toLowerCase() === 'content-length' ? '65' : new Headers({ 'Content-Type': 'application/json' }).get(name),
    })

    await expect(readBoundedJsonObject(request, 64)).resolves.toEqual({ ok: false, status: 413 })
    expect(getReader).not.toHaveBeenCalled()
  })

  it('cancels a streamed body as soon as accumulated bytes exceed the limit', async () => {
    const cancel = vi.fn()
    const request = new Request('https://cubitat.local/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array(65).fill(0x20))
        },
        cancel,
      }),
    })

    await expect(readBoundedJsonObject(request, 64)).resolves.toEqual({ ok: false, status: 413 })
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('enforces the streamed byte limit even when Content-Length is falsely small', async () => {
    const cancel = vi.fn()
    const request = new Request('https://cubitat.local/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array(65).fill(0x20))
        },
        cancel,
      }),
    })

    Object.defineProperty(request.headers, 'get', {
      value: (name: string) => name.toLowerCase() === 'content-length'
        ? '1'
        : new Headers({ 'Content-Type': 'application/json' }).get(name),
    })

    await expect(readBoundedJsonObject(request, 64)).resolves.toEqual({ ok: false, status: 413 })
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('cancels a body that stalls before reaching EOF', async () => {
    vi.useFakeTimers()
    const cancel = vi.fn()
    try {
      const request = new Request('https://cubitat.local/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: new ReadableStream<Uint8Array>({ cancel }),
      })
      const result = readBoundedJsonObject(request, 64, 25)

      await vi.advanceTimersByTimeAsync(25)

      await expect(result).resolves.toEqual({ ok: false, status: 408 })
      expect(cancel).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
  })

  it.each(['[]', 'null', '{invalid'])('rejects non-object or malformed JSON (%s)', async (body) => {
    const request = new Request('https://cubitat.local/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })

    await expect(readBoundedJsonObject(request, 64)).resolves.toEqual({ ok: false, status: 400 })
  })

  it('rejects non-JSON content types without consuming the body', async () => {
    const request = new Request('https://cubitat.local/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'not json',
    })
    const getReader = vi.spyOn(request.body!, 'getReader')

    await expect(readBoundedJsonObject(request, 64)).resolves.toEqual({ ok: false, status: 400 })
    expect(getReader).not.toHaveBeenCalled()
  })
})
