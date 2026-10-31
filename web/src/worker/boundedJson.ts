export type BoundedJsonResult<T extends object> =
  | { ok: true; value: T }
  | { ok: false; status: 400 | 408 | 413 }

export type BoundedTextResult =
  | { ok: true; value: string }
  | { ok: false; status: 400 | 408 | 413 }

export type BoundedBytesResult =
  | { ok: true; value: Uint8Array }
  | { ok: false; status: 400 | 408 | 413 }

const DEFAULT_BODY_READ_TIMEOUT_MS = 30_000
const BODY_READ_TIMEOUT = Symbol('body-read-timeout')

async function readBeforeDeadline(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  deadline: number,
): Promise<Awaited<ReturnType<ReadableStreamDefaultReader<Uint8Array>['read']>>> {
  const remainingMs = deadline - Date.now()
  if (remainingMs <= 0) throw BODY_READ_TIMEOUT

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      reader.read(),
      new Promise<never>((_resolve, reject) => {
        timeoutId = setTimeout(() => reject(BODY_READ_TIMEOUT), remainingMs)
      }),
    ])
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
  }
}

/** Read a request body while retaining no more than maxBytes in Worker memory. */
export async function readBoundedBytes(
  request: Request,
  maxBytes: number,
  timeoutMs = DEFAULT_BODY_READ_TIMEOUT_MS,
): Promise<BoundedBytesResult> {
  return readBoundedStreamBytes(request.body, request.headers.get('content-length'), maxBytes, timeoutMs)
}

/** Read a response/request stream under a strict byte budget. */
export async function readBoundedStreamBytes(
  stream: ReadableStream<Uint8Array> | null,
  declaredLength: string | null,
  maxBytes: number,
  timeoutMs = DEFAULT_BODY_READ_TIMEOUT_MS,
): Promise<BoundedBytesResult> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return { ok: false, status: 400 }
  }

  if (declaredLength !== null) {
    if (!/^\d+$/.test(declaredLength)) {
      void stream?.cancel().catch(() => undefined)
      return { ok: false, status: 400 }
    }
    if (Number(declaredLength) > maxBytes) {
      void stream?.cancel().catch(() => undefined)
      return { ok: false, status: 413 }
    }
  }

  const reader = stream?.getReader()
  if (!reader) return { ok: false, status: 400 }

  const chunks: Uint8Array[] = []
  let totalBytes = 0
  const deadline = Date.now() + timeoutMs
  try {
    while (true) {
      const { done, value } = await readBeforeDeadline(reader, deadline)
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > maxBytes) {
        void reader.cancel().catch(() => undefined)
        return { ok: false, status: 413 }
      }
      chunks.push(value)
    }
  } catch (error) {
    if (error === BODY_READ_TIMEOUT) {
      // A client's cancellation hook must not extend the timeout response.
      void reader.cancel().catch(() => undefined)
      return { ok: false, status: 408 }
    }
    return { ok: false, status: 400 }
  } finally {
    try {
      reader.releaseLock()
    } catch {
      // A pending read may still be settling after cancellation.
    }
  }

  const body = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }

  return { ok: true, value: body }
}

export async function readBoundedText(
  request: Request,
  maxBytes: number,
  timeoutMs = DEFAULT_BODY_READ_TIMEOUT_MS,
): Promise<BoundedTextResult> {
  const bytes = await readBoundedBytes(request, maxBytes, timeoutMs)
  if (!bytes.ok) return bytes
  try {
    return { ok: true, value: new TextDecoder('utf-8', { fatal: true }).decode(bytes.value) }
  } catch {
    return { ok: false, status: 400 }
  }
}

/** Read and parse a JSON object without buffering more than maxBytes. */
export async function readBoundedJsonObject<T extends object = Record<string, unknown>>(
  request: Request,
  maxBytes: number,
  timeoutMs = DEFAULT_BODY_READ_TIMEOUT_MS,
): Promise<BoundedJsonResult<T>> {
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return { ok: false, status: 400 }
  }

  const body = await readBoundedText(request, maxBytes, timeoutMs)
  if (!body.ok) return body

  try {
    const parsed: unknown = JSON.parse(body.value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, status: 400 }
    return { ok: true, value: parsed as T }
  } catch {
    return { ok: false, status: 400 }
  }
}
