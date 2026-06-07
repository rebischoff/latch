import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { generateAllSurfaces } from "./generate.js";

export type CodegenResult = {
  ok: boolean;
  drift?: string[];
  written?: string[];
};

/** Generate committed TS from Surface YAML. With `check`, compare without writing. */
export const runCodegen = async (check = false): Promise<CodegenResult> => {
  const files = await generateAllSurfaces();

  if (files.length === 0) {
    throw new Error("No *.surface.yaml files found under apps/*/modules/");
  }

  if (check) {
    const drift: string[] = [];

    for (const { outPath, content } of files) {
      let existing: string;
      try {
        existing = await readFile(outPath, "utf8");
      } catch {
        drift.push(outPath);
        continue;
      }

      if (existing !== content) {
        drift.push(outPath);
      }
    }

    return { ok: drift.length === 0, drift };
  }

  const written: string[] = [];

  for (const { outPath, content } of files) {
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, content, "utf8");
    written.push(outPath);
  }

  return { ok: true, written };
};
