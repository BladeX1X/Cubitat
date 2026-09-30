export function getErrorMessage(_error: unknown, fallback: string): string {
  // Backend messages can contain implementation details; admin panels expose only a safe fallback.
  return fallback
}
