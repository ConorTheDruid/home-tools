// Copies the app's web code (src/) into www/ for Capacitor to bundle.
// src/ is the iOS app's own copy, forked from ../show-picker/ — the two
// are independent now, so changes to one don't carry over to the other.
import { cpSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "www");

rmSync(out, { recursive: true, force: true });
cpSync(join(root, "src"), out, { recursive: true });

console.log(`Built ${out}`);
