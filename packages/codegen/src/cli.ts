import { generateAllSurfaces } from "./generate.js";
import { runCodegen } from "./run.js";

const main = async (): Promise<void> => {
  const check = process.argv.includes("--check");
  const result = await runCodegen(check);

  if (check) {
    if (result.ok) {
      console.log("codegen: check passed");
      return;
    }

    console.error("codegen: drift detected — run `npm run codegen`");
    for (const file of result.drift ?? []) {
      console.error(`  ${file}`);
    }
    process.exitCode = 1;
    return;
  }

  for (const file of result.written ?? []) {
    console.log(`codegen: wrote ${file}`);
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

export { generateAllSurfaces };
