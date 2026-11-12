// Test setup, loaded with `node --import ./tests/kurulum.mjs --test ...`.
// The test runner forwards --import to every test file's child process, so
// this file runs once per process, before any app module is loaded.
//
// It does three things:
//  1. Removes YEDEK_KLASORU so a value from the caller's shell can never make
//     a test copy data into a real backup folder.
//  2. Points the database and the backup status file at a fresh temp
//     directory (one per process), via the overrides read in
//     lib/dosya-yollari.ts. The real servis.db is never resolved.
//  3. Registers a resolve hook so Node can load the app sources as they are
//     written for Next.js: "@/lib/x" alias, extensionless "./x" imports, and
//     "next/server" mapped to "next/server.js".
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

delete process.env.YEDEK_KLASORU;

const geciciKlasor = fs.mkdtempSync(path.join(os.tmpdir(), "servis-test-"));
process.env.SERVIS_TEST_KLASORU = geciciKlasor;
process.env.SERVIS_DB_YOLU = path.join(geciciKlasor, "servis.db");
process.env.SERVIS_YEDEK_DURUM_YOLU = path.join(geciciKlasor, "yedek-durum.json");

// Best effort clean-up. On Windows this can fail while a file is still open;
// that only leaves a folder in the OS temp directory behind.
process.on("exit", () => {
  try {
    fs.rmSync(geciciKlasor, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

const PROJE_KOKU_URL = new URL("../", import.meta.url);
const EKLER = [".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx"];

function dosyaVarMi(url) {
  try {
    return fs.statSync(fileURLToPath(url)).isFile();
  } catch {
    return false;
  }
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") {
      return nextResolve("next/server.js", context);
    }

    const ust = context.parentURL;
    let hedef = null;

    if (specifier.startsWith("@/")) {
      hedef = new URL(specifier.slice(2), PROJE_KOKU_URL);
    } else if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      typeof ust === "string" &&
      ust.startsWith("file:") &&
      !ust.includes("/node_modules/")
    ) {
      hedef = new URL(specifier, ust);
    }

    if (hedef === null) return nextResolve(specifier, context);

    if (!dosyaVarMi(hedef)) {
      const aday = EKLER.map((ek) => new URL(hedef.href + ek)).find(dosyaVarMi);
      // Nothing matched: let Node report its usual "not found" error.
      if (aday === undefined) return nextResolve(specifier, context);
      hedef = aday;
    }
    return nextResolve(hedef.href, context);
  },
});
