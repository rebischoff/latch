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
import { jobMaterialRequestListSurfacePolicyDef } from "../modules/job_material_request/generated/job_material_request_list.schema.generated";
import { purchaseOrderDetailSurfacePolicyDef } from "../modules/purchase_order/generated/purchase_order_detail.schema.generated";
import { purchaseOrderListSurfacePolicyDef } from "../modules/purchase_order/generated/purchase_order_list.schema.generated";
import { itemDetailSurfacePolicyDef } from "../modules/catalog/generated/item_detail.schema.generated";
import { itemListSurfacePolicyDef } from "../modules/catalog/generated/item_list.schema.generated";
import { complexityFactorTableSurfacePolicyDef } from "../modules/catalog/generated/complexity_factor_table.schema.generated";
import { freightRateTypeTableSurfacePolicyDef } from "../modules/catalog/generated/freight_rate_type_table.schema.generated";
import { incidentalRateTypeTableSurfacePolicyDef } from "../modules/catalog/generated/incidental_rate_type_table.schema.generated";
import { laborPhaseTableSurfacePolicyDef } from "../modules/catalog/generated/labor_phase_table.schema.generated";
import { laborRateTypeTableSurfacePolicyDef } from "../modules/catalog/generated/labor_rate_type_table.schema.generated";
import { specUnitTableSurfacePolicyDef } from "../modules/catalog/generated/spec_unit_table.schema.generated";
import { markupTypeTableSurfacePolicyDef } from "../modules/catalog/generated/markup_type_table.schema.generated";
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
  jobMaterialRequestListSurfacePolicyDef,
  purchaseOrderListSurfacePolicyDef,
  purchaseOrderDetailSurfacePolicyDef,
  partListSurfacePolicyDef,
  partDetailSurfacePolicyDef,
  itemListSurfacePolicyDef,
  itemDetailSurfacePolicyDef,
  laborRateTypeTableSurfacePolicyDef,
  freightRateTypeTableSurfacePolicyDef,
  incidentalRateTypeTableSurfacePolicyDef,
  markupTypeTableSurfacePolicyDef,
  complexityFactorTableSurfacePolicyDef,
  laborPhaseTableSurfacePolicyDef,
  specUnitTableSurfacePolicyDef,
);
