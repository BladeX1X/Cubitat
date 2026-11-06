export function resolvePhase4Flags({ phase4Production, phase2DevBuild, env }) {
  return {
    svc: phase4Production || (phase2DevBuild && env.VITE_PHASE4_SVC_ENABLED === 'true'),
    rev: phase4Production || (phase2DevBuild && env.VITE_PHASE4_REV_ENABLED === 'true'),
    mat: phase4Production || (phase2DevBuild && env.VITE_PHASE4_MAT_ENABLED === 'true'),
    biz: phase4Production || (phase2DevBuild && env.VITE_PHASE4_BIZ_ENABLED === 'true'),
    // Valuation remains a future feature; it is only available in an explicitly opted-in DEV build.
    val: !phase4Production && phase2DevBuild && env.VITE_PHASE4_VAL_ENABLED === 'true',
  }
}
