# Agent attribution domain

Owns session capture and clearing of validated agent codes, forwarding the code
from the public contact form to the protected Worker, and reading attributed
contacts for the agent dashboard. The Worker validates the format and trusted
database RPC resolves active/verified ownership and rejects self-referral.

The visitor code is cleared only after a contact has been saved successfully.
The repository does not resolve agent IDs or decide credit in the browser.
RLS restricts contact reads to the property owner, attributed verified agent,
or AAL2 administrator.

Local tests cover URL/session behavior, Worker payload validation, contact
query ownership filters, and safe errors. DEV end-to-end remains a separate
verification step.
