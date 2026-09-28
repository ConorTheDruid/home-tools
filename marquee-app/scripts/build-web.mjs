// Copies the show-picker web app into www/ for Capacitor to bundle.
// show-picker/ stays the single source of truth (and keeps working on
// GitHub Pages); this just swaps its CDN-hosted supabase-js for the copy
// in node_modules, so the app doesn't depend on jsDelivr being reachable.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "..", "show-picker");
const out = join(root, "www");

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "vendor"), { recursive: true });

for (const f of ["index.html", "app.js", "style.css", "supabase-config.js", "tmdb-config.js"]) {
  cpSync(join(src, f), join(out, f));
}
cpSync(
  join(root, "node_modules/@supabase/supabase-js/dist/umd/supabase.js"),
  join(out, "vendor/supabase.js"),
);

const indexPath = join(out, "index.html");
const html = readFileSync(indexPath, "utf8");
const cdnTag = /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@[^"]+"><\/script>/;
if (!cdnTag.test(html)) {
  throw new Error("Couldn't find the supabase-js CDN <script> in show-picker/index.html — update build-web.mjs to match.");
}
writeFileSync(indexPath, html.replace(cdnTag, '<script src="vendor/supabase.js"></script>'));

console.log(`Built ${out}`);
