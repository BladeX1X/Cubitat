const MAX_ATTEMPTS = 3

export async function retryImageHashOperation<T>(
  operation: () => Promise<T>,
  sleep: (milliseconds: number) => Promise<void> = milliseconds =>
    new Promise(resolve => setTimeout(resolve, milliseconds)),
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) throw error
      await sleep(attempt * 250)
    }
  }

  throw new Error('Image hash retry loop ended unexpectedly.')
}
