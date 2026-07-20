type PublicContactInput = {
  turnstileToken: string
  propertyId: string
  contactName: string
  contactPhone: string
  message: string
}

type PublicReportInput = {
  turnstileToken: string
  propertyId: string
  reason: string
  description: string
  accessToken?: string
}

async function postProtectedForm(
  path: '/api/public/contact' | '/api/public/report',
  body: Record<string, unknown>,
  accessToken?: string,
): Promise<void> {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const response = await fetch(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Protected form submission failed with status ${response.status}.`)
  }
}

export function submitPublicContact(input: PublicContactInput): Promise<void> {
  return postProtectedForm('/api/public/contact', {
    turnstile_token: input.turnstileToken,
    property_id: input.propertyId,
    contact_name: input.contactName,
    contact_phone: input.contactPhone,
    message: input.message,
  })
}

export function submitPublicReport(input: PublicReportInput): Promise<void> {
  return postProtectedForm('/api/public/report', {
    turnstile_token: input.turnstileToken,
    property_id: input.propertyId,
    reason: input.reason,
    description: input.description,
  }, input.accessToken)
}
