"use client";

import { EnvironmentOutlined } from "@ant-design/icons";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  App,
  Button,
  Checkbox,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tooltip,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";

import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useJobPartPicker } from "@/lib/hooks/use-job-part-picker";
import {
  fetchRequisitionPool,
  fetchSurfaceList,
  postPurchaseOrderBatch,
  type PoolRollupRow,
} from "@/lib/surface-api";

/** RP6: Create POs requires both part # and vendor. */
const isRowPoEligible = (args: {
  partId: string | null | undefined;
  vendorPartyId: string | null | undefined;
}): boolean => Boolean(args.partId && args.vendorPartyId);

type RowStaging = {
  vendorPartyId?: string;
  partId: string | null;
  partMpn: string | null;
  /** manufacturer_part.description for the staged PN — live-updates Description (IT5). */
  partDescription: string | null;
  /** Per-request staged qty (decrease-only). */
  qtyByRequest: Record<string, number>;
};

/** IT5: Description = mfr description for the (staged) PN; soft-spec/blank PN → jmr description. */
const displayDescription = (staging: RowStaging, row: PoolRollupRow): string =>
  staging.partId ? staging.partDescription ?? "" : row.description;

const resolveDefaultVendor = (row: PoolRollupRow): string | undefined => {
  if (row.vendors.length === 1) {
    return row.vendors[0]?.vendor_party_id;
  }
  return row.vendors.find((v) => v.is_preferred)?.vendor_party_id;
};

const openQtyByRequest = (row: PoolRollupRow): Record<string, number> => {
  const map: Record<string, number> = {};
  for (const zone of row.zones) {
    for (const req of zone.requests) {
      map[req.id] = req.quantity;
    }
  }
  return map;
};

const stagedTotal = (staging: RowStaging | undefined, row: PoolRollupRow): number => {
  const open = openQtyByRequest(row);
  if (!staging) {
    return Object.values(open).reduce((sum, q) => sum + q, 0);
  }
  return Object.entries(open).reduce(
    (sum, [id, openQty]) => sum + (staging.qtyByRequest[id] ?? openQty),
    0,
  );
};

const setTotalQtyFifo = (
  row: PoolRollupRow,
  targetTotal: number,
): Record<string, number> => {
  const open = openQtyByRequest(row);
  const ids = row.zones.flatMap((z) => z.requests.map((r) => r.id));
  const next: Record<string, number> = {};
  let remaining = Math.min(
    Math.max(0, targetTotal),
    Object.values(open).reduce((s, q) => s + q, 0),
  );
  for (const id of ids) {
    const openQty = open[id] ?? 0;
    const take = Math.min(openQty, remaining);
    next[id] = take;
    remaining -= take;
  }
  return next;
};

const setZoneQtyFifo = (
  row: PoolRollupRow,
  siteZoneId: string | null,
  targetZoneQty: number,
  prev: Record<string, number>,
): Record<string, number> => {
  const zone = row.zones.find(
    (z) => (z.site_zone_id ?? null) === (siteZoneId ?? null),
  );
  if (!zone) return prev;
  const next = { ...prev };
  const open = openQtyByRequest(row);
  let remaining = Math.min(Math.max(0, targetZoneQty), zone.quantity);
  for (const req of zone.requests) {
    const openQty = open[req.id] ?? 0;
    const take = Math.min(openQty, remaining);
    next[req.id] = take;
    remaining -= take;
  }
  return next;
};

type PartOption = { value: string; label: string; description?: string | null };

/**
 * RP5: Part # Select reuses Scope's `fetchJobPartPicker` when the row carries
 * item + job_condition. Legacy ad-hoc rows fall back to a live part_list search.
 */
const PartNumberSelect = ({
  value,
  label,
  itemId,
  jobConditionId,
  onChange,
}: {
  value: string | null;
  label: string | null;
  itemId: string | null;
  jobConditionId: string | null;
  onChange: (partId: string | null, mpn: string | null, description: string | null) => void;
}) => {
  const useScopeResolver = Boolean(itemId && jobConditionId);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), 250);

  const { data: scopeParts, isLoading: scopeLoading } = useJobPartPicker(
    itemId,
    jobConditionId,
    useScopeResolver,
  );

  const { data, isFetching } = useQuery({
    queryKey: ["part-picker-pool", debounced],
    queryFn: () =>
      fetchSurfaceList("part_list", {
        q: debounced || undefined,
        limit: 30,
      }),
    enabled: !useScopeResolver && (debounced.length >= 1 || Boolean(value)),
    staleTime: 15_000,
  });

  const options: PartOption[] = useMemo(() => {
    if (useScopeResolver) {
      const mapped = (scopeParts ?? []).map((part) => ({
        value: part.id,
        label: part.mpn,
        description: part.description ?? null,
      }));
      if (value && label && !mapped.some((o) => o.value === value)) {
        return [{ value, label }, ...mapped];
      }
      return mapped;
    }
    const rows = data?.data.rows ?? [];
    const mapped = rows.map((row) => {
      const summary = row.summary as
        | { mpn?: string | null; display_name?: string | null; description?: string | null }
        | undefined;
      const mpn = summary?.mpn ?? summary?.display_name ?? row.id;
      return { value: row.id, label: mpn, description: summary?.description ?? null };
    });
    if (value && label && !mapped.some((o) => o.value === value)) {
      return [{ value, label }, ...mapped];
    }
    return mapped;
  }, [useScopeResolver, scopeParts, data?.data.rows, label, value]);

  return (
    <Select
      allowClear
      showSearch
      filterOption={
        useScopeResolver
          ? (input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
          : false
      }
      placeholder="TBD"
      style={{ width: "100%", minWidth: 140 }}
      value={value ?? undefined}
      options={options}
      loading={useScopeResolver ? scopeLoading : isFetching}
      onSearch={useScopeResolver ? undefined : setSearch}
      onClear={() => onChange(null, null, null)}
      onChange={(next, option) => {
        if (!next) {
          onChange(null, null, null);
          return;
        }
        const opt = Array.isArray(option) ? option[0] : option;
        const picked = opt as PartOption | undefined;
        onChange(next, picked?.label ?? null, picked?.description ?? null);
      }}
    />
  );
};

const zoneLabel = (zone: PoolRollupRow["zones"][number]): string =>
  zone.site_zone_id ? (zone.site_zone_name ?? zone.site_zone_id) : "General";

const stagedZoneQty = (
  zone: PoolRollupRow["zones"][number],
  qtyByRequest: Record<string, number>,
): number =>
  zone.requests.reduce(
    (sum, req) => sum + (qtyByRequest[req.id] ?? req.quantity),
    0,
  );

/**
 * Zone icon + modal — same chrome as Job Scope items (checkbox + per-zone qty).
 * Decrease-only: uncheck drops the zone from this PO; leftover stays open.
 */
const RequisitionZoneButton = ({
  row,
  staging,
  onApply,
}: {
  row: PoolRollupRow;
  staging: RowStaging;
  onApply: (qtyByRequest: Record<string, number>) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, number>>({});

  const openModal = () => {
    setDraft({ ...staging.qtyByRequest });
    setOpen(true);
  };

  const setZoneQty = (siteZoneId: string | null, qty: number) => {
    setDraft((prev) => setZoneQtyFifo(row, siteZoneId, qty, prev));
  };

  const allocated = row.zones.reduce(
    (sum, zone) => sum + stagedZoneQty(zone, draft),
    0,
  );

  return (
    <>
      <Button
        type="text"
        size="small"
        aria-label={
          row.zones.length > 0 ? `Zones (${row.zones.length})` : "Zones"
        }
        icon={<EnvironmentOutlined />}
        onClick={openModal}
      />
      <Modal
        title="Zones"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => {
          onApply(draft);
          setOpen(false);
        }}
        okText="Apply"
        destroyOnHidden
        width={420}
      >
        <Typography.Paragraph type="secondary">
          Check zones to include on this PO. Qty is decrease-only — leftover
          stays open for a later order.
        </Typography.Paragraph>
        <Space orientation="vertical" style={{ width: "100%" }} size="small">
          {row.zones.map((zone) => {
            const zId = zone.site_zone_id ?? null;
            const qty = stagedZoneQty(zone, draft);
            const checked = qty > 0;
            return (
              <div
                key={zId ?? "__general__"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <Checkbox
                  checked={checked}
                  onChange={(e) => {
                    setZoneQty(zId, e.target.checked ? zone.quantity : 0);
                  }}
                >
                  {zoneLabel(zone)}
                </Checkbox>
                {checked ? (
                  <InputNumber
                    size="small"
                    min={0}
                    max={zone.quantity}
                    step={1}
                    style={{ width: 72 }}
                    value={qty}
                    onChange={(v) => {
                      const next = typeof v === "number" ? v : 0;
                      setZoneQty(
                        zId,
                        Math.min(zone.quantity, Math.max(0, next)),
                      );
                    }}
                  />
                ) : null}
              </div>
            );
          })}
          <Typography.Text>Allocated: {allocated}</Typography.Text>
        </Space>
      </Modal>
    </>
  );
};

export const RequisitionList = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | undefined>();
  const [selected, setSelected] = useState<string[]>([]);
  const [stagingByKey, setStagingByKey] = useState<Record<string, RowStaging>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["requisition-pool", jobId ?? ""],
    queryFn: () => fetchRequisitionPool(jobId ? { jobId } : undefined),
    // Keep prior jobs/rows while the job-scoped key loads so auto-select
    // does not treat a transient empty cache as "no open demand."
    placeholderData: keepPreviousData,
  });

  const jobs = data?.data.jobs ?? [];
  const allVendors = data?.data.vendors ?? [];
  const rows = data?.data.rows ?? [];
  const canCreatePos = data?.data.canCreatePos === true;

  // Auto-select first job with open demand; clear if selected job leaves the list.
  // Skip while the query has no resolved/placeholder payload — empty `jobs`
  // during a key transition must not clear jobId (that caused an update loop).
  useEffect(() => {
    if (data == null) return;
    if (jobs.length === 0) {
      if (jobId !== undefined) setJobId(undefined);
      return;
    }
    if (!jobId || !jobs.some((j) => j.id === jobId)) {
      setJobId(jobs[0]?.id);
    }
  }, [data, jobs, jobId]);

  useEffect(() => {
    setSelected([]);
    setStagingByKey({});
  }, [jobId]);

  // Drop selection when a row becomes ineligible (cleared PN / vendor).
  useEffect(() => {
    setSelected((prev) => {
      const next = prev.filter((key) => {
        const row = rows.find((r) => r.key === key);
        if (!row) return false;
        const staging = stagingByKey[key];
        const partId = staging?.partId ?? row.part_id;
        const vendorPartyId =
          staging?.vendorPartyId ?? resolveDefaultVendor(row);
        return isRowPoEligible({ partId, vendorPartyId });
      });
      if (
        next.length === prev.length &&
        next.every((key, i) => key === prev[i])
      ) {
        return prev;
      }
      return next;
    });
  }, [rows, stagingByKey]);

  const ensureStaging = (row: PoolRollupRow): RowStaging => {
    const existing = stagingByKey[row.key];
    if (existing) return existing;
    return {
      vendorPartyId: resolveDefaultVendor(row),
      partId: row.part_id,
      partMpn: row.part_mpn,
      partDescription: row.part_description,
      qtyByRequest: openQtyByRequest(row),
    };
  };

  const updateStaging = (row: PoolRollupRow, patch: Partial<RowStaging>) => {
    setStagingByKey((prev) => {
      const base = prev[row.key] ?? ensureStaging(row);
      return { ...prev, [row.key]: { ...base, ...patch } };
    });
  };

  const createMutation = useMutation({
    mutationFn: () => {
      const selections: Array<{
        jobMaterialRequestId: string;
        vendorPartyId: string;
        quantity: number;
        partId?: string | null;
      }> = [];

      for (const key of selected) {
        const row = rows.find((r) => r.key === key);
        if (!row) continue;
        const staging = stagingByKey[key] ?? ensureStaging(row);
        const vendorPartyId = staging.vendorPartyId;
        if (!vendorPartyId) {
          throw new Error(`Pick a vendor for ${row.part_mpn ?? row.description}`);
        }
        const partChanged =
          (staging.partId ?? null) !== (row.part_id ?? null);
        for (const zone of row.zones) {
          for (const req of zone.requests) {
            const qty = staging.qtyByRequest[req.id] ?? req.quantity;
            if (!(qty > 0)) continue;
            const selection: {
              jobMaterialRequestId: string;
              vendorPartyId: string;
              quantity: number;
              partId?: string | null;
            } = {
              jobMaterialRequestId: req.id,
              vendorPartyId,
              quantity: qty,
            };
            if (partChanged) {
              selection.partId = staging.partId;
            }
            selections.push(selection);
          }
        }
      }

      if (selections.length === 0) {
        throw new Error("Nothing to order — staged quantities are zero");
      }
      return postPurchaseOrderBatch({ selections });
    },
    onSuccess: (result) => {
      message.success(
        `Created ${result.data.purchaseOrderIds.length} draft purchase order(s)`,
      );
      setSelected([]);
      setStagingByKey({});
      void queryClient.invalidateQueries({ queryKey: ["requisition-pool"] });
      void queryClient.invalidateQueries({
        queryKey: ["surface", "purchase_order_list"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["surface", "job_material_request_list"],
      });
    },
    onError: (err: Error) => {
      message.error(err.message || "Failed to create purchase orders");
    },
  });

  const canCreate = useMemo(() => {
    if (!canCreatePos || selected.length === 0) return false;
    return selected.every((key) => {
      const row = rows.find((r) => r.key === key);
      if (!row) return false;
      const staging = stagingByKey[key] ?? ensureStaging(row);
      if (
        !isRowPoEligible({
          partId: staging.partId,
          vendorPartyId: staging.vendorPartyId,
        })
      ) {
        return false;
      }
      return stagedTotal(staging, row) > 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ensureStaging closes over stagingByKey
  }, [canCreatePos, selected, rows, stagingByKey]);

  const rowSelectable = (row: PoolRollupRow): boolean => {
    const staging = stagingByKey[row.key] ?? ensureStaging(row);
    return isRowPoEligible({
      partId: staging.partId,
      vendorPartyId: staging.vendorPartyId,
    });
  };

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <Typography.Text type="danger">Unable to load requisition pool.</Typography.Text>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <Space
        style={{ marginBottom: 16, width: "100%", justifyContent: "space-between" }}
        wrap
      >
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Requisitions
          </Typography.Title>
          <Typography.Text type="secondary">
            Open demand by job × line. Create POs groups by vendor.
          </Typography.Text>
        </div>
        <Space wrap>
          <Select
            placeholder="Select job"
            style={{ minWidth: 260 }}
            options={jobs.map((j) => ({ value: j.id, label: j.title }))}
            value={jobId}
            onChange={(value) => setJobId(value)}
            disabled={jobs.length === 0}
          />
          <Button
            type="primary"
            disabled={!canCreate}
            loading={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Create POs ({selected.length})
          </Button>
        </Space>
      </Space>

      {jobs.length === 0 ? (
        <Typography.Text type="secondary">
          No open material requests to order.
        </Typography.Text>
      ) : (
        <Table
          size="small"
          loading={isLoading}
          rowKey="key"
          dataSource={rows}
          pagination={false}
          rowSelection={{
            selectedRowKeys: selected,
            getCheckboxProps: (row) => {
              const staging = stagingByKey[row.key] ?? {
                vendorPartyId: resolveDefaultVendor(row),
                partId: row.part_id,
                partMpn: row.part_mpn,
                partDescription: row.part_description,
                qtyByRequest: openQtyByRequest(row),
              };
              const eligible = isRowPoEligible({
                partId: staging.partId,
                vendorPartyId: staging.vendorPartyId,
              });
              return {
                disabled: !eligible,
                title: eligible
                  ? undefined
                  : "Resolve part # and vendor first",
              };
            },
            onChange: (keys) => {
              const ids = (keys as string[]).filter((key) => {
                const row = rows.find((r) => r.key === key);
                if (!row) return false;
                return rowSelectable(row);
              });
              setSelected(ids);
              setStagingByKey((prev) => {
                const next = { ...prev };
                for (const key of ids) {
                  if (!next[key]) {
                    const row = rows.find((r) => r.key === key);
                    if (row) {
                      next[key] = {
                        vendorPartyId: resolveDefaultVendor(row),
                        partId: row.part_id,
                        partMpn: row.part_mpn,
                        partDescription: row.part_description,
                        qtyByRequest: openQtyByRequest(row),
                      };
                    }
                  }
                }
                return next;
              });
            },
            renderCell: (_checked, row, _index, originNode) => {
              const staging = stagingByKey[row.key] ?? {
                vendorPartyId: resolveDefaultVendor(row),
                partId: row.part_id,
                partMpn: row.part_mpn,
                partDescription: row.part_description,
                qtyByRequest: openQtyByRequest(row),
              };
              const eligible = isRowPoEligible({
                partId: staging.partId,
                vendorPartyId: staging.vendorPartyId,
              });
              if (eligible) {
                return originNode;
              }
              return (
                <Tooltip title="Resolve part # and vendor first">
                  <span>{originNode}</span>
                </Tooltip>
              );
            },
          }}
          columns={[
            {
              title: "",
              key: "zones",
              width: 48,
              align: "center",
              render: (_, row) => {
                const staging = stagingByKey[row.key] ?? ensureStaging(row);
                return (
                  <RequisitionZoneButton
                    row={row}
                    staging={staging}
                    onApply={(qtyByRequest) =>
                      updateStaging(row, { qtyByRequest })
                    }
                  />
                );
              },
            },
            {
              title: "Qty",
              width: 110,
              render: (_, row) => {
                const staging = stagingByKey[row.key] ?? ensureStaging(row);
                const total = stagedTotal(staging, row);
                return (
                  <Space size={4}>
                    <InputNumber
                      min={0}
                      max={row.quantity}
                      step={1}
                      value={total}
                      style={{ width: 72 }}
                      onChange={(v) => {
                        const next = typeof v === "number" ? v : 0;
                        updateStaging(row, {
                          qtyByRequest: setTotalQtyFifo(
                            row,
                            Math.min(row.quantity, Math.max(0, next)),
                          ),
                        });
                      }}
                    />
                    <Typography.Text type="secondary">{row.unit}</Typography.Text>
                  </Space>
                );
              },
            },
            {
              title: "Item",
              width: 140,
              render: (_, row) => row.item_label ?? "—",
            },
            {
              title: "Part #",
              width: 180,
              render: (_, row) => {
                const staging = stagingByKey[row.key] ?? ensureStaging(row);
                return (
                  <PartNumberSelect
                    value={staging.partId}
                    label={staging.partMpn}
                    itemId={row.item_id}
                    jobConditionId={row.job_condition_id}
                    onChange={(partId, mpn, description) =>
                      updateStaging(row, {
                        partId,
                        partMpn: mpn,
                        partDescription: description,
                        // Clear vendor when PN changes — must re-resolve (RP6).
                        vendorPartyId: undefined,
                      })
                    }
                  />
                );
              },
            },
            {
              title: "Description",
              render: (_, row) => {
                const staging = stagingByKey[row.key] ?? ensureStaging(row);
                return displayDescription(staging, row) || "—";
              },
            },
            {
              title: "Vendor",
              width: 220,
              render: (_, row) => {
                const staging = stagingByKey[row.key] ?? ensureStaging(row);
                const partChanged =
                  (staging.partId ?? null) !== (row.part_id ?? null);
                const options =
                  !partChanged && row.vendors.length > 0
                    ? row.vendors.map((v) => ({
                        value: v.vendor_party_id,
                        label: `${v.vendor_display_name}${v.is_preferred ? " ★" : ""}`,
                      }))
                    : allVendors.map((v) => ({
                        value: v.id,
                        label: v.display_name,
                      }));
                return (
                  <Select
                    allowClear
                    placeholder="Pick vendor"
                    style={{ width: "100%" }}
                    options={options}
                    value={staging.vendorPartyId}
                    onChange={(value) =>
                      updateStaging(row, { vendorPartyId: value })
                    }
                  />
                );
              },
            },
          ]}
        />
      )}
    </div>
  );
};
