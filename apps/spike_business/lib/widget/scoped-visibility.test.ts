import { afterEach, describe, expect, it } from "vitest";

import {
  NotFoundError,
  type PermissionContext,
  type Principal,
} from "@latch/contracts";
import {
  MemoryRoleGrantProvider,
  PolicyService,
} from "@latch/policy";

import { spikeBusinessRegistry } from "../policy-registry.js";
import {
  BRANCH_A_SALES_USER_ID,
  BRANCH_A_SCOPE_ID,
  BRANCH_SALES_ROLE_ID,
  COMPANY_SALES_ROLE_ID,
  COMPANY_SALES_USER_ID,
  WIDGET_BRANCH_A_ID,
  WIDGET_BRANCH_B_ID,
  WIDGET_OWNER_A_USER_ID,
  WIDGET_OWNER_ROLE_ID,
} from "./fixture-ids.js";
import { MemoryWidgetStore } from "./memory-widget-store.js";
import {
  createWidgetDetailDal,
  createWidgetListDal,
} from "./repository.js";
import { grantBindingsForHarness, seedWidgetStore } from "./seed.js";

const grantProvider = new MemoryRoleGrantProvider(grantBindingsForHarness());
const policy = new PolicyService({
  registry: spikeBusinessRegistry,
  grantProvider,
});

const branchASalesPrincipal: Principal = {
  id: BRANCH_A_SALES_USER_ID,
  bindings: [{ roleId: BRANCH_SALES_ROLE_ID, scopeId: BRANCH_A_SCOPE_ID }],
  roleClasses: { [BRANCH_SALES_ROLE_ID]: "app" },
};

const companySalesPrincipal: Principal = {
  id: COMPANY_SALES_USER_ID,
  bindings: [{ roleId: COMPANY_SALES_ROLE_ID, scopeId: null }],
  roleClasses: { [COMPANY_SALES_ROLE_ID]: "app" },
};

const widgetOwnerPrincipal: Principal = {
  id: WIDGET_OWNER_A_USER_ID,
  bindings: [{ roleId: WIDGET_OWNER_ROLE_ID, scopeId: null }],
  roleClasses: { [WIDGET_OWNER_ROLE_ID]: "app" },
};

const listCtx = (principal: Principal): PermissionContext => ({
  principal,
  surface: "widget_list",
  manifest: policy.resolve(principal, {
    surface: "widget_list",
    mode: "list",
  }),
});

const detailCtx = (principal: Principal): PermissionContext => ({
  principal,
  surface: "widget_detail",
  manifest: policy.resolve(principal, {
    surface: "widget_detail",
    mode: "detail",
  }),
});

describe("scoped business row visibility (widgets)", () => {
  let store: MemoryWidgetStore;

  afterEach(() => {
    store?.clear();
  });

  it("scoped branch sales list returns only in-scope rows via manifest.scopeIds", () => {
    store = new MemoryWidgetStore();
    seedWidgetStore(store);
    const dal = createWidgetListDal(store);
    const ctx = listCtx(branchASalesPrincipal);

    expect(ctx.manifest.rowScope).toBe("scope");
    expect(ctx.manifest.scopeIds).toEqual([BRANCH_A_SCOPE_ID]);

    const { rows, total } = dal.list!(ctx);

    expect(total).toBe(1);
    expect(rows.map((row) => row.id)).toEqual([WIDGET_BRANCH_A_ID]);
  });

  it("cross-scope widget get throws NotFoundError (T8 pattern)", () => {
    store = new MemoryWidgetStore();
    seedWidgetStore(store);
    const dal = createWidgetDetailDal(store);
    const ctx = detailCtx(branchASalesPrincipal);

    expect(() => dal.get(ctx, WIDGET_BRANCH_B_ID)).toThrow(NotFoundError);
  });

  it("in-scope detail get projects branch_scope when manifest grants read", () => {
    store = new MemoryWidgetStore();
    seedWidgetStore(store);
    const dal = createWidgetDetailDal(store);
    const dto = dal.get(detailCtx(branchASalesPrincipal), WIDGET_BRANCH_A_ID);

    expect(dto.label).toEqual({ label: "Branch A widget" });
    expect(dto.branch_scope).toEqual({ scope_id: BRANCH_A_SCOPE_ID });
  });

  it("all rung list returns every row (scopeIds omitted)", () => {
    store = new MemoryWidgetStore();
    seedWidgetStore(store);
    const dal = createWidgetListDal(store);
    const ctx = listCtx(companySalesPrincipal);

    expect(ctx.manifest.rowScope).toBe("all");
    expect(ctx.manifest.scopeIds).toBeUndefined();

    const { rows, total } = dal.list!(ctx);

    expect(total).toBe(2);
    expect(rows.map((row) => row.id).sort()).toEqual(
      [WIDGET_BRANCH_A_ID, WIDGET_BRANCH_B_ID].sort(),
    );
  });

  it("own rung list ignores scopeIds and filters by assignment", () => {
    store = new MemoryWidgetStore();
    seedWidgetStore(store);
    const dal = createWidgetListDal(store);
    const ctx = listCtx(widgetOwnerPrincipal);

    expect(ctx.manifest.rowScope).toBe("own");
    expect(ctx.manifest.scopeIds).toBeUndefined();

    const { rows, total } = dal.list!(ctx);

    expect(total).toBe(1);
    expect(rows[0]?.id).toBe(WIDGET_BRANCH_A_ID);
  });
});
