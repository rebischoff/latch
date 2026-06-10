"use client";

import { Collapse, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";

const { Title, Paragraph, Text } = Typography;

type ExportRow = {
  key: string;
  exportName: string;
  kind: string;
  purpose: string;
  signature: string;
};

const policyExports: ExportRow[] = [
  {
    key: "PolicyService",
    exportName: "PolicyService",
    kind: "class",
    purpose: "Resolves a server-side Manifest for a principal + surface scope.",
    signature:
      "new PolicyService(config?: PolicyServiceConfig)\nresolve(principal: Principal, scope: PolicyScope): Manifest",
  },
  {
    key: "definePolicyRegistry",
    exportName: "definePolicyRegistry",
    kind: "function",
    purpose: "Build a PolicyRegistry map from codegen SurfacePolicyDefinition entries.",
    signature:
      "definePolicyRegistry(...defs: SurfacePolicyDefinition[]): PolicyRegistry",
  },
  {
    key: "defineSurfacePolicy",
    exportName: "defineSurfacePolicy",
    kind: "function",
    purpose: "Declare one surface vocabulary entry for the registry.",
    signature: "defineSurfacePolicy(def: SurfacePolicyDefinition): SurfacePolicyDefinition",
  },
  {
    key: "RoleGrantProvider",
    exportName: "RoleGrantProvider",
    kind: "interface",
    purpose: "Sync grant lookup — grantsFor(roleIds, surfaceId) → RoleGrant[].",
    signature: "grantsFor(roleIds: string[], surfaceId: string): RoleGrant[]",
  },
  {
    key: "MemoryRoleGrantProvider",
    exportName: "MemoryRoleGrantProvider",
    kind: "class",
    purpose: "In-memory provider; spike preloads Postgres rows into this per request.",
    signature:
      "new MemoryRoleGrantProvider(bindings: MemoryRoleGrantBinding[])",
  },
  {
    key: "validateGrantTuple",
    exportName: "validateGrantTuple",
    kind: "function",
    purpose: "Write-time validation — grant must exist in codegen catalog (P6).",
    signature:
      "validateGrantTuple(tuple: GrantTuple, registry: PolicyRegistry): void",
  },
  {
    key: "unionGrants",
    exportName: "unionGrants",
    kind: "function",
    purpose: "Merge field grants across roles; optional denyWins stripping.",
    signature:
      "unionGrants(grants: FieldGrant[], options?: MergeOptions): Record<FieldId, FieldAction[]>",
  },
  {
    key: "mergeRowScope",
    exportName: "mergeRowScope",
    kind: "function",
    purpose: "Pick broadest row_scope when stacking roles (own < scope < all).",
    signature:
      'mergeRowScope(scopes: ("own" | "scope" | "all" | undefined)[]): "own" | "scope" | "all" | undefined',
  },
  {
    key: "unionSurfaceActions",
    exportName: "unionSurfaceActions",
    kind: "function",
    purpose: "Union surface-level actions across role policies.",
    signature: "unionSurfaceActions(lists: FieldAction[][]): FieldAction[]",
  },
  {
    key: "ensureFieldKeys",
    exportName: "ensureFieldKeys",
    kind: "function",
    purpose: "Default deny — every catalog field appears in manifest (empty = no access).",
    signature:
      "ensureFieldKeys(fields: Record<string, FieldAction[]>, fieldIds: FieldId[]): Record<string, FieldAction[]>",
  },
  {
    key: "CachingPolicyService",
    exportName: "CachingPolicyService",
    kind: "class",
    purpose: "Phase 06 manifest cache wrapper; keys include policyVersion.",
    signature:
      "createCachingPolicyService(base: PolicyService, store: ManifestCacheStore, config?: ManifestCacheConfig)",
  },
  {
    key: "manifestCacheKey",
    exportName: "manifestCacheKey",
    kind: "function",
    purpose: "Build cache key from principal id, surface, entityId, policyVersion.",
    signature: "manifestCacheKey(parts: ManifestCacheKeyParts): string",
  },
];

const spikeBootstrap = [
  {
    key: "loadPrincipalFromDb",
    helper: "loadPrincipalFromDb",
    module: "lib/request-policy.ts",
    description:
      "Reads latch_user_roles + latch_roles.role_class → Principal (scoped bindings + roleClasses for synthesis).",
  },
  {
    key: "createPolicyServiceForPrincipal",
    helper: "createPolicyServiceForPrincipal",
    module: "lib/request-policy.ts",
    description:
      "Preloads grant rows for principal role ids, returns PolicyService with sync MemoryRoleGrantProvider.",
  },
  {
    key: "preloadRoleGrantProvider",
    helper: "preloadRoleGrantProvider",
    module: "lib/preload-role-grants.ts",
    description: "SELECT grant rows + binding row_scope; fold to one RoleGrant per role×surface.",
  },
  {
    key: "getPolicyVersion",
    helper: "getPolicyVersion",
    module: "lib/iam/policy-version.ts",
    description: "SELECT version FROM latch_policy_version WHERE id = 1 (nav badge).",
  },
  {
    key: "bumpPolicyVersion",
    helper: "bumpPolicyVersion",
    module: "lib/iam/policy-version.ts",
    description:
      "UPDATE latch_policy_version SET version = version + 1 after permission mutations.",
  },
  {
    key: "spikePolicyRegistry",
    helper: "spikePolicyRegistry",
    module: "lib/policy-registry.ts",
    description: "definePolicyRegistry(alpha_list, …, role_detail) — 5 fixture + 2 IAM surfaces.",
  },
  {
    key: "getRequestPrincipal",
    helper: "getRequestPrincipal",
    module: "lib/request-principal.ts",
    description:
      'Dev "Act as" cookie → loadPrincipalFromDb — used by IAM server actions.',
  },
];

const denySemantics = [
  {
    key: "default-deny",
    term: "Default deny (sparse grants)",
    meaning: "No grant row → manifest fields[id]: [] via ensureFieldKeys.",
    spike: "Proved — unchecked grant matrix + manifest inspector (task 04).",
  },
  {
    key: "deny-wins",
    term: "denyWins / effect: deny",
    meaning:
      "Merge rule in @latch/policy; explicit deny strips allows when roles stack.",
    spike:
      "Not proved in UI — package unit tests only. Runtime Postgres grants are allow-only (no effect column).",
  },
  {
    key: "auth-deny",
    term: "Auth deny (403 / 404)",
    meaning: "DAL / route rejection (ForbiddenError, T8 positive hide).",
    spike: "Proved — IAM UI error handling (task 04).",
  },
];

const policyVersionBumps = [
  {
    key: "grants",
    mutation: "Role grant or surface_binding patch",
    bumps: "Yes",
    where: "role_detail DAL — bumpPolicyVersion",
  },
  {
    key: "delete",
    mutation: "App role delete",
    bumps: "Yes",
    where: "role_detail DAL",
  },
  {
    key: "assignments",
    mutation: "User role_assignments patch",
    bumps: "Yes",
    where: "user_roles_detail DAL (task 04)",
  },
  {
    key: "create",
    mutation: "Role create (catalog row only)",
    bumps: "No",
    where: "No effective permission change yet",
  },
  {
    key: "display",
    mutation: "Display-name-only role patch",
    bumps: "No",
    where: "patchTouchesPolicyData guard",
  },
];

const exportColumns: ColumnsType<ExportRow> = [
  { title: "Export", dataIndex: "exportName", key: "exportName", width: 220 },
  { title: "Kind", dataIndex: "kind", key: "kind", width: 100 },
  { title: "Purpose", dataIndex: "purpose", key: "purpose" },
  {
    title: "Signature / return",
    dataIndex: "signature",
    key: "signature",
    render: (value: string) => <Text code style={{ whiteSpace: "pre-wrap" }}>{value}</Text>,
  },
];

const PolicyApiPage = () => (
  <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 24 }}>
    <Title level={2}>@latch/policy — dev reference</Title>
    <Paragraph type="secondary">
      Read-only API reference for the spike harness. No runtime playground in v1.
    </Paragraph>

    <Title level={3}>Package exports</Title>
    <Table<ExportRow>
      size="small"
      pagination={false}
      columns={exportColumns}
      dataSource={policyExports}
      scroll={{ x: true }}
    />

    <Title level={3} style={{ marginTop: 32 }}>
      Spike bootstrap helpers
    </Title>
    <Table
      size="small"
      pagination={false}
      columns={[
        { title: "Helper", dataIndex: "helper", key: "helper", width: 260 },
        { title: "Module", dataIndex: "module", key: "module", width: 240 },
        { title: "Description", dataIndex: "description", key: "description" },
      ]}
      dataSource={spikeBootstrap}
    />

    <Title level={3} style={{ marginTop: 32 }}>
      Resolve flow
    </Title>
    <Paragraph>
      <Text code>latch_role_grants</Text> + <Text code>latch_role_surfaces</Text>
      {" → "}
      <Text code>preloadRoleGrantProvider</Text>
      {" → "}
      <Text code>PolicyService.resolve</Text>
      {" → "}
      <Text code>Manifest</Text>
      {" → "}
      <Text code>PermissionContext</Text>
      {" → "}
      IAM DAL
    </Paragraph>
  <pre style={{ background: "#f5f5f5", padding: 16, borderRadius: 8, overflow: "auto" }}>
{`┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│ latch_user_roles│────▶│ loadPrincipalFromDb  │────▶│    Principal    │
└─────────────────┘     └──────────────────────┘     └────────┬────────┘
                                                              │
┌─────────────────┐     ┌──────────────────────┐              │
│ latch_role_*    │────▶│ preloadRoleGrant     │              │
│  grants/rows    │     │ Provider (per req)   │              │
└─────────────────┘     └──────────┬───────────┘              │
                                   │                          │
                                   ▼                          ▼
                        ┌──────────────────────────────────────────┐
                        │ PolicyService.resolve(principal, scope)    │
                        │  • system_data / system_iam synthesis      │
                        │  • union grants + ensureFieldKeys          │
                        └────────────────────┬─────────────────────┘
                                             ▼
                        ┌──────────────────────────────────────────┐
                        │ Manifest → PermissionContext → DAL       │
                        └──────────────────────────────────────────┘`}
  </pre>

    <Title level={3} style={{ marginTop: 32 }}>
      Deny semantics
    </Title>
    <Paragraph>
      Three distinct meanings — see{" "}
      <Link href="/dev/policy-api#deny">task README deny section</Link>.{" "}
      <strong>Spike Postgres grants are allow-only</strong>;{" "}
      <Text code>denyWins</Text> is engine-only (unit tests).
    </Paragraph>
    <Table
      id="deny"
      size="small"
      pagination={false}
      columns={[
        { title: "Term", dataIndex: "term", key: "term", width: 240 },
        { title: "What it means", dataIndex: "meaning", key: "meaning" },
        { title: "Spike", dataIndex: "spike", key: "spike", width: 320 },
      ]}
      dataSource={denySemantics}
    />

    <Title level={3} style={{ marginTop: 32 }}>
      policyVersion
    </Title>
    <Paragraph>
      Global counter in <Text code>latch_policy_version</Text> (single row,{" "}
      <Text code>id = 1</Text>). Shown in the root nav as{" "}
      <Text code>Policy v{"{N}"}</Text>. This spike does not wire{" "}
      <Text code>CachingPolicyService</Text> — the badge proves the write → bump
      path. Phase 06 manifest cache keys include{" "}
      <Text code>principal.policyVersion</Text>.
    </Paragraph>
    <Collapse
      items={[
        {
          key: "bumps",
          label: "What bumps the counter?",
          children: (
            <Table
              size="small"
              pagination={false}
              columns={[
                { title: "Mutation", dataIndex: "mutation", key: "mutation" },
                { title: "Bumps?", dataIndex: "bumps", key: "bumps", width: 80 },
                { title: "Where", dataIndex: "where", key: "where" },
              ]}
              dataSource={policyVersionBumps}
            />
          ),
        },
      ]}
    />
  </div>
);

export default PolicyApiPage;
