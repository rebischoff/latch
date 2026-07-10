"use client";

import { EnvironmentOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { Button, InputNumber, Modal, Select, Space, Typography, message } from "antd";
import { useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { lineFieldPath } from "@/components/estimates/estimate-line-cells";
import type {
  EstimateLineAllocationFormRow,
  EstimateLineEditorFormValues,
  EstimateSiteTreeFormRow,
  EstimateSiteZoneTreeFormRow,
} from "@/components/estimates/estimate-line-tree";

type EstimateLinePlacesButtonProps = {
  disabled: boolean;
  index: number;
  siteTree: EstimateSiteTreeFormRow | null | undefined;
};

const flattenZones = (
  zones: EstimateSiteZoneTreeFormRow[] | undefined,
  prefix = "",
): Array<{ id: string; label: string }> => {
  const out: Array<{ id: string; label: string }> = [];
  for (const zone of zones ?? []) {
    const label = prefix ? `${prefix} / ${zone.name}` : zone.name;
    out.push({ id: zone.id, label });
    out.push(...flattenZones(zone.zones, label));
  }
  return out;
};

export const EstimateLinePlacesButton = ({
  disabled,
  index,
  siteTree,
}: EstimateLinePlacesButtonProps) => {
  const { setValue } = useFormContext<EstimateLineEditorFormValues>();
  const allocations = (useWatch({
    name: lineFieldPath(index, "allocations"),
  }) ?? []) as EstimateLineAllocationFormRow[];
  const quantity = Number(
    useWatch({ name: lineFieldPath(index, "quantity") }) ?? 1,
  );
  const qtyManual = Boolean(useWatch({ name: lineFieldPath(index, "qty_manual") }));

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<EstimateLineAllocationFormRow[]>([]);

  const zoneOptions = useMemo(() => {
    const all: Array<{ id: string; label: string }> = [];
    for (const scope of siteTree?.scopes ?? []) {
      all.push(...flattenZones(scope.zones, scope.name));
    }
    return all;
  }, [siteTree]);

  const openModal = () => {
    setDraft(allocations.map((row) => ({ ...row })));
    setOpen(true);
  };

  const allocated = draft.reduce((sum, row) => sum + Number(row.quantity), 0);

  const handleSave = () => {
    if (qtyManual && allocated > quantity) {
      message.error("Allocated quantity exceeds line quantity");
      return;
    }

    setValue(lineFieldPath(index, "allocations"), draft, { shouldDirty: true });

    if (!qtyManual) {
      const nextQty = allocated > 0 ? allocated : 1;
      setValue(lineFieldPath(index, "quantity"), nextQty, { shouldDirty: true });
    }

    setOpen(false);
  };

  const addPlace = (siteZoneId: string) => {
    if (draft.some((row) => row.site_zone_id === siteZoneId)) {
      return;
    }
    const label = zoneOptions.find((z) => z.id === siteZoneId)?.label ?? null;
    setDraft([
      ...draft,
      { site_zone_id: siteZoneId, quantity: 1, site_zone_name: label },
    ]);
  };

  const unusedZones = zoneOptions.filter(
    (zone) => !draft.some((row) => row.site_zone_id === zone.id),
  );

  return (
    <>
      <Button
        type="link"
        size="small"
        icon={<EnvironmentOutlined />}
        disabled={disabled}
        onClick={openModal}
      >
        Places{allocations.length > 0 ? ` (${allocations.length})` : ""}
      </Button>
      <Modal
        title="Places"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
        okText="Apply"
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary">
          Allocate this line to site zones. Default qty per place is 1.
          {!qtyManual
            ? " Line quantity follows allocated total until you edit qty manually."
            : ` Manual qty ${quantity}; allocated must not exceed it.`}
        </Typography.Paragraph>

        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          {draft.map((row, rowIndex) => (
            <Space key={row.site_zone_id} style={{ width: "100%" }} align="center">
              <Typography.Text style={{ flex: 1, minWidth: 160 }}>
                {row.site_zone_name ??
                  zoneOptions.find((z) => z.id === row.site_zone_id)?.label ??
                  row.site_zone_id}
              </Typography.Text>
              <InputNumber
                min={0.01}
                value={row.quantity}
                onChange={(next) => {
                  const copy = [...draft];
                  copy[rowIndex] = { ...row, quantity: Number(next ?? 1) };
                  setDraft(copy);
                }}
              />
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => setDraft(draft.filter((_, i) => i !== rowIndex))}
              />
            </Space>
          ))}

          {unusedZones.length > 0 ? (
            <Select
              style={{ width: "100%" }}
              placeholder="Add place…"
              options={unusedZones.map((z) => ({ value: z.id, label: z.label }))}
              value={null}
              onChange={(value) => {
                if (typeof value === "string") {
                  addPlace(value);
                }
              }}
              suffixIcon={<PlusOutlined />}
            />
          ) : (
            <Typography.Text type="secondary">
              {zoneOptions.length === 0
                ? "No site zones on this estimate’s site."
                : "All site zones are allocated."}
            </Typography.Text>
          )}

          <Typography.Text>
            Allocated: {allocated}
            {qtyManual ? ` / qty ${quantity}` : ""}
          </Typography.Text>
        </Space>
      </Modal>
    </>
  );
};
