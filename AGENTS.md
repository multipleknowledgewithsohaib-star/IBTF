# Repository Instructions

This repository contains the Operational IBFT Web System for INTIANA (Pvt) Ltd Finance.

## Source of truth

Read `docs/IBFT_SYSTEM_REQUIREMENTS.md` completely before planning or changing code. Treat its business rules and non-negotiable expectations as binding. When a detail is genuinely missing, document the assumption explicitly and choose the safer auditable behavior.

## Engineering expectations

- Work in coherent stages; do not attempt to fake the entire product with static screens.
- Begin with Stage 1 unless the task explicitly names another stage.
- Keep the application runnable after every task.
- Use current stable, supported dependencies.
- Use TypeScript strict mode.
- Put financial calculations, eligibility rules, permissions, and status transitions on the server.
- Use database constraints and transactions for financial integrity and idempotent imports.
- Preserve audit history; do not hard-delete operational or financial records.
- Never commit secrets, credentials, real applicant data, or bank-login information.
- Add automated checks for implemented controls.
- Run formatting, linting, type checks, and relevant automated checks before completion.
- Update README and architecture documentation whenever setup or design changes.
- Summarize what is implemented, what was verified, and what remains.

## Initial architecture preference

Unless repository constraints require otherwise, use a maintainable TypeScript stack with:

- Next.js using the App Router.
- PostgreSQL.
- Prisma ORM and migrations.
- A server-side authorization layer.
- Docker Compose for local infrastructure.
- A seeded, non-sensitive demonstration environment.

If a different stack is materially better, explain the reason in the task summary before adopting it.
