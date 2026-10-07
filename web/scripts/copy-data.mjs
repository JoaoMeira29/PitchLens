// Copy the pipeline's site data (data/site, written by `uv run pitchlens publish`) into public/data
// so Vite serves it in dev and bundles it into the build. Works the same on Windows and macOS.
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const web = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(web, "..", "data", "site");
const target = resolve(web, "public", "data");

if (!existsSync(source)) {
  console.warn(`No site data at ${source}: run \`uv run pitchlens publish\` first.`);
  process.exit(0);
}
rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
console.log(`Copied ${source} to ${target}`);
