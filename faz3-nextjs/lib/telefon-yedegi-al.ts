import { db } from "./db";
import { plakaAnahtari } from "./format";
import type { Arac } from "./types";
import { otomatikYedekAl } from "./yedekle";

export interface TelefonYedegiRaporu {
  eklenecekAracSayisi: number;
  eklenecekIslemSayisi: number;
  cakisanPlakalar: string[];
  yazildi: boolean;
}

// Imports validated vehicles and their full job histories from a phone backup
// into the PC SQLite database. If any vehicle's plate (matched by space-free
// plakaAnahtari) already exists in the database, or if `yaz` is false, nothing
// is written. Otherwise all vehicles and jobs are inserted in a single
// transaction in their original order, followed by a single automatic backup.
export function telefonYedeginiIceAl(
  araclar: Arac[],
  secenek: { yaz: boolean }
): TelefonYedegiRaporu {
  const calistir = db.transaction((): TelefonYedegiRaporu => {
    const mevcutSatirlar = db
      .prepare("SELECT plaka FROM araclar")
      .all() as { plaka: string }[];
    const mevcutAnahtarlar = new Set(
      mevcutSatirlar.map((satir) => plakaAnahtari(satir.plaka))
    );

    const cakisanPlakalar: string[] = [];
    let eklenecekAracSayisi = 0;
    let eklenecekIslemSayisi = 0;

    for (const arac of araclar) {
      if (mevcutAnahtarlar.has(plakaAnahtari(arac.plaka))) {
        cakisanPlakalar.push(arac.plaka);
      } else {
        eklenecekAracSayisi += 1;
        eklenecekIslemSayisi += arac.islemler.length;
      }
    }

    if (!secenek.yaz || cakisanPlakalar.length > 0) {
      return {
        eklenecekAracSayisi,
        eklenecekIslemSayisi,
        cakisanPlakalar,
        yazildi: false,
      };
    }

    const aracEkle = db.prepare(
      "INSERT INTO araclar (plaka, musteri, telefon) VALUES (?, ?, ?)"
    );
    const islemEkle = db.prepare(
      `INSERT INTO islemler (plaka, tarih, yapilanIs, ucret, garantiBitis, sonrakiBakim)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    for (const arac of araclar) {
      aracEkle.run(arac.plaka, arac.musteri, arac.telefon);
      for (const islem of arac.islemler) {
        islemEkle.run(
          arac.plaka,
          islem.tarih,
          islem.yapilanIs,
          islem.ucret,
          islem.garantiBitis,
          islem.sonrakiBakim
        );
      }
    }

    return {
      eklenecekAracSayisi,
      eklenecekIslemSayisi,
      cakisanPlakalar,
      yazildi: true,
    };
  });

  const rapor = calistir();
  if (rapor.yazildi) {
    otomatikYedekAl();
  }
  return rapor;
}
