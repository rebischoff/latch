import { definePolicyRegistry } from "@latch/policy";

import { contactDetailSurfacePolicyDef } from "../modules/contact/generated/contact_detail.schema.generated.js";
import { contactListSurfacePolicyDef } from "../modules/contact/generated/contact_list.schema.generated.js";
import { customerListSurfacePolicyDef } from "../modules/contact/generated/customer_list.schema.generated.js";
import { manufacturerListSurfacePolicyDef } from "../modules/contact/generated/manufacturer_list.schema.generated.js";
import { vendorListSurfacePolicyDef } from "../modules/contact/generated/vendor_list.schema.generated.js";
import { employeeDetailSurfacePolicyDef } from "../modules/employee/generated/employee_detail.schema.generated.js";
import { employeeListSurfacePolicyDef } from "../modules/employee/generated/employee_list.schema.generated.js";
import { roleDetailSurfacePolicyDef } from "../modules/iam/generated/role_detail.schema.generated.js";
import { roleListSurfacePolicyDef } from "../modules/iam/generated/role_list.schema.generated.js";
import { userDetailSurfacePolicyDef } from "../modules/iam/generated/user_detail.schema.generated.js";
import { userListSurfacePolicyDef } from "../modules/iam/generated/user_list.schema.generated.js";
import { userRolesDetailSurfacePolicyDef } from "../modules/iam/generated/user_roles_detail.schema.generated.js";

export const subhubRegistry = definePolicyRegistry(
  userListSurfacePolicyDef,
  userDetailSurfacePolicyDef,
  roleListSurfacePolicyDef,
  roleDetailSurfacePolicyDef,
  userRolesDetailSurfacePolicyDef,
  contactListSurfacePolicyDef,
  contactDetailSurfacePolicyDef,
  customerListSurfacePolicyDef,
  vendorListSurfacePolicyDef,
  manufacturerListSurfacePolicyDef,
  employeeListSurfacePolicyDef,
  employeeDetailSurfacePolicyDef,
);
