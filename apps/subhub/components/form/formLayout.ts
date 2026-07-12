/** Default max width for readable form sections (Profile, Notes, etc.). */
export const SURFACE_SECTION_MAX_WIDTH = 960;

/** Max width for scalar controls (inputs, selects, pickers) inside the wrapper column. */
export const SURFACE_CONTROL_MAX_WIDTH = 480;

/** Table / list structure caps (applied on the table, not the form shell). */
export const TABLE_WIDTH_MD = 1150;
export const TABLE_WIDTH_LG = 1300;
export const TABLE_WIDTH_XL = 1500;
export const TABLE_WIDTH_XXL = 2200;

/** Shared antd Form layout props — label alignment only; RHF owns values. */
export const formItemLayout = {
  labelCol: { xs: { span: 24 }, sm: { span: 6 } },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 18 },
    style: { maxWidth: SURFACE_CONTROL_MAX_WIDTH },
  },
} as const;

/** Per-item override when a control should use the full wrapper column (no max width). */
export const formItemLayoutFullControl = {
  wrapperCol: { xs: { span: 24 }, sm: { span: 18 } },
} as const;
