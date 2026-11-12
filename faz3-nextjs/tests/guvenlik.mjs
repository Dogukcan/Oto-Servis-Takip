// Safety guard shared by every test file that touches the database.
// Call it (with await) at the top of a test file, BEFORE importing any app
// module that opens the database. It throws, failing the whole file at once,
// if the paths the app resolved could point into the project directory
// (where the real servis.db and yedek-durum.json live), or if the setup file
// was not loaded.
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJE_KOKU = fileURLToPath(new URL("../", import.meta.url));

function projeIcindeMi(dosyaYolu) {
  const goreli = path.relative(PROJE_KOKU, path.resolve(dosyaYolu));
  if (goreli === "") return true;
  if (path.isAbsolute(goreli)) return false; // other drive on Windows
  return !(goreli === ".." || goreli.startsWith(".." + path.sep));
}

export async function guvenliYollariDogrula() {
  if (!process.env.SERVIS_TEST_KLASORU) {
    throw new Error(
      "tests/kurulum.mjs was not loaded; run the tests with `npm test`."
    );
  }
  if (process.env.YEDEK_KLASORU) {
    throw new Error("YEDEK_KLASORU must be unset while tests start.");
  }
  // lib/dosya-yollari.ts has no side effects: it only computes the paths.
  const { DB_YOLU, YEDEK_DURUM_YOLU } = await import("../lib/dosya-yollari.ts");
  for (const yol of [DB_YOLU, YEDEK_DURUM_YOLU]) {
    if (projeIcindeMi(yol)) {
      throw new Error(`Refusing to run: test path is inside the project: ${yol}`);
    }
  }
  return { DB_YOLU, YEDEK_DURUM_YOLU, geciciKlasor: process.env.SERVIS_TEST_KLASORU };
}

// Minimal valid job used by several tests.
export function ornekIslem(degisiklik = {}) {
  return {
    tarih: "2026-11-01",
    yapilanIs: "Akü değişimi",
    ucret: 1500,
    garantiBitis: "2027-11-01",
    sonrakiBakim: "2027-05-01",
    ...degisiklik,
  };
}
