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
import { cozumleyiciyiKaydet } from "../scripts/cozumleyici.mjs";

delete process.env.YEDEK_KLASORU;

const geciciKlasor = fs.mkdtempSync(path.join(os.tmpdir(), "servis-test-"));
process.env.SERVIS_TEST_KLASORU = geciciKlasor;
process.env.SERVIS_DB_YOLU = path.join(geciciKlasor, "servis.db");
process.env.SERVIS_YEDEK_DURUM_YOLU = path.join(geciciKlasor, "yedek-durum.json");
process.env.SERVIS_ORNEK_VERI = "1";

// Best effort clean-up. On Windows this can fail while a file is still open;
// that only leaves a folder in the OS temp directory behind.
process.on("exit", () => {
  try {
    fs.rmSync(geciciKlasor, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

cozumleyiciyiKaydet();
