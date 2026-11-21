// Lists the company details in lib/legal.ts that are still empty (the privacy policy and the accessibility statement
// show a "[להשלים: …]" placeholder for each). Exits with 1 when something required is missing, so it can gate a launch.
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../lib/legal.ts", import.meta.url), "utf8");
const OPTIONAL = new Set(["accessibilityKnownGaps"]);
const missing = [];
for (const m of src.matchAll(/^\s{2}(\w+):\s*"([^"]*)"/gm)) {
  if (!m[2].trim() && !OPTIONAL.has(m[1])) missing.push(m[1]);
}
if (missing.length) {
  console.log("Still to fill in lib/legal.ts:\n  - " + missing.join("\n  - "));
  process.exit(1);
}
console.log("lib/legal.ts: all required details are filled in.");
