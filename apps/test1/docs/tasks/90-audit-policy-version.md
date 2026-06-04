# 90 — Audit and policyVersion

> **Status:** Planning stub — not scheduled. Expand when task **23** is complete.

## Goal

Harden IAM and grant mutations: audit append-only rows, `bumpPolicyVersion` on role/grant/assignment changes, manifest cache invalidation.

## Delivers

- Audit on IAM DAL mutations
- `getPrincipal().policyVersion` from DB
- Threat-style test: role change → nav/manifest updates on next request

## Reference

- [`apps/crm/src/lib/iam/policy-version.ts`](../../../crm/src/lib/iam/policy-version.ts)
- Phase 06 decisions: [`docs/phases/06-performance-safety/decisions.md`](../../../../docs/phases/06-performance-safety/decisions.md)

## Prerequisites

- Task **23** complete.
