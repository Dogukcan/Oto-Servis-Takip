import Database from "better-sqlite3";
import path from "node:path";
import { sahteAraclar } from "./sahte-veri";

const DB_YOLU = path.join(process.cwd(), "servis.db");

export const db = new Database(DB_YOLU);
db.pragma("journal_mode = WAL");

// WAL modunda son yazılanlar servis.db-wal dosyasında kalabilir; yedek almadan
// önce bunları ana servis.db dosyasına yazmak (checkpoint) için kullanılır.
export function dbCheckpointEt(): void {
  db.pragma("wal_checkpoint(TRUNCATE)");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS araclar (
    plaka TEXT PRIMARY KEY,
    musteri TEXT NOT NULL,
    telefon TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS islemler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plaka TEXT NOT NULL REFERENCES araclar(plaka),
    tarih TEXT NOT NULL,
    yapilanIs TEXT NOT NULL,
    ucret INTEGER NOT NULL,
    garantiBitis TEXT NOT NULL,
    sonrakiBakim TEXT NOT NULL
  );
`);

// İlk çalıştırmada veritabanı boşsa, Faz 2/3'te kullanılan sahte veriyle tohumla.
const aracSayisi = (
  db.prepare("SELECT COUNT(*) AS sayi FROM araclar").get() as { sayi: number }
).sayi;

if (aracSayisi === 0) {
  const aracEkle = db.prepare(
    "INSERT INTO araclar (plaka, musteri, telefon) VALUES (?, ?, ?)"
  );
  const islemEkleIfade = db.prepare(
    `INSERT INTO islemler (plaka, tarih, yapilanIs, ucret, garantiBitis, sonrakiBakim)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const tohumla = db.transaction(() => {
    for (const arac of sahteAraclar) {
      aracEkle.run(arac.plaka, arac.musteri, arac.telefon);
      for (const islem of arac.islemler) {
        islemEkleIfade.run(
          arac.plaka,
          islem.tarih,
          islem.yapilanIs,
          islem.ucret,
          islem.garantiBitis,
          islem.sonrakiBakim
        );
      }
    }
  });
  tohumla();
}
