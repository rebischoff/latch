import type { PermissionContext } from "@latch/contracts";
import { createSurfaceDal, type SurfaceDal } from "@latch/dal";
import type { Pool } from "pg";

import type { ContactListRow } from "../../modules/contact/generated/contact_list.glue.generated";
import type { CustomerListRow } from "../../modules/contact/generated/customer_list.glue.generated";
import type { ManufacturerListRow } from "../../modules/contact/generated/manufacturer_list.glue.generated";
import type { VendorListRow } from "../../modules/contact/generated/vendor_list.glue.generated";

import {
  contactDetailDescriptor,
  contactListDescriptor,
  customerListDescriptor,
  employeeDetailDescriptor,
  employeeListDescriptor,
  manufacturerDetailDescriptor,
  manufacturerListDescriptor,
  vendorListDescriptor,
} from "./descriptors";
import { createContactDetailStore, createPartyListStore } from "./repository";
import { extendEmployeeDetailDal } from "./stores/employee-detail-create";
import { createEmployeeDetailStore } from "./stores/employee-detail-store";
import { createEmployeeListStore } from "./stores/employee-list-store";
import { extendManufacturerDetailDal } from "./stores/manufacturer-detail-create";
import { createManufacturerDetailStore } from "./stores/manufacturer-detail-store";
import { ensureAuditBootstrap, getPool, getPrincipal } from "../latch";

export type ManufacturerDetailDal = SurfaceDal & {
  create: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
  addRole: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
  removeRole: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
};

export type EmployeeDetailDal = SurfaceDal & {
  create: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
};

export type ContactsDal = {
  contactList: SurfaceDal;
  contactDetail: SurfaceDal;
  customerList: SurfaceDal;
  vendorList: SurfaceDal;
  manufacturerList: SurfaceDal;
  manufacturerDetail: ManufacturerDetailDal;
  employeeList: SurfaceDal;
  employeeDetail: EmployeeDetailDal;
};

export type CreateContactsDalOptions = {
  pool: Pool;
  getActorId: () => Promise<string>;
};

export const createContactsDal = (
  options: CreateContactsDalOptions,
): ContactsDal => {
  const { pool, getActorId } = options;

  const contactListStore = createPartyListStore<ContactListRow>(
    pool,
    getActorId,
  );
  const customerListStore = createPartyListStore<CustomerListRow>(
    pool,
    getActorId,
    "customer",
  );
  const vendorListStore = createPartyListStore<VendorListRow>(
    pool,
    getActorId,
    "vendor",
  );
  const manufacturerListStore = createPartyListStore<ManufacturerListRow>(
    pool,
    getActorId,
    "manufacturer",
  );
  const contactDetailStore = createContactDetailStore(pool, getActorId);
  const manufacturerDetailStore = createManufacturerDetailStore(pool, getActorId);
  const manufacturerDetailBaseDal = createSurfaceDal(
    manufacturerDetailDescriptor,
    manufacturerDetailStore,
  );
  const manufacturerDetail = extendManufacturerDetailDal(
    pool,
    getActorId,
    manufacturerDetailBaseDal,
  );
  const employeeListStore = createEmployeeListStore(pool);
  const employeeDetailStore = createEmployeeDetailStore(pool, getActorId);
  const employeeDetailBaseDal = createSurfaceDal(
    employeeDetailDescriptor,
    employeeDetailStore,
  );
  const employeeDetail = extendEmployeeDetailDal(
    pool,
    getActorId,
    employeeDetailBaseDal,
  );

  return {
    contactList: createSurfaceDal(contactListDescriptor, contactListStore),
    contactDetail: createSurfaceDal(contactDetailDescriptor, contactDetailStore),
    customerList: createSurfaceDal(customerListDescriptor, customerListStore),
    vendorList: createSurfaceDal(vendorListDescriptor, vendorListStore),
    manufacturerList: createSurfaceDal(
      manufacturerListDescriptor,
      manufacturerListStore,
    ),
    manufacturerDetail,
    employeeList: createSurfaceDal(employeeListDescriptor, employeeListStore),
    employeeDetail,
  };
};

let contactsDal: ContactsDal | undefined;

export const getContactsDal = (): ContactsDal => {
  if (!contactsDal) {
    throw new Error("Contacts DAL not initialized — call initContactsDal() first");
  }
  return contactsDal;
};

export const initContactsDal = (options: CreateContactsDalOptions): ContactsDal => {
  contactsDal = createContactsDal(options);
  return contactsDal;
};

export const ensureContactsDal = async (): Promise<ContactsDal> => {
  await ensureAuditBootstrap();

  if (!contactsDal) {
    initContactsDal({
      pool: getPool(),
      getActorId: async () => (await getPrincipal()).id,
    });
  }

  return contactsDal!;
};
