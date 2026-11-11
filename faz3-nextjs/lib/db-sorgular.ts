import { db } from "./db";
import type { Arac, Islem } from "./types";
import { otomatikYedekAl } from "./yedekle";

interface SatirOrtak {
  plaka: string;
  musteri: string;
  telefon: string;
  tarih: string | null;
  yapilanIs: string | null;
  ucret: number | null;
  garantiBitis: string | null;
  sonrakiBakim: string | null;
}

function satirdanIslemCikar(satir: SatirOrtak): Islem | null {
  if (satir.tarih === null) return null;
  return {
    tarih: satir.tarih,
    yapilanIs: satir.yapilanIs!,
    ucret: satir.ucret!,
    garantiBitis: satir.garantiBitis!,
    sonrakiBakim: satir.sonrakiBakim!,
  };
}

// Her araç için en son işlemi JOIN ile getirir (liste ve hatırlatma sayfaları için yeterli).
export function tumAraclariGetir(): Arac[] {
  const satirlar = db
    .prepare(
      `SELECT a.plaka, a.musteri, a.telefon,
              i.tarih, i.yapilanIs, i.ucret, i.garantiBitis, i.sonrakiBakim
       FROM araclar a
       LEFT JOIN islemler i ON i.id = (
         SELECT id FROM islemler WHERE plaka = a.plaka ORDER BY id DESC LIMIT 1
       )
       ORDER BY a.plaka`
    )
    .all() as SatirOrtak[];

  return satirlar.map((satir) => {
    const sonIslem = satirdanIslemCikar(satir);
    return {
      plaka: satir.plaka,
      musteri: satir.musteri,
      telefon: satir.telefon,
      islemler: sonIslem ? [sonIslem] : [],
    };
  });
}

// Tek bir aracın tüm işlem geçmişini JOIN ile getirir. LEFT JOIN kullanılıyor
// ki aracın hiç işlemi olmadığı durumda da (ör. ileride "işlemsiz araç ekle"
// akışı gelirse) araç "bulunamadı" yerine boş geçmişle dönsün.
export function aracGetir(plaka: string): Arac | undefined {
  const satirlar = db
    .prepare(
      `SELECT a.plaka, a.musteri, a.telefon,
              i.tarih, i.yapilanIs, i.ucret, i.garantiBitis, i.sonrakiBakim
       FROM araclar a
       LEFT JOIN islemler i ON i.plaka = a.plaka
       WHERE a.plaka = ?
       ORDER BY i.id ASC`
    )
    .all(plaka) as SatirOrtak[];

  if (satirlar.length === 0) return undefined;

  const [ilk] = satirlar;
  const islemler = satirlar
    .map((satir) => satirdanIslemCikar(satir))
    .filter((islem): islem is Islem => islem !== null);

  return {
    plaka: ilk.plaka,
    musteri: ilk.musteri,
    telefon: ilk.telefon,
    islemler,
  };
}

export type AracGuncellemeSonucu = "tamam" | "bulunamadi" | "plaka-kullanimda";

// Müşteri adını, telefonu ve gerekirse plakayı değiştirir. Plaka değişirse
// aracın bütün işlem geçmişi yeni plakaya taşınır. Hepsi tek transaction
// içinde yapılır; bir adım başarısız olursa hiçbir şey değişmez.
export function aracGuncelle(
  eskiPlaka: string,
  yeniPlaka: string,
  musteri: string,
  telefon: string
): AracGuncellemeSonucu {
  const guncelle = db.transaction((): AracGuncellemeSonucu => {
    const mevcut = db
      .prepare("SELECT plaka FROM araclar WHERE plaka = ?")
      .get(eskiPlaka);
    if (!mevcut) return "bulunamadi";

    if (yeniPlaka === eskiPlaka) {
      db.prepare(
        "UPDATE araclar SET musteri = ?, telefon = ? WHERE plaka = ?"
      ).run(musteri, telefon, eskiPlaka);
      return "tamam";
    }

    const cakisan = db
      .prepare("SELECT plaka FROM araclar WHERE plaka = ?")
      .get(yeniPlaka);
    if (cakisan) return "plaka-kullanimda";

    // Yeni satır önce eklenir, işlemler ona bağlanır, eski satır en son silinir.
    // Böylece işlemler hiçbir anda var olmayan bir plakayı göstermez.
    db.prepare(
      "INSERT INTO araclar (plaka, musteri, telefon) VALUES (?, ?, ?)"
    ).run(yeniPlaka, musteri, telefon);
    db.prepare("UPDATE islemler SET plaka = ? WHERE plaka = ?").run(
      yeniPlaka,
      eskiPlaka
    );
    db.prepare("DELETE FROM araclar WHERE plaka = ?").run(eskiPlaka);
    return "tamam";
  });

  const sonuc = guncelle();
  if (sonuc === "tamam") otomatikYedekAl();
  return sonuc;
}

export function islemEkle(
  plaka: string,
  musteri: string,
  telefon: string,
  islem: Islem
): void {
  const mevcut = db
    .prepare("SELECT plaka FROM araclar WHERE plaka = ?")
    .get(plaka);

  if (!mevcut) {
    db.prepare(
      "INSERT INTO araclar (plaka, musteri, telefon) VALUES (?, ?, ?)"
    ).run(plaka, musteri, telefon);
  } else {
    db.prepare(
      "UPDATE araclar SET musteri = ?, telefon = ? WHERE plaka = ?"
    ).run(musteri, telefon, plaka);
  }

  db.prepare(
    `INSERT INTO islemler (plaka, tarih, yapilanIs, ucret, garantiBitis, sonrakiBakim)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    plaka,
    islem.tarih,
    islem.yapilanIs,
    islem.ucret,
    islem.garantiBitis,
    islem.sonrakiBakim
  );

  otomatikYedekAl();
}
