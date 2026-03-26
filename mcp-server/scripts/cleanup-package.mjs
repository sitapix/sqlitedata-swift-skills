import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.join(path.resolve(__dirname, ".."), "dist");

rmSync(distRoot, { recursive: true, force: true });
