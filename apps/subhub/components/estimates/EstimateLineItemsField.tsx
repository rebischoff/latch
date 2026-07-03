export {
  EstimateLineTreeTable as EstimateLineItemsField,
  type EstimateLineFormRow,
  type EstimateLineKind,
  type EstimateLineRole,
  type EstimateScopeFormRow,
} from "@/components/estimates/EstimateLineTreeTable";

export type EstimateLineItemsFormValues = {
  scopes: import("@/components/estimates/estimate-line-tree").EstimateScopeFormRow[];
  line_items: import("@/components/estimates/estimate-line-tree").EstimateLineFormRow[];
};
