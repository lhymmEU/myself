/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const ROOT = path.join(__dirname, "..");
const FLAT = path.join(ROOT, ".next", "standalone-flat");
const SQLITE_DIR = path.join(ROOT, "node_modules", "better-sqlite3");

const electronPkg = JSON.parse(
  fs.readFileSync(path.join(ROOT, "node_modules", "electron", "package.json"), "utf8")
);
const electronVersion = electronPkg.version;
console.log(`[INFO] Electron version: ${electronVersion}`);
console.log(`[INFO] Architecture: ${process.arch}`);

function findFiles(dir, name, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findFiles(full, name, results);
    else if (entry.name === name) results.push(full);
  }
  return results;
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "electron-sqlite-"));
const tmpSqlite = path.join(tmpDir, "better-sqlite3");

console.log(`[INFO] Copying better-sqlite3 source to temp dir: ${tmpDir}`);
execSync(`cp -R "${SQLITE_DIR}" "${tmpSqlite}"`);

const oldBinaries = findFiles(tmpSqlite, "better_sqlite3.node");
for (const bin of oldBinaries) {
  fs.unlinkSync(bin);
}

console.log(`[INFO] Rebuilding better-sqlite3 for Electron ${electronVersion} (${process.arch}) in temp dir...`);
try {
  execSync(
    `npx --yes node-gyp rebuild --runtime=electron --target=${electronVersion} --dist-url=https://electronjs.org/headers --arch=${process.arch}`,
    { cwd: tmpSqlite, stdio: "inherit" }
  );
} catch (err) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.error("[ERROR] node-gyp rebuild failed:", err.message);
  process.exit(1);
}

const newBinaries = findFiles(tmpSqlite, "better_sqlite3.node");
if (newBinaries.length === 0) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.error("[ERROR] Rebuild produced no binary!");
  process.exit(1);
}

const src = newBinaries[0];
const srcStat = fs.statSync(src);
console.log(`[OK] Rebuilt binary: ${src} (${srcStat.size} bytes, ${srcStat.mtime.toISOString()})`);

const dstFiles = findFiles(FLAT, "better_sqlite3.node");
if (dstFiles.length === 0) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.error("[ERROR] No better_sqlite3.node in standalone-flat to replace");
  process.exit(1);
}

for (const dst of dstFiles) {
  const before = fs.statSync(dst);
  console.log(`[INFO] Target: ${dst} (${before.size} bytes)`);
  fs.copyFileSync(src, dst);
  const after = fs.statSync(dst);
  console.log(`[OK]   Replaced: ${after.size} bytes → ${dst}`);
}

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log("[OK] Native module fix complete (node_modules untouched)");
