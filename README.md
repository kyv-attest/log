# kyv-attest transparency log

Append-only transparency log for kyv-attest attestations
(spec + reference implementation: https://github.com/kyv-attest/kyv).

- One commit per day: `roots/YYYY-MM-DD.json` — the day's Merkle root over all attestations
  issued or renewed that day, plus its OpenTimestamps receipt (`.ots`).
- Nothing else is ever committed. History is never rewritten; force-push is disabled.
- Verify offline: check an attestation's `log_inclusion` proof against the day's root, then
  the root's `.ots` receipt against Bitcoin.
- **Absence NEVER means negative** — absence is non-adoption, not a signal.
- Written by GitHub Actions using this repository's own `GITHUB_TOKEN` — no external
  credentials exist. Until the source endpoint is live, the daily job exits quietly.
- A missed day is a visible `continuity` gap by design (spec §6).
