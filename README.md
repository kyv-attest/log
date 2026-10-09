# kyv-attest transparency log

Append-only transparency log for kyv-attest attestations
(spec + reference implementation: https://github.com/kyv-attest/kyv).

- One commit per day: `roots/YYYY-MM-DD.json` — the day's Merkle root over all attestations
  issued or renewed that day, plus its OpenTimestamps receipt (`.ots`).
- Nothing else is ever committed. History is never rewritten; force-push is disabled.
- Verify offline: check an attestation's `log_inclusion` proof against the day's root, then
  the root's `.ots` receipt with `ots verify`.
- **What the receipts currently prove.** A receipt starts as a *calendar commitment*: four
  OpenTimestamps calendars have undertaken to fold the root into Bitcoin. It becomes a Bitcoin
  proof only once it is **upgraded** to carry the block attestation. The first ten receipts
  here (2026-09-30 to 2026-10-09) were stamped and never upgraded, so they are all still
  pending, and `ots verify` will say so. The daily job now runs `ots upgrade` over every
  receipt and prints a `bitcoin` / `pending` line per file, so this is auditable from the job
  log. Do not describe these roots as Bitcoin-anchored until `ots info` shows a
  `BitcoinBlockHeaderAttestation`.
- **Absence NEVER means negative** — absence is non-adoption, not a signal.
- Written by GitHub Actions using this repository's own `GITHUB_TOKEN` — no external
  credentials exist. Until the source endpoint is live, the daily job exits quietly.
- A missed day is a visible `continuity` gap by design (spec §6).
