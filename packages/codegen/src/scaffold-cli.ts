import {
  resolveScaffoldTarget,
  scaffoldApp,
  toPackageName,
} from "./scaffold.js";

const slugFromArgv = (): string => {
  const positional = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
  const slug = positional[0]?.trim();
  if (!slug) {
    console.error("Usage: latch new <name>");
    console.error("  In a Latch monorepo  → creates apps/<name>");
    console.error("  Standalone           → creates ./<name> (or '.' in place)");
    process.exit(1);
  }
  return slug;
};

const printMonorepoNextSteps = (slug: string, port: string): void => {
  const pkg = toPackageName(slug);
  console.log(`Created apps/${slug} (${pkg})`);
  console.log("");
  console.log("Next steps:");
  console.log(`  1. cp apps/${slug}/.env.example apps/${slug}/.env.local`);
  console.log(
    "     Set DATABASE_URL, AUTH_SECRET, LATCH_APP_ROLE_PASSWORD (Neon requires a non-default password).",
  );
  console.log(`  2. node scripts/db-migrate.mjs --app=${slug}`);
  console.log(
    `  3. Add *.surface.yaml under apps/${slug}/modules/ (Phase 1 — see apps/docs/phase-01-first-app.md)`,
  );
  console.log("  4. npm run codegen");
  console.log(`  5. npm run dev -w ${pkg}  (port ${port})`);
};

const printStandaloneNextSteps = (
  label: string,
  slug: string,
  port: string,
): void => {
  const pkg = toPackageName(slug);
  console.log(`Created ${label} (${pkg})`);
  console.log("");
  console.log("Next steps:");
  if (label !== ".") {
    console.log(`  1. cd ${slug}`);
  }
  console.log(`  ${label === "." ? 1 : 2}. cp .env.example .env.local`);
  console.log(
    "     Set DATABASE_URL, AUTH_SECRET, LATCH_APP_ROLE_PASSWORD (Neon requires a non-default password).",
  );
  console.log(`  ${label === "." ? 2 : 3}. npm install`);
  console.log(`  ${label === "." ? 3 : 4}. Apply migrations/*.sql to your database.`);
  console.log(`  ${label === "." ? 4 : 5}. Add *.surface.yaml under modules/, then run codegen.`);
  console.log(`  ${label === "." ? 5 : 6}. npm run dev  (port ${port})`);
  console.log("");
  console.log(
    "Note: standalone apps depend on published @latch/* packages and a portable",
  );
  console.log("migrate command — packaging is tracked for Phase 07.");
};

const main = (): void => {
  const rawSlug = slugFromArgv();

  let target: ReturnType<typeof resolveScaffoldTarget>;
  try {
    target = resolveScaffoldTarget(rawSlug);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  let port: string;
  try {
    ({ port } = scaffoldApp(target));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  console.log("");
  if (target.isMonorepo) {
    printMonorepoNextSteps(target.slug, port);
  } else {
    printStandaloneNextSteps(target.label, target.slug, port);
  }
};

main();
