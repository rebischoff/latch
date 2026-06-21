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
  manufacturerListDescriptor,
  vendorListDescriptor,
} from "./descriptors";
import { createContactDetailStore, createPartyListStore } from "./repository";
import { ensureAuditBootstrap, getPool, getPrincipal } from "../latch";

export type ContactsDal = {
  contactList: SurfaceDal;
  contactDetail: SurfaceDal;
  customerList: SurfaceDal;
  vendorList: SurfaceDal;
  manufacturerList: SurfaceDal;
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

  return {
    contactList: createSurfaceDal(contactListDescriptor, contactListStore),
    contactDetail: createSurfaceDal(contactDetailDescriptor, contactDetailStore),
    customerList: createSurfaceDal(customerListDescriptor, customerListStore),
    vendorList: createSurfaceDal(vendorListDescriptor, vendorListStore),
    manufacturerList: createSurfaceDal(
      manufacturerListDescriptor,
      manufacturerListStore,
    ),
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
