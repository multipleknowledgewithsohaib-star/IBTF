# Stage 6 production readiness and go/no-go checklists

Every item requires date, named owner, evidence link and independent verifier in the controlled change record. An unchecked mandatory item means **No-Go**; this document is a template and is not itself approval.

## Finance production readiness

- [ ] Production identities are individually provisioned, active-role lists are Finance-approved, leavers are disabled, and read-only access is tested.
- [ ] Operations Uploader, Finance Maker, Finance Checker, Business Decision Approver, Treasury Uploader, Audit and Administrator duties are separated; no user can approve their own batch or high-impact exception.
- [ ] Embassy/VAC, effective beneficiary, fee, tolerance, mappings and repeat-window masters are independently approved and sampled. No bank-login credential is stored.
- [ ] Approved operational file formats, naming, secure transfer, hash duplicate blocking, size/type/malware controls, rejection ownership and original-evidence retention are exercised with non-sensitive production-like files.
- [ ] Eligible totals, booking-date breakup, maker submission, checker return/approval, dispatch and locked financial snapshots are witnessed end to end.
- [ ] SCB parsing, unmatched/duplicate/partial/zero/variance exceptions, confirmed amount, manual resolution evidence and Processed Successfully gate reconcile exactly in integer paisa.
- [ ] Exception ageing, halt/allow decisions, tolerance/override authorization and reversal procedures have named owners and cannot silently clear exceptions.
- [ ] Audit events cover upload, decisions, approval, matching, override/reversal, generation and status changes; actor, UTC time, before/after, reason and correlation chain are exportable to authorized Audit users.
- [ ] Backup retention and access are approved; an isolated restore passed integrity, control-total, processed-lock and audit-continuity verification with actual RPO/RTO recorded.
- [ ] Finance user acceptance and report/confirmation format acceptance are signed; open limitations and Stage 7 boundary are accepted.

## IT go/no-go

- [ ] Protected branch/review rules and required Stage 6 CI checks pass for the exact commit; both production and development audits executed, their complete results are retained, and every fixable critical/high finding is resolved. Unresolved critical/high **production** findings are always No-Go.
- [ ] The frozen lockfile reproduces, every registry package has verified sha512 integrity, registry signatures pass, and the complete direct/transitive tree is retained. IT has either enabled Dependency graph / Advanced Security and required GitHub dependency review, or recorded that repository prerequisite as an open No-Go item.
- [ ] Production configuration was independently compared with the safe template; bindings/secrets use the approved platform store and sensitive-data scan evidence is retained.
- [ ] Immutable artifact provenance, least-privilege deployment identity, capacity, TLS, identity/session controls, centralized redacted logging and alerts are verified.
- [ ] Liveness and readiness probes, dashboards, paging, service directory contacts, severity model, maintenance/rollback decision authority and vendor escalation are tested.
- [ ] Forward migration rehearsal, pre-change backup, schema-compatible application rollback and full recovery drill passed in a production-like environment.
- [ ] Security review covers upload threat controls, dependency provenance, access/log retention and incident evidence handling.
- [ ] No direct payment initiation, GL posting, live-data migration or unapproved integration is enabled.

## Final decision

- [ ] IT release owner: **GO / NO-GO**, signature/time/evidence.
- [ ] Finance system owner: **GO / NO-GO**, signature/time/evidence.
- [ ] Information Security: **GO / NO-GO**, signature/time/evidence.
- [ ] Business acceptance owner: **GO / NO-GO**, signature/time/evidence.

Any No-Go stops deployment. Conditional approval must identify the time-bounded risk acceptance owner and compensating control; it cannot waive segregation, reconciliation, audit, backup verification or sensitive-data requirements.
