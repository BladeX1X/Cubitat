export type PwnedPasswordResult =
  | { status: 'safe' }
  | { status: 'pwned'; occurrences: number }
  | { status: 'unavailable' }

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const PWNED_PASSWORDS_RANGE_URL = 'https://api.pwnedpasswords.com/range/'
const PWNED_PASSWORDS_USER_AGENT = 'Cubitat-Password-Security/1.0 (+https://cubitathome.com)'

async function sha1Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

export async function checkPwnedPassword(
  password: string,
  request: FetchLike = fetch,
): Promise<PwnedPasswordResult> {
  try {
    const hash = await sha1Hex(password)
    const prefix = hash.slice(0, 5)
    const suffix = hash.slice(5)
    const response = await request(`${PWNED_PASSWORDS_RANGE_URL}${prefix}`, {
      headers: {
        'Add-Padding': 'true',
        'User-Agent': PWNED_PASSWORDS_USER_AGENT,
      },
    })

    if (!response.ok) return { status: 'unavailable' }

    const match = (await response.text())
      .split(/\r?\n/)
      .map(line => line.split(':'))
      .find(([candidate, count]) => candidate === suffix && Number(count) > 0)

    if (!match) return { status: 'safe' }
    return { status: 'pwned', occurrences: Number(match[1]) }
  } catch {
    return { status: 'unavailable' }
  }
}

export function shouldCheckPwnedPassword(method: string, authPath: string): boolean {
  return (method === 'POST' && authPath === '/auth/v1/signup')
    || (method === 'PUT' && authPath === '/auth/v1/user')
}
