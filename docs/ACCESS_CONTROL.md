# User provisioning and access-control administration

## Purpose

This stage converts the existing role checks into a controlled user-administration process. It does not create real employees, configure enterprise SSO, deploy the application, or authorize production use.

## Roles

| Role | Controlled responsibility |
| --- | --- |
| OPERATIONS_UPLOADER | Upload operational evidence and review validation |
| FINANCE_MAKER | Create payment batches and propose reconciliation resolutions |
| FINANCE_CHECKER | Independently approve batches and high-impact reconciliation actions |
| BUSINESS_DECISION_APPROVER | Record reasoned allow/halt decisions |
| TREASURY_UPLOADER | Dispatch approved batches and upload bank evidence |
| MANAGEMENT_AUDIT | Read-only management, reconciliation and audit visibility |
| SYSTEM_ADMIN | User access and controlled master administration only |

Finance Maker and Finance Checker cannot be assigned to the same user. System Administrator cannot hold an operational role.

## Controlled sequence

1. IT confirms the exact authenticated identity subject and corporate email.
2. An independent System Administrator creates the account in **inactive** state, selects formally approved roles, and records the approval reference or reason.
3. A separate activation action enables access after Finance/management approval is evidenced.
4. Role replacement, activation, and deactivation require a reason of at least ten characters.
5. Administrators cannot change their own roles or deactivate themselves. The last active System Administrator is protected.
6. Every change writes an immutable access-history row and a correlated audit event. Users are deactivated rather than deleted.

## Boundaries retained for IT

Enterprise identity/SSO configuration, password and MFA policy, session timeout, joiner/mover/leaver feeds, infrastructure, secrets, backup, monitoring, security review and production deployment remain IT responsibilities. No production user should be activated until Finance acceptance and IT/security approval are documented.
