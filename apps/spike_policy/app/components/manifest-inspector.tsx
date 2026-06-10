"use client";

import type { Manifest } from "@latch/contracts";
import { Segmented, Table, Tag, Typography } from "antd";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

type ManifestInspectorProps = {
  manifests: Record<string, Manifest>;
  iamSurfaceIds: readonly string[];
};

type InspectorRow = {
  key: string;
  surface: string;
  isIam: boolean;
  rowScope: string;
  fieldActions: string;
  surfaceActions: string;
};

const formatRowScope = (rowScope: Manifest["rowScope"]): string => {
  if (rowScope === "own" || rowScope === "all") {
    return rowScope;
  }
  return "—";
};

const formatFieldActions = (manifest: Manifest): string => {
  const lines = Object.entries(manifest.fields)
    .filter(([, actions]) => actions.length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fieldId, actions]) => `${fieldId}: ${actions.join(", ")}`);

  return lines.length > 0 ? lines.join("\n") : "(none)";
};

const formatSurfaceActions = (actions: Manifest["actions"]): string =>
  actions.length > 0 ? actions.join(", ") : "(none)";

const manifestsToRows = (
  manifests: Record<string, Manifest>,
  iamSurfaceIds: readonly string[],
): InspectorRow[] =>
  Object.values(manifests)
    .sort((a, b) => a.surface.localeCompare(b.surface))
    .map((manifest) => ({
      key: manifest.surface,
      surface: manifest.surface,
      isIam: iamSurfaceIds.includes(manifest.surface),
      rowScope: formatRowScope(manifest.rowScope),
      fieldActions: formatFieldActions(manifest),
      surfaceActions: formatSurfaceActions(manifest.actions),
    }));

export const ManifestInspector = ({
  manifests,
  iamSurfaceIds,
}: ManifestInspectorProps) => {
  const [view, setView] = useState<"table" | "json">("table");
  const rows = useMemo(
    () => manifestsToRows(manifests, iamSurfaceIds),
    [manifests, iamSurfaceIds],
  );

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Segmented
          options={[
            { label: "Table", value: "table" },
            { label: "JSON", value: "json" },
          ]}
          value={view}
          onChange={(value) => setView(value as "table" | "json")}
        />
      </div>

      {view === "table" ? (
        <Table<InspectorRow>
          size="small"
          pagination={false}
          dataSource={rows}
          columns={[
            {
              title: "Surface",
              dataIndex: "surface",
              render: (surface: string, row) => (
                <SpaceInline>
                  <Typography.Text code>{surface}</Typography.Text>
                  {row.isIam ? <Tag color="purple">iam</Tag> : null}
                </SpaceInline>
              ),
            },
            {
              title: "rowScope",
              dataIndex: "rowScope",
              width: 96,
              render: (value: string) => (
                <Typography.Text type={value === "—" ? "secondary" : undefined}>
                  {value}
                </Typography.Text>
              ),
            },
            {
              title: "Field actions",
              dataIndex: "fieldActions",
              render: (value: string) => (
                <Typography.Text
                  style={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}
                  type={value === "(none)" ? "secondary" : undefined}
                >
                  {value}
                </Typography.Text>
              ),
            },
            {
              title: "Surface actions",
              dataIndex: "surfaceActions",
              width: 160,
              render: (value: string) => (
                <Typography.Text type={value === "(none)" ? "secondary" : undefined}>
                  {value}
                </Typography.Text>
              ),
            },
          ]}
        />
      ) : (
        <pre
          style={{
            margin: 0,
            padding: 16,
            background: "#fafafa",
            borderRadius: 8,
            overflow: "auto",
            fontSize: 12,
          }}
        >
          {JSON.stringify(manifests, null, 2)}
        </pre>
      )}
    </div>
  );
};

const SpaceInline = ({ children }: { children: ReactNode }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
    {children}
  </span>
);
