"use client";

import type { FieldAction } from "@latch/contracts";
import { Button, Checkbox, Flex, Select } from "antd";
import { useRouter, useSearchParams } from "next/navigation";

import { usePlayground } from "./PlaygroundProvider";
import {
  fieldActionsToGrant,
  grantToFieldActions,
  PLAYGROUND_FIELD_IDS,
  PLAYGROUND_RECORD_IDS,
  PLAYGROUND_SURFACE_ACTIONS,
  type FieldGrant,
  type PlaygroundPresetId,
  type PlaygroundRecordId,
} from "./playground-fixtures";

const PRESET_OPTIONS: Array<{ value: PlaygroundPresetId; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "readonly-viewer", label: "Read-only viewer" },
  { value: "profile-editor", label: "Profile editor" },
  { value: "loading", label: "Loading" },
  { value: "saving", label: "Saving" },
];

const GRANT_OPTIONS: Array<{ value: FieldGrant; label: string }> = [
  { value: "write", label: "write" },
  { value: "read", label: "read" },
  { value: "none", label: "none" },
];

const RECORD_LABELS: Record<PlaygroundRecordId, string> = {
  "rec-acme": "Acme Playground",
  "rec-beta": "Beta Industries",
  "rec-person": "Jane Doe",
};

const debugPreStyle: React.CSSProperties = {
  marginTop: 8,
  marginBottom: 0,
  padding: 12,
  background: "rgba(0,0,0,0.02)",
  borderRadius: 6,
  overflow: "auto",
  fontSize: 12,
  maxHeight: 160,
};

export const FormPlaygroundPanel = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    manifest,
    preset,
    recordId,
    isNewRecord,
    ui,
    isDirty,
    lastSubmit,
    setManifest,
    setUi,
  } = usePlayground();

  const onPresetChange = (value: PlaygroundPresetId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("preset", value);
    router.replace(`/dev/form-playground?${params.toString()}`);
  };

  const onRecordSelect = (id: PlaygroundRecordId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("record", id);
    router.replace(`/dev/form-playground?${params.toString()}`);
  };

  return (
    <Flex vertical gap={12} style={{ padding: 16, fontSize: 13 }}>
      <Select<PlaygroundPresetId>
        size="small"
        style={{ width: "100%" }}
        options={PRESET_OPTIONS}
        value={preset}
        onChange={onPresetChange}
      />

      <Flex vertical gap={4}>
        {PLAYGROUND_RECORD_IDS.map((id) => (
          <Button
            key={id}
            size="small"
            type={!isNewRecord && recordId === id ? "primary" : "default"}
            block
            onClick={() => onRecordSelect(id)}
          >
            {RECORD_LABELS[id]}
          </Button>
        ))}
      </Flex>

      <Checkbox.Group
        style={{ display: "flex", flexDirection: "column", gap: 6 }}
        value={manifest.actions}
        options={PLAYGROUND_SURFACE_ACTIONS.map((action) => ({
          label: action,
          value: action,
        }))}
        onChange={(checked) => {
          const next = new Set(checked as FieldAction[]);
          setManifest((prev) => ({
            ...prev,
            actions: PLAYGROUND_SURFACE_ACTIONS.filter((action) =>
              next.has(action),
            ),
          }));
        }}
      />

      {PLAYGROUND_FIELD_IDS.map((fieldId) => (
        <Flex key={fieldId} align="center" gap={8}>
          <span style={{ flex: 1, fontFamily: "monospace", fontSize: 12 }}>
            {fieldId}
          </span>
          <Select<FieldGrant>
            size="small"
            style={{ width: 88 }}
            options={GRANT_OPTIONS}
            value={fieldActionsToGrant(manifest.fields[fieldId])}
            onChange={(grant) => {
              setManifest((prev) => {
                const actions = grantToFieldActions(grant);
                if (!actions) {
                  const { [fieldId]: _removed, ...rest } = prev.fields;
                  return { ...prev, fields: rest };
                }
                return {
                  ...prev,
                  fields: { ...prev.fields, [fieldId]: actions },
                };
              });
            }}
          />
        </Flex>
      ))}

      <Flex vertical gap={6}>
        <Checkbox
          checked={ui.canCreate}
          onChange={(event) =>
            setUi((prev) => ({ ...prev, canCreate: event.target.checked }))
          }
        >
          can create
        </Checkbox>
        <Checkbox
          checked={ui.loading}
          onChange={(event) =>
            setUi((prev) => ({ ...prev, loading: event.target.checked }))
          }
        >
          loading (initial skeleton)
        </Checkbox>
        <Checkbox
          checked={ui.saving}
          onChange={(event) =>
            setUi((prev) => ({ ...prev, saving: event.target.checked }))
          }
        >
          saving (disable controls)
        </Checkbox>
        <Checkbox
          checked={ui.slowNetwork}
          onChange={(event) =>
            setUi((prev) => ({ ...prev, slowNetwork: event.target.checked }))
          }
        >
          slow network (overlay)
        </Checkbox>
      </Flex>

      <div style={{ color: "rgba(0,0,0,0.45)", fontSize: 12 }}>
        isDirty: {isDirty ? "true" : "false"}
        {isNewRecord ? " · new record" : null}
      </div>
      <pre style={debugPreStyle}>{JSON.stringify(manifest, null, 2)}</pre>
      <pre style={debugPreStyle}>
        {lastSubmit ? JSON.stringify(lastSubmit, null, 2) : "—"}
      </pre>
    </Flex>
  );
};
