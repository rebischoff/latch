/**
 * Minimal Drizzle schema for codegen spike (task 02 cross-check target).
 */
import { pgTable, text } from "drizzle-orm/pg-core";

export const widgets = pgTable("widgets", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
});

export const widgetTags = pgTable("widget_tags", {
  widgetId: text("widget_id").notNull(),
  tag: text("tag").notNull(),
});
