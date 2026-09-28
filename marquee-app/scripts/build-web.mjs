// Copies the show-picker web app into www/ for Capacitor to bundle.
// show-picker/ stays the single source of truth (and keeps working on
// GitHub Pages with its shared Supabase list); the app build swaps that
// storage out for src/store-local.js, which keeps everything on the
// device, and drops the Supabase scripts entirely.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "..", "show-picker");
const out = join(root, "www");

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const f of ["index.html", "app.js", "style.css", "tmdb-config.js"]) {
  cpSync(join(src, f), join(out, f));
}
cpSync(join(root, "src/store-local.js"), join(out, "store-local.js"));

function replaceTag(html, pattern, replacement) {
  if (!pattern.test(html)) {
    throw new Error(`Couldn't find ${pattern} in show-picker/index.html — update build-web.mjs to match.`);
  }
  return html.replace(pattern, replacement);
}

const indexPath = join(out, "index.html");
let html = readFileSync(indexPath, "utf8");
html = replaceTag(html, /\s*<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@[^"]+"><\/script>/, "");
html = replaceTag(html, /\s*<script src="supabase-config\.js"><\/script>/, "");
html = replaceTag(html, /<script src="store-supabase\.js"><\/script>/, '<script src="store-local.js"></script>');
writeFileSync(indexPath, html);

console.log(`Built ${out}`);
