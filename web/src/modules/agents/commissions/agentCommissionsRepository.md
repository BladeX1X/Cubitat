# Agent commissions domain

Owns commission calculations, status transitions, and the append-only event
stream. Its only upstream business dependency is a converted `lead_id`; the
database validates conversion and calculates the amount using the stored rate.

Agents only read their own commission rows through RLS. Creation, approval,
payment-reference recording, and voiding use server RPCs. This domain does not
process money or alter lead status.

Local tests verify RPC contracts. PostgreSQL ephemeral checks cover calculation,
transition rules, required payment reference, and AAL2-only administration.
