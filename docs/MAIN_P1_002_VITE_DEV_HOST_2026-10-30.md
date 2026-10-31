# MAIN-P1-002 — Vite development Host validation

Date: 2026-10-30
Baseline: `origin/main` at `5b0516b76f6b941c0ad35eee1ee59a316546b501`
Status: fixed and verified on an isolated branch; not yet integrated into `main`.

## Finding

The audited baseline bound Vite to all interfaces and accepted arbitrary Host
headers. A loopback request with `Host: attacker.example` received the app
entrypoint. The issue is confined to the local development server; it does not
change the production Worker.

## Change

- `npm run dev` and Vite bind to `127.0.0.1`.
- The default Host allowlist is `localhost` and `127.0.0.1`.
- A developer may add exact DNS names through
  `CUBITAT_DEV_ADDITIONAL_ALLOWED_HOSTS`; malformed names, URLs and wildcards
  are ignored.
- Vite's ambient `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` escape hatch is
  cleared so a shell variable cannot silently widen the allowlist.
- The operational guide now documents an email-restricted Quick Tunnel,
  synthetic data, exact-host setup, and stopping both processes afterwards.
- OpenSpec requirement and unit/runtime regression tests were added.

## Evidence

- Runtime HTTP regression: `localhost` → 200, exact configured host → 200,
  unrelated host (including one supplied through Vite's ambient override) → 403.
- Host parser tests: 3/3 pass.
- Runtime boundary test: 1/1 pass.
- `npm run lint`: pass.
- `npm run test:run`: pass on first and final complete runs; 667 passed, 1
  skipped. An intervening run had one intermittent timeout in the unrelated
  `AdminPage.test.tsx`; the isolated test then passed 8/8.
- `SITEMAP_MODE=static npm run build`: pass; all existing bundle guards pass.
- Existing MapLibre chunk-size and PWA inline-dynamic-import warnings remain.

## Release boundary

This only hardens the developer workstation. No Worker/UI deployment, database
write, or production change was made. Integrate through review into `main`; the
private GitHub repository currently cannot enforce branch protection under its
plan, so the merge gate remains a process control. Quick Tunnels are public
URLs; Cloudflare documents `--allowed-mail` as an optional one-time-PIN gate.
Reference: [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).
