import fs from "node:fs";
import path from "node:path";

/**
 * Next.js 16 static export on Windows passes backslash-separated relative paths
 * into `convertSegmentPathToStaticExportFilename`, which only replaces `/`,
 * emitting nested `__next.<seg>/.../__PAGE__.txt` directories instead of
 * flat `__next.<seg>....__PAGE__.txt` files. This normalizes them after build.
 */
function flattenNextSegmentDirs(dir: string): number {
  let fixed = 0;
  if (!fs.existsSync(dir)) return 0;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (!entry.isDirectory()) continue;

    if (entry.name.startsWith("__next.")) {
      const stack = [fullPath];
      while (stack.length > 0) {
        const cur = stack.pop()!;
        for (const sub of fs.readdirSync(cur, { withFileTypes: true })) {
          const subPath = path.join(cur, sub.name);
          if (sub.isDirectory()) {
            stack.push(subPath);
          } else {
            const rel = path.relative(dir, subPath);
            const flatName = rel.split(path.sep).join(".");
            const dest = path.join(dir, flatName);
            fs.copyFileSync(subPath, dest);
            fixed++;
          }
        }
      }
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fixed += flattenNextSegmentDirs(fullPath);
    }
  }
  return fixed;
}

const outDir = path.resolve("out");
const count = flattenNextSegmentDirs(outDir);
if (count > 0) {
  console.log(`Flattened ${count} static export segment file(s) in out/.`);
}
