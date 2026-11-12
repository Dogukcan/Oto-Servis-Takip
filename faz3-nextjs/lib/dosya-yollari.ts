import path from "node:path";

// The single place where the data file paths are decided.
// SERVIS_DB_YOLU and SERVIS_YEDEK_DURUM_YOLU exist so the test runner can point
// the app at a temporary directory. When they are unset (or empty) the paths
// are exactly what they always were: servis.db and yedek-durum.json in the
// directory the app was started from.
export const DB_YOLU =
  process.env.SERVIS_DB_YOLU || path.join(process.cwd(), "servis.db");

export const YEDEK_DURUM_YOLU =
  process.env.SERVIS_YEDEK_DURUM_YOLU ||
  path.join(process.cwd(), "yedek-durum.json");
