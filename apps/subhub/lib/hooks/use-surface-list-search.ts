"use client";

import { fieldAllows, type FieldId, type Manifest } from "@latch/contracts";
import { useState } from "react";

import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

export const useSurfaceListSearch = (
  manifest: Manifest | undefined,
  searchField: FieldId = "summary",
) => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const showSearch =
    manifest !== undefined && fieldAllows(manifest, searchField, "read");
  const listQuery = debouncedSearch ? { q: debouncedSearch } : undefined;

  return {
    search,
    setSearch,
    debouncedSearch,
    showSearch,
    listQuery,
  };
};
