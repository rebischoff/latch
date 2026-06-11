import type { MemoryRoleGrantBinding } from "@latch/policy";

import {
  BRANCH_A_SCOPE_ID,
  BRANCH_B_SCOPE_ID,
  BRANCH_SALES_ROLE_ID,
  COMPANY_SALES_ROLE_ID,
  WIDGET_BRANCH_A_ID,
  WIDGET_BRANCH_B_ID,
  WIDGET_OWNER_A_USER_ID,
  WIDGET_OWNER_ROLE_ID,
  WIDGET_BRANCH_A_ID as WIDGET_A,
} from "./fixture-ids.js";
import { MemoryWidgetStore } from "./memory-widget-store.js";

export const grantBindingsForHarness = (): MemoryRoleGrantBinding[] => [
  {
    roleId: BRANCH_SALES_ROLE_ID,
    surface: "widget_list",
    rowScope: "scope",
    fields: [
      { field: "label", actions: ["read"] },
      { field: "status", actions: ["read"] },
    ],
    surfaceActions: ["read"],
  },
  {
    roleId: BRANCH_SALES_ROLE_ID,
    surface: "widget_detail",
    rowScope: "scope",
    fields: [
      { field: "label", actions: ["read"] },
      { field: "status", actions: ["read"] },
      { field: "branch_scope", actions: ["read"] },
    ],
    surfaceActions: ["read"],
  },
  {
    roleId: COMPANY_SALES_ROLE_ID,
    surface: "widget_list",
    rowScope: "all",
    fields: [
      { field: "label", actions: ["read"] },
      { field: "status", actions: ["read"] },
    ],
    surfaceActions: ["read"],
  },
  {
    roleId: COMPANY_SALES_ROLE_ID,
    surface: "widget_detail",
    rowScope: "all",
    fields: [
      { field: "label", actions: ["read"] },
      { field: "status", actions: ["read"] },
      { field: "branch_scope", actions: ["read"] },
    ],
    surfaceActions: ["read"],
  },
  {
    roleId: WIDGET_OWNER_ROLE_ID,
    surface: "widget_list",
    rowScope: "own",
    fields: [{ field: "label", actions: ["read"] }],
    surfaceActions: ["read"],
  },
  {
    roleId: WIDGET_OWNER_ROLE_ID,
    surface: "widget_detail",
    rowScope: "own",
    fields: [{ field: "label", actions: ["read"] }],
    surfaceActions: ["read"],
  },
];

export const seedWidgetStore = (store: MemoryWidgetStore): void => {
  store.clear();
  store.upsert({
    id: WIDGET_BRANCH_A_ID,
    label: "Branch A widget",
    status: "open",
    scope_id: BRANCH_A_SCOPE_ID,
  });
  store.upsert({
    id: WIDGET_BRANCH_B_ID,
    label: "Branch B widget",
    status: "open",
    scope_id: BRANCH_B_SCOPE_ID,
  });
  store.assignOwner(WIDGET_A, WIDGET_OWNER_A_USER_ID);
};
