// Test setup, loaded with `node --import ./tests/kurulum.mjs --test ...`.
// The test runner forwards --import to every test file's child process, so
// this file runs once per process, before any app module is loaded.
//
// The lib sources import each other without a file extension ("./format"),
// as they are written for a bundler. This resolve hook lets plain Node load
// them by trying ".ts" (and a few other endings) for relative imports.
import fs from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

const EKLER = [".ts", ".mjs", ".js", "/index.ts"];

function dosyaVarMi(url) {
  try {
    return fs.statSync(fileURLToPath(url)).isFile();
  } catch {
    return false;
  }
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const ust = context.parentURL;
    if (
      !(specifier.startsWith("./") || specifier.startsWith("../")) ||
      typeof ust !== "string" ||
      !ust.startsWith("file:") ||
      ust.includes("/node_modules/")
    ) {
      return nextResolve(specifier, context);
    }

    let hedef = new URL(specifier, ust);
    if (!dosyaVarMi(hedef)) {
      const aday = EKLER.map((ek) => new URL(hedef.href + ek)).find(dosyaVarMi);
      // Nothing matched: let Node report its usual "not found" error.
      if (aday === undefined) return nextResolve(specifier, context);
      hedef = aday;
    }
    return nextResolve(hedef.href, context);
  },
});
