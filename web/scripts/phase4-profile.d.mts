export type Phase4ProfileInput = {
  phase4Production: boolean
  phase2DevBuild: boolean
  env: Record<string, string | undefined>
}

export type Phase4Flags = {
  svc: boolean
  rev: boolean
  mat: boolean
  biz: boolean
  val: boolean
}

export function resolvePhase4Flags(input: Phase4ProfileInput): Phase4Flags
