import { createSurfaceDal } from "@latch/dal";

import {
  widgetDetailDescriptor,
  type WidgetDetailRow,
} from "../../modules/widget/generated/widget_detail.glue.generated.js";
import {
  widgetListDescriptor,
  type WidgetListRow,
} from "../../modules/widget/generated/widget_list.glue.generated.js";
import {
  createWidgetStoreAdapter,
  type MemoryWidgetStore,
} from "./memory-widget-store.js";

type WidgetStoreRow = WidgetListRow & WidgetDetailRow & { id: string };

export const createWidgetListDal = (store: MemoryWidgetStore) =>
  createSurfaceDal<WidgetStoreRow, never>(
    widgetListDescriptor,
    createWidgetStoreAdapter(store),
  );

export const createWidgetDetailDal = (store: MemoryWidgetStore) =>
  createSurfaceDal<WidgetStoreRow, never>(
    widgetDetailDescriptor,
    createWidgetStoreAdapter(store),
  );
