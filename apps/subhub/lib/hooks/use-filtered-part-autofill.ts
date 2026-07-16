"use client";

import { useEffect, useRef } from "react";

export type FilteredPartOption = {
  value: string;
  label: string;
};

type UseFilteredPartAutofillArgs = {
  enabled: boolean;
  itemId: string | null;
  partId: string | null | undefined;
  materialLocked: boolean;
  isLoading: boolean;
  /** Filtered matches only (do not include orphan pinned options). */
  options: FilteredPartOption[];
  onAdopt: (part: FilteredPartOption) => void;
  onClear: () => void;
};

/**
 * UI mirror of O2 / W2a part suggestion:
 * - exactly 1 filtered match → adopt PN without material_locked
 * - 0 or many → clear unlocked part_id (Pick PN / No match)
 * - material_locked → no auto changes
 * - intentional clear while still 1 match is not immediately re-filled
 */
export const useFilteredPartAutofill = ({
  enabled,
  itemId,
  partId,
  materialLocked,
  isLoading,
  options,
  onAdopt,
  onClear,
}: UseFilteredPartAutofillArgs): void => {
  const matchKeyRef = useRef<string>("");
  const onAdoptRef = useRef(onAdopt);
  const onClearRef = useRef(onClear);
  onAdoptRef.current = onAdopt;
  onClearRef.current = onClear;

  const optionsKey = options.map((part) => part.value).join(",");
  const onlyId = options.length === 1 ? options[0]!.value : null;
  const onlyLabel = options.length === 1 ? options[0]!.label : null;

  useEffect(() => {
    if (!enabled || isLoading || materialLocked || !itemId) {
      return;
    }

    const matchKey =
      onlyId !== null
        ? `${itemId}:${onlyId}`
        : `${itemId}:n=${options.length}:${optionsKey}`;

    if (onlyId !== null && onlyLabel !== null) {
      if (partId === onlyId) {
        matchKeyRef.current = matchKey;
        return;
      }
      if (matchKeyRef.current === matchKey) {
        return;
      }
      matchKeyRef.current = matchKey;
      onAdoptRef.current({ value: onlyId, label: onlyLabel });
      return;
    }

    matchKeyRef.current = matchKey;
    if (partId) {
      onClearRef.current();
    }
  }, [
    enabled,
    isLoading,
    materialLocked,
    itemId,
    options.length,
    optionsKey,
    onlyId,
    onlyLabel,
    partId,
  ]);
};
