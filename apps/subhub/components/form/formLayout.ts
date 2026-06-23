/** Default max width for detail forms (playground + production). */
export const SURFACE_FORM_MAX_WIDTH = 960;

/** Max width for scalar controls (inputs, selects, pickers) inside the wrapper column. */
export const SURFACE_CONTROL_MAX_WIDTH = 480;

/** @deprecated Use SURFACE_FORM_MAX_WIDTH */
export const PLAYGROUND_FORM_MAX_WIDTH = SURFACE_FORM_MAX_WIDTH;

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
