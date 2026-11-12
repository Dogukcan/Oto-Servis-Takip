import Database from "better-sqlite3";
import { DB_YOLU } from "./dosya-yollari";
import { sahteAraclar } from "./sahte-veri";
import { plakaBicimle } from "./format";

// The path comes from lib/dosya-yollari.ts (servis.db in the working directory
// unless a test overrides it).
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

// Eski kayıtlarda plaka yazıldığı gibi saklanıyordu ("34 FGH523"). Bu adım
// onları "34 FGH 523" biçimine çevirir ve işlem geçmişini yeni plakaya taşır.
// Aynı aracın boşluk farkıyla iki kaydı varsa tek kayıtta birleşir; müşteri
// bilgisi olarak doğru biçimli kayıttaki korunur. Her açılışta çalışır ama
// düzeltilecek kayıt kalmadığında hiçbir şey yapmaz. Plaka kuralına uymayan
// eski kayıtlara dokunmaz.
const plakalariTekBicimeGetir = db.transaction(() => {
  const sonIslemNo = db.prepare(
    "SELECT MAX(id) AS no FROM islemler WHERE plaka = ?"
  );
  const araclar = db
    .prepare("SELECT plaka, musteri, telefon FROM araclar")
    .all() as { plaka: string; musteri: string; telefon: string }[];

  for (const arac of araclar) {
    const dogruPlaka = plakaBicimle(arac.plaka);
    if (dogruPlaka === null || dogruPlaka === arac.plaka) continue;

    const hedefVar = db
      .prepare("SELECT plaka FROM araclar WHERE plaka = ?")
      .get(dogruPlaka);
    if (!hedefVar) {
      db.prepare(
        "INSERT INTO araclar (plaka, musteri, telefon) VALUES (?, ?, ?)"
      ).run(dogruPlaka, arac.musteri, arac.telefon);
    } else {
      // İki kayıt birleşiyor. En son iş hangi kayda girildiyse müşteri adı ve
      // telefonu ondan alınır; müşteri numara değiştirdiyse yenisi kalmalı.
      const kaynakSonIs = sonIslemNo.get(arac.plaka) as { no: number | null };
      const hedefSonIs = sonIslemNo.get(dogruPlaka) as { no: number | null };
      if ((kaynakSonIs.no ?? 0) > (hedefSonIs.no ?? 0)) {
        db.prepare(
          "UPDATE araclar SET musteri = ?, telefon = ? WHERE plaka = ?"
        ).run(arac.musteri, arac.telefon, dogruPlaka);
      }
    }
    db.prepare("UPDATE islemler SET plaka = ? WHERE plaka = ?").run(
      dogruPlaka,
      arac.plaka
    );
    db.prepare("DELETE FROM araclar WHERE plaka = ?").run(arac.plaka);
  }
});

// Yazma kilidini baştan alır. Derleme sırasında birkaç süreç bu dosyayı aynı
// anda yüklerse biri diğerini bekler, yarıda kilit hatası vermez.
plakalariTekBicimeGetir.immediate();
