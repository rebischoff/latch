import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { resolveScaffoldTarget, scaffoldApp } from "./scaffold.js";

describe("scaffoldApp — audit mode", () => {
  let tempRoot: string;

  afterEach(() => {
    if (tempRoot) {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("seeds full audit mode by default", () => {
    tempRoot = mkdtempSync(join(tmpdir(), "latch-scaffold-"));
    const target = resolveScaffoldTarget("demo_app", tempRoot);
    scaffoldApp(target);

    const sql = readFileSync(
      join(target.targetDir, "migrations", "012_latch_app_config.sql"),
      "utf8",
    );
    expect(sql).toContain("VALUES (1, 'full')");
  });

  it("patches latch_app_config seed for --audit-mode=standard", () => {
    tempRoot = mkdtempSync(join(tmpdir(), "latch-scaffold-"));
    const target = resolveScaffoldTarget("demo_app", tempRoot);
    scaffoldApp(target, { auditMode: "standard" });

    const sql = readFileSync(
      join(target.targetDir, "migrations", "012_latch_app_config.sql"),
      "utf8",
    );
    expect(sql).toContain("VALUES (1, 'standard')");
    expect(sql).not.toContain("VALUES (1, 'full')");
  });
});

describe("scaffoldApp — monorepo workspace", () => {
  let tempRoot: string;

  afterEach(() => {
    if (tempRoot) {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("registers the new app in root package.json workspaces", () => {
    tempRoot = mkdtempSync(join(tmpdir(), "latch-scaffold-"));
    writeFileSync(
      join(tempRoot, "package.json"),
      `${JSON.stringify(
        {
          name: "fake-monorepo",
          private: true,
          workspaces: ["packages/*"],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    mkdirSync(join(tempRoot, "packages", "codegen"), { recursive: true });

    const target = resolveScaffoldTarget("my_app", tempRoot);
    expect(target.isMonorepo).toBe(true);
    scaffoldApp(target);

    const rootPkg = JSON.parse(
      readFileSync(join(tempRoot, "package.json"), "utf8"),
    ) as { workspaces: string[] };
    expect(rootPkg.workspaces).toEqual(["packages/*", "my_app"]);
  });

  it("does not duplicate an existing workspace entry", () => {
    tempRoot = mkdtempSync(join(tmpdir(), "latch-scaffold-"));
    writeFileSync(
      join(tempRoot, "package.json"),
      `${JSON.stringify(
        {
          name: "fake-monorepo",
          private: true,
          workspaces: ["packages/*", "my_app"],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    mkdirSync(join(tempRoot, "packages", "codegen"), { recursive: true });

    const target = resolveScaffoldTarget("my_app", tempRoot);
    scaffoldApp(target);

    const rootPkg = JSON.parse(
      readFileSync(join(tempRoot, "package.json"), "utf8"),
    ) as { workspaces: string[] };
    expect(rootPkg.workspaces).toEqual(["packages/*", "my_app"]);
  });
});
