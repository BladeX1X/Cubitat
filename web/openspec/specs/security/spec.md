# Local development security

## Purpose

Keep the Vite development server scoped to the developer's machine and reject
requests that carry an untrusted Host header.

## Requirements

### Requirement: Vite binds to loopback and validates Host by default

The Vite development server MUST bind to `127.0.0.1` by default. Its Host
allowlist MUST contain only local names needed for ordinary development, such
as `localhost` and `127.0.0.1`. Additional hosts MAY be admitted only when
explicitly listed as exact DNS names in `CUBITAT_DEV_ADDITIONAL_ALLOWED_HOSTS`.
Wildcards, URLs and malformed names MUST be ignored. The server MUST NOT disable
validation with `allowedHosts: true` or honor Vite's ambient
`__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` escape hatch.

#### Scenario: Ordinary local development

- GIVEN the developer starts the documented `npm run dev` command
- WHEN Vite listens for requests
- THEN its default bind address is loopback
- AND requests with `Host: localhost` or `Host: 127.0.0.1` are served
- AND a request with an unrelated Host such as `attacker.example` is rejected
  before Vite serves project content.

#### Scenario: Explicit temporary tunnel hostname

- GIVEN an exact tunnel hostname is configured in `CUBITAT_DEV_ADDITIONAL_ALLOWED_HOSTS`
- WHEN Vite receives a request for that hostname
- THEN the request is served
- AND wildcards and unrelated hostnames are rejected.

### Requirement: E2E tests isolate network destinations

The Playwright suite MUST use a loopback application URL by default and MUST
NOT fall back to a hosted Supabase project. A hosted destination MUST require an
explicit `CUBITAT_E2E_ALLOW_CLOUD=true` opt-in, HTTPS, and explicit app and
Supabase targets in the same local-or-hosted scope. Security probes that test authorization boundaries MUST
remain restricted to loopback regardless of that opt-in. Tests that create or
delete business data MUST reject non-loopback app or Supabase destinations
before issuing requests.

#### Scenario: Default test run

- GIVEN no E2E destination overrides are configured
- WHEN Playwright loads its configuration
- THEN the app target is `127.0.0.1`
- AND the Supabase target used by security probes defaults to `127.0.0.1`
- AND no request is made to a hosted Cubitat service.

#### Scenario: Accidental hosted target

- GIVEN an E2E destination points to a hosted service
- AND `CUBITAT_E2E_ALLOW_CLOUD` is not explicitly `true`
- WHEN Playwright loads its configuration
- THEN it fails before running tests or issuing network requests.

#### Scenario: Mutation test points to hosted service

- GIVEN a test can create or delete business data
- WHEN either its app or Supabase target is not loopback
- THEN the test fails before its first request.
