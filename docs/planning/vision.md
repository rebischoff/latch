# Vision

> **Latch** — see [`naming.md`](./naming.md).

## One-line pitch

A **reusable library set** for building Next.js + Postgres business apps where **data access control**, **validation**, and **UI rendering** all derive from one server-resolved permission manifest — so the frontend and backend can never disagree about what a user is allowed to see or do.

## Problem

Business apps need more than CRUD:

- **Who can see which Fields** of a record?
- **Which changes need approval** before going live?
- **What's the complete audit trail** of who changed what?
- **How does the UI stay in sync** with the same rules the API enforces?

Frameworks rarely express these as first-class concepts. Teams reinvent them per app, inconsistently, and the frontend almost always drifts from the backend.

## What we're building

Three things, in order of importance:

1. **A DAL kernel** (`@<project>/dal`) that is the only application path to business data. Accepts a `PermissionContext`, narrows reads to allowed Fields and rows, rejects writes to disallowed ones.
2. **A permission-sync layer** so the same manifest the DAL enforces is what the UI renders from. No "show-hide CSS" pretending to be security; no unauthorized data on the wire.
3. **Conventions and codegen** so a new Surface is YAML + a small amount of business logic, not a hand-wired stack of three places to update.

Built-in behaviors (audit, soft delete, approval) are bundled because they're the same shape in every business app and are constantly rebuilt.

## What we're not building (v1)

- A no-code form builder.
- An IAM/SSO product (we integrate with whatever auth you bring).
- A workflow engine (approval is intentionally narrow: all-or-nothing pending changes).
- A multi-tenant shared-schema product (each company gets its own database).
- A policy DSL.
- An admin UI as a separate product. (The pilot trades-CRM sample app *is* the admin UI for v1.)

See [`scope.md`](./scope.md) for the full in/out list.

## Pilot vertical

**Service-trades businesses** (construction, electrical, HVAC, plumbing): CRM, jobs, scheduling, time-and-attendance, estimation, inventory, project management. The platform stays generic; the sample app speaks trades vocabulary because it has to live somewhere real.

Why this vertical: it naturally exercises every concept (Field-level perms for financials, row-level for tech assignments, multi-table Surfaces, approvals for change orders, bulk operations on jobs, audit for insurance disputes). See [`use-cases.md`](./use-cases.md).

## Success criteria for v1

1. **Three Surfaces** (`job_detail`, `job_list`, `customer_detail`) work end-to-end with Field-level perms, row-level perms, bulk update, audit, and one approval flow.
2. **One DAL contract** is the only path to business data; tested.
3. **One manifest shape** drives DAL, Zod, and UI rendering; tested for drift.
4. **A new Surface** can be added by writing YAML + business logic only — no boilerplate per Field.
5. **Threat model tests** (T1, T2, T3, T5, T6, T11, T13, T15) pass in CI.
6. **Local dev:** `npm install && docker compose up && npm run dev` works in under a minute on a clean clone.

## Audience

- **You** (solo dev) building internal apps for service-trades businesses.
- **Future "future-you"** maintaining and extending this without re-learning what each piece is for.
- **Eventually (post-v1):** other devs building governed business apps on Next.js, if the abstractions hold up.

## Related

- [`scope.md`](./scope.md)
- [`use-cases.md`](./use-cases.md)
- [`architecture/overview.md`](./architecture/overview.md)
- [`naming.md`](./naming.md)
