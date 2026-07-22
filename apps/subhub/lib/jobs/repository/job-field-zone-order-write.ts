/**
 * Field zone Order → JMR snapshot path (tasks 55/56/59) — **retired by task 63**.
 *
 * Order state persists on `job_field_order_cell` (`replaceJobFieldOrderTx`).
 * Open `job_material_request` rows are live-derived via
 * `syncOpenJobMaterialRequestsForJob` (RP1).
 */

export {};
