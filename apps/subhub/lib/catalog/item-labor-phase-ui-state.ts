export type ItemLaborPhaseUiView =
  | "category_editable"
  | "inherited"
  | "empty"
  | "override";

export const resolveItemLaborPhaseUiView = (input: {
  isQuotableLeaf: boolean;
  ownRowCount: number;
  inheritedRowCount: number;
}): ItemLaborPhaseUiView => {
  if (!input.isQuotableLeaf) {
    return "category_editable";
  }

  if (input.ownRowCount > 0) {
    return "override";
  }

  if (input.inheritedRowCount > 0) {
    return "inherited";
  }

  return "empty";
};
