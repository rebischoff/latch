"use client";

import type { Manifest } from "@latch/contracts";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useSearchParams } from "next/navigation";

import {
  applyPresetUi,
  EMPTY_PLAYGROUND_DTO,
  parsePlaygroundRecordId,
  PLAYGROUND_FAST_NETWORK_MS,
  PLAYGROUND_PRESET_ALIASES,
  PLAYGROUND_PRESETS,
  PLAYGROUND_RECORDS,
  PLAYGROUND_SLOW_NETWORK_MS,
  type PlaygroundDto,
  type PlaygroundPresetId,
  type PlaygroundRecordId,
  type PlaygroundUiState,
} from "./playground-fixtures";

type PlaygroundContextValue = {
  manifest: Manifest;
  dto: PlaygroundDto;
  recordId: PlaygroundRecordId;
  recordParam: string | null;
  isNewRecord: boolean;
  hasLoaded: boolean;
  transitioning: boolean;
  ui: PlaygroundUiState;
  isDirty: boolean;
  lastSubmit: Record<string, unknown> | null;
  preset: PlaygroundPresetId;
  setManifest: Dispatch<SetStateAction<Manifest>>;
  setUi: Dispatch<SetStateAction<PlaygroundUiState>>;
  setIsDirty: Dispatch<SetStateAction<boolean>>;
  setLastSubmit: Dispatch<SetStateAction<Record<string, unknown> | null>>;
};

const PlaygroundContext = createContext<PlaygroundContextValue | null>(null);

const parsePreset = (value: string | null): PlaygroundPresetId => {
  if (value && value in PLAYGROUND_PRESETS) {
    return value as PlaygroundPresetId;
  }
  if (value && value in PLAYGROUND_PRESET_ALIASES) {
    return PLAYGROUND_PRESET_ALIASES[value];
  }
  return "admin";
};

const resolveRecordDto = (
  recordParam: string | null,
  recordId: PlaygroundRecordId,
): PlaygroundDto => {
  if (recordParam === "new") {
    return EMPTY_PLAYGROUND_DTO;
  }
  return PLAYGROUND_RECORDS[recordId];
};

type PlaygroundProviderProps = {
  children: ReactNode;
};

export const PlaygroundProvider = ({ children }: PlaygroundProviderProps) => {
  const searchParams = useSearchParams();
  const preset = parsePreset(searchParams.get("preset"));
  const recordParam = searchParams.get("record");
  const recordId = parsePlaygroundRecordId(recordParam);
  const isNewRecord = recordParam === "new";

  const [manifest, setManifest] = useState<Manifest>(
    () => PLAYGROUND_PRESETS[preset],
  );
  const [ui, setUi] = useState<PlaygroundUiState>(() => applyPresetUi(preset));
  const [isDirty, setIsDirty] = useState(false);
  const [lastSubmit, setLastSubmit] = useState<Record<string, unknown> | null>(
    null,
  );
  const [dto, setDto] = useState<PlaygroundDto>(() =>
    resolveRecordDto(recordParam, recordId),
  );
  const [hasLoaded, setHasLoaded] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const loadGeneration = useRef(0);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    setManifest(PLAYGROUND_PRESETS[preset]);
    setUi(applyPresetUi(preset));
    setLastSubmit(null);
    setIsDirty(false);
  }, [preset]);

  useEffect(() => {
    if (ui.loading) {
      return;
    }

    const generation = ++loadGeneration.current;
    const isInitialLoad = !hasLoadedRef.current;
    const delayMs = ui.slowNetwork
      ? PLAYGROUND_SLOW_NETWORK_MS
      : PLAYGROUND_FAST_NETWORK_MS;

    if (isInitialLoad) {
      setTransitioning(false);
    } else {
      setTransitioning(true);
    }

    const timer = window.setTimeout(() => {
      if (generation !== loadGeneration.current) {
        return;
      }

      setDto(resolveRecordDto(recordParam, recordId));
      hasLoadedRef.current = true;
      setHasLoaded(true);
      setTransitioning(false);
      setLastSubmit(null);
      setIsDirty(false);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [recordId, recordParam, ui.loading, ui.slowNetwork]);

  const value = useMemo(
    () => ({
      manifest,
      dto,
      recordId,
      recordParam,
      isNewRecord,
      hasLoaded,
      transitioning,
      ui,
      isDirty,
      lastSubmit,
      preset,
      setManifest,
      setUi,
      setIsDirty,
      setLastSubmit,
    }),
    [
      dto,
      hasLoaded,
      isDirty,
      isNewRecord,
      lastSubmit,
      manifest,
      preset,
      recordId,
      recordParam,
      transitioning,
      ui,
    ],
  );

  return (
    <PlaygroundContext.Provider value={value}>{children}</PlaygroundContext.Provider>
  );
};

export const usePlayground = (): PlaygroundContextValue => {
  const context = useContext(PlaygroundContext);
  if (context === null) {
    throw new Error("usePlayground must be used within PlaygroundProvider");
  }
  return context;
};
