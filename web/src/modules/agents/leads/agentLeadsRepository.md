# Agent leads domain

Owns private property/client prospects, consented creation, status changes, and
the immutable lead event stream. `agent_leads` and `agent_lead_events` are read
through RLS; all writes go through `create_agent_lead()` and
`update_agent_lead_status()`.

Admin queue reads and review state changes use the same domain contract. This
module has no dependency on referral codes or commissions. Commission creation
may reference a lead ID, but conversion eligibility is checked by the database
in the commissions domain.

Local tests cover RPC payloads and safe errors; UI tests cover consent, filters,
history, and final-state review controls.

`create_agent_lead()` enforces a database-side rolling quota of 20 opportunities
per verified agent per 24 hours. A transaction advisory lock is acquired before
counting so concurrent direct RPC calls cannot overshoot the quota. The
repository maps the database quota error to a safe domain code so the panel can
show a specific retry message without exposing backend details. The threshold
is an initial operational limit and should be reviewed against actual agent
workflows before release.

Un agente no puede reabrir por RPC una oportunidad cerrada como `lost`. Solo un administrador con sesión AAL2 puede reabrirla como `contacted`, con motivo registrado en el historial append-only.