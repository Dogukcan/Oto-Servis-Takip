import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const VERSION_PLACEHOLDER = '"__SW_SURUM__"';
const LIST_PLACEHOLDER = '["__SW_LISTE__"]';
const ROOT_EXCLUDED_NAMES = new Set(["sw.js", "404.html", "404", "_not-found"]);

// Recursively collects relative POSIX paths for all cacheable files in `outKlasoru`.
// Skips any file or directory starting with `.` and skips root-level excluded entries.
function collectRelativeFiles(outKlasoru) {
  const rootDir = path.resolve(outKlasoru);
  const files = [];

  function walk(currentDir, relativeSegments) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        continue;
      }
      if (relativeSegments.length === 0 && ROOT_EXCLUDED_NAMES.has(entry.name)) {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);
      const nextSegments = [...relativeSegments, entry.name];

      if (entry.isDirectory()) {
        walk(fullPath, nextSegments);
      } else if (entry.isFile()) {
        files.push(nextSegments.join("/"));
      }
    }
  }

  walk(rootDir, []);
  files.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return files;
}

// Encodes a single path segment using URI rules while also percent-encoding `?` and `#`.
function encodePathSegment(segment) {
  return encodeURI(segment).replace(/\?/g, "%3F").replace(/#/g, "%23");
}

// Converts a relative POSIX file path into a service-worker-relative URL string.
function toCacheUrl(relativePosixPath) {
  const segments = relativePosixPath.split("/");
  if (segments.length === 1 && segments[0] === "index.html") {
    return "./";
  }
  if (segments.length > 1 && segments[segments.length - 1] === "index.html") {
    const encodedDirs = segments.slice(0, -1).map(encodePathSegment).join("/");
    return `./${encodedDirs}/`;
  }
  const encodedPath = segments.map(encodePathSegment).join("/");
  return `./${encodedPath}`;
}

// Walks `outKlasoru` recursively and returns a sorted array of URL strings
// relative to the service worker scope.
export function onbellekListesiCikar(outKlasoru) {
  const files = collectRelativeFiles(outKlasoru);
  const urls = files.map(toCacheUrl);
  urls.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return urls;
}

// Computes the first 16 hex characters of a SHA-256 digest over all cacheable
// files in `outKlasoru` in sorted order, plus `sablonMetni`.
export function surumHesapla(outKlasoru, sablonMetni = "") {
  const rootDir = path.resolve(outKlasoru);
  const files = collectRelativeFiles(outKlasoru);
  const overallHash = crypto.createHash("sha256");

  for (const relativePosixPath of files) {
    const fullPath = path.join(rootDir, ...relativePosixPath.split("/"));
    const content = fs.readFileSync(fullPath);
    const contentHex = crypto.createHash("sha256").update(content).digest("hex");

    overallHash.update(relativePosixPath, "utf8");
    overallHash.update(Buffer.from([0]));
    overallHash.update(contentHex, "utf8");
    overallHash.update("\n", "utf8");
  }

  overallHash.update("---sw-template---\n", "utf8");
  overallHash.update(String(sablonMetni), "utf8");

  return overallHash.digest("hex").slice(0, 16);
}

function countOccurrences(text, placeholder) {
  return text.split(placeholder).length - 1;
}

// Replaces the version and file-list placeholders in `sablonMetni`.
// Throws an Error if either placeholder does not occur exactly once.
export function swIcerigiUret(sablonMetni, surum, liste) {
  if ( typeof sablonMetni !== "string" ) {
    throw new Error("Service worker template must be a string.");
  }

  const versionCount = countOccurrences(sablonMetni, VERSION_PLACEHOLDER);
  if (versionCount !== 1) {
    throw new Error(
      `Placeholder ${VERSION_PLACEHOLDER} must occur exactly once in template (found ${versionCount}).`
    );
  }

  const listCount = countOccurrences(sablonMetni, LIST_PLACEHOLDER);
  if (listCount !== 1) {
    throw new Error(
      `Placeholder ${LIST_PLACEHOLDER} must occur exactly once in template (found ${listCount}).`
    );
  }

  return sablonMetni
    .replace(VERSION_PLACEHOLDER, () => JSON.stringify(surum))
    .replace(LIST_PLACEHOLDER, () => JSON.stringify(liste));
}

// Reads `out/sw.js` as a template, injects the computed version and cache list,
// writes the result back to `out/sw.js`, and returns `{ surum, dosyaSayisi }`.
export function swYaz(outKlasoru) {
  const swPath = path.join(path.resolve(outKlasoru), "sw.js");
  const templateText = fs.readFileSync(swPath, "utf8");
  const liste = onbellekListesiCikar(outKlasoru);
  const surum = surumHesapla(outKlasoru, templateText);
  const generated = swIcerigiUret(templateText, surum, liste);

  fs.writeFileSync(swPath, generated, "utf8");
  return { surum, dosyaSayisi: liste.length };
}

function isStartedDirectly() {
  if (!process.argv[1]) {
    return false;
  }
  try {
    return (
      fs.realpathSync(process.argv[1]) ===
      fs.realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
}

if (isStartedDirectly()) {
  try {
    const currentFile = fileURLToPath(import.meta.url);
    const outFolder = path.resolve(path.dirname(currentFile), "..", "out");
    const { surum, dosyaSayisi } = swYaz(outFolder);
    console.log(`sw.js generated: version=${surum} files=${dosyaSayisi}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
