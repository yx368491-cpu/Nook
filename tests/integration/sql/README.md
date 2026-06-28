# tests/integration/sql · Static mirrors of SQL CHECK constraints

> Per `docs/03_Engineering/AI_HANDOVER` § **S29.0** (Docker permanently
> retired), Nook verifies SQL invariants **statically** on this dev
> machine. Any CHECK constraint (or trigger, or RPC contract) defined
> exclusively in `supabase/migrations/*.sql` — and therefore unreachable
> to a live PostgreSQL — is mirrored here as a typed TypeScript function,
> then asserted from a vitest test suite.

## Convention

Each subdirectory corresponds to one CHECK (or set of related CHECKs):

- **Mirror file** — `*.ts` exporting a typed pure function with the
  same branch structure as the SQL.
- **Test file** — `*.test.ts` covering all combinations the SQL CHECK
  accepts, plus a defensive pass over the rejection paths so future
  drift between SQL and TS gets caught.

When the source SQL changes, the mirror MUST be updated in lockstep —
the two must agree branch-for-branch.

## Scope of mirrors

Currently mirrored:

| File | Source migration | Branch summary |
|---|---|---|
| `check-constraints/messagesKindPayloadChk.ts` | `20260628000011_relax_kind_payload_chk_for_recall.sql` | A (text normal) · B (system immutable) · C (image/file normal) · D (soft-recalled, killed for system) |

Out of scope (separate invariants enforced by other mechanisms):

- Body length 1..4000 char_length — separate constraint on `messages`.
- RLS policies — verified by integration tests against cloud staging
  only; not local-mirrored.
- Trigger functions (T-01/T-02/T-03) — driven by real-time data flow,
  unit-coverage elsewhere.

## Run

```
npm run test:integration
```

or equivalently:

```
npx vitest run --config tests/integration/vitest.config.ts
```

The integration suite is intentionally separate from `npm test` —
the root `vitest.config.ts` only picks up `src/**/*.test.*` and
`tests/unit/**` so hooks/unit tests stay fast.
