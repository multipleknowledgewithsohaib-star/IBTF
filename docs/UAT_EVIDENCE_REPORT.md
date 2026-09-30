# Standalone UAT evidence report

## Purpose

`/uat` creates a frozen, server-generated evidence record from the standalone UAT database. It lets Finance and IT see which agreed scenarios were actually exercised, what the system observed, and whether any contradiction exists. The operator supplies only the standalone server label and the exact deployed Git commit; the server calculates every status.

## Result rules

- **PASS** — required operational evidence exists and no contradictory record is found.
- **FAIL** — evidence contradicts a mandatory control, such as a self-approved batch, a zero-fee case in a batch, or an incomplete Oracle AP snapshot.
- **NOT EXECUTED** — the standalone database contains no evidence that the scenario was exercised. Missing evidence never becomes PASS.
- **BLOCKED** — reserved for a scenario whose prerequisite is explicitly blocked; current automatic checks normally report NOT EXECUTED until data exists.

The overall result is FAIL if any scenario fails, otherwise BLOCKED if any scenario is blocked, otherwise NOT EXECUTED while any scenario is unexercised, and PASS only when every scenario passes.

## Operation

1. Deploy the intended commit and apply all migrations to the standalone UAT database.
2. Exercise the agreed synthetic/non-sensitive scenarios through the application.
3. A user with `uat:execute` enters the server label and deployed commit at `/uat` and selects **Generate run**.
4. Review the immutable result page. Download CSV/JSON or use **Print / Save PDF** for a management copy.
5. Correct failures through normal controlled workflows and generate a new run. Prior runs remain immutable and cannot be deleted.

The report masks beneficiary account evidence, stores aggregate counts rather than applicant values, records the generating user, and adds a correlated audit event. It does not accept a manually selected PASS/FAIL value.

## Boundary

This report verifies only application evidence present on the standalone server. It does not test enterprise SSO, network/firewall design, secrets management, encrypted backup/restore, monitoring, disaster recovery, malware controls, production sizing, live bank connectivity, direct payment initiation, Oracle posting, or organizational go-live approval. Those remain IT/Finance acceptance gates. A PASS result is not a production authorization or final handover.
