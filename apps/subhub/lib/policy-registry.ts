import { definePolicyRegistry } from "@latch/policy";

import { contactDetailSurfacePolicyDef } from "../modules/contact/generated/contact_detail.schema.generated";
import { contactListSurfacePolicyDef } from "../modules/contact/generated/contact_list.schema.generated";
import { customerListSurfacePolicyDef } from "../modules/contact/generated/customer_list.schema.generated";
import { manufacturerDetailSurfacePolicyDef } from "../modules/contact/generated/manufacturer_detail.schema.generated";
import { manufacturerListSurfacePolicyDef } from "../modules/contact/generated/manufacturer_list.schema.generated";
import { vendorListSurfacePolicyDef } from "../modules/contact/generated/vendor_list.schema.generated";
import { employeeDetailSurfacePolicyDef } from "../modules/employee/generated/employee_detail.schema.generated";
import { employeeListSurfacePolicyDef } from "../modules/employee/generated/employee_list.schema.generated";
import { roleDetailSurfacePolicyDef } from "../modules/iam/generated/role_detail.schema.generated";
import { roleListSurfacePolicyDef } from "../modules/iam/generated/role_list.schema.generated";
import { userDetailSurfacePolicyDef } from "../modules/iam/generated/user_detail.schema.generated";
import { userListSurfacePolicyDef } from "../modules/iam/generated/user_list.schema.generated";
import { userRolesDetailSurfacePolicyDef } from "../modules/iam/generated/user_roles_detail.schema.generated";
import { estimateDetailSurfacePolicyDef } from "../modules/estimate/generated/estimate_detail.schema.generated";
import { estimateListSurfacePolicyDef } from "../modules/estimate/generated/estimate_list.schema.generated";
import { jobPartyRelationTableSurfacePolicyDef } from "../modules/estimate/generated/job_party_relation_table.schema.generated";
import { jobDetailSurfacePolicyDef } from "../modules/job/generated/job_detail.schema.generated";
import { jobListSurfacePolicyDef } from "../modules/job/generated/job_list.schema.generated";
import { partDetailSurfacePolicyDef } from "../modules/part/generated/part_detail.schema.generated";
import { partListSurfacePolicyDef } from "../modules/part/generated/part_list.schema.generated";
import { categoryDetailSurfacePolicyDef } from "../modules/catalog/generated/category_detail.schema.generated";
import { categoryListSurfacePolicyDef } from "../modules/catalog/generated/category_list.schema.generated";
import { siteContactRelationTableSurfacePolicyDef } from "../modules/site/generated/site_contact_relation_table.schema.generated";
import { siteDetailSurfacePolicyDef } from "../modules/site/generated/site_detail.schema.generated";
import { siteListSurfacePolicyDef } from "../modules/site/generated/site_list.schema.generated";

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
  manufacturerDetailSurfacePolicyDef,
  employeeListSurfacePolicyDef,
  employeeDetailSurfacePolicyDef,
  siteListSurfacePolicyDef,
  siteDetailSurfacePolicyDef,
  siteContactRelationTableSurfacePolicyDef,
  estimateListSurfacePolicyDef,
  estimateDetailSurfacePolicyDef,
  jobPartyRelationTableSurfacePolicyDef,
  jobListSurfacePolicyDef,
  jobDetailSurfacePolicyDef,
  partListSurfacePolicyDef,
  partDetailSurfacePolicyDef,
  categoryListSurfacePolicyDef,
  categoryDetailSurfacePolicyDef,
);
