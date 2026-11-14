// Module resolution hook so plain Node can import the Next.js TypeScript
// sources with the "@/..." alias, extensionless relative paths, and
// "next/server". Shared by tests/kurulum.mjs and command-line scripts.
import fs from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

const PROJE_KOKU_URL = new URL("../", import.meta.url);
const EKLER = [".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx"];

function dosyaVarMi(url) {
  try {
    return fs.statSync(fileURLToPath(url)).isFile();
  } catch {
    return false;
  }
}

let kaydedildi = false;

export function cozumleyiciyiKaydet() {
  if (kaydedildi) return;
  kaydedildi = true;

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
        const aday = EKLER.map((ek) => new URL(hedef.href + ek)).find(
          dosyaVarMi
        );
        // Nothing matched: let Node report its usual "not found" error.
        if (aday === undefined) return nextResolve(specifier, context);
        hedef = aday;
      }
      return nextResolve(hedef.href, context);
    },
  });
}

cozumleyiciyiKaydet();
