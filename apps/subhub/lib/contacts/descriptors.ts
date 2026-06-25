export {
  contactDetailDescriptor,
  ContactDetailPatchSchema,
  projectContactDetailRow,
  type ContactDetailRelated,
  type ContactDetailRelatedPatch,
  type ContactDetailRow,
  type ContactDetailStoreRelated,
  type PartyEmailPatchRow,
  type PartyEmailRow,
  type PartyPhonePatchRow,
  type PartyPhoneRow,
} from "./descriptors/contact-detail";

export {
  manufacturerDetailDescriptor,
  ManufacturerDetailCreateSchema,
  ManufacturerDetailPatchSchema,
  projectManufacturerDetailRow,
  type ManufacturerDetailRelated,
  type ManufacturerDetailRelatedPatch,
  type ManufacturerDetailRow,
  type ManufacturerDetailStoreRelated,
  type PartyAlsoRoleRow,
} from "./descriptors/manufacturer-detail";

export {
  contactListDescriptor,
  projectContactListRow,
  type ContactListRow,
} from "../../modules/contact/generated/contact_list.glue.generated";

export {
  customerListDescriptor,
  projectCustomerListRow,
  type CustomerListRow,
} from "../../modules/contact/generated/customer_list.glue.generated";

export {
  vendorListDescriptor,
  projectVendorListRow,
  type VendorListRow,
} from "../../modules/contact/generated/vendor_list.glue.generated";

export {
  manufacturerListDescriptor,
  projectManufacturerListRow,
  type ManufacturerListRow,
} from "../../modules/contact/generated/manufacturer_list.glue.generated";
