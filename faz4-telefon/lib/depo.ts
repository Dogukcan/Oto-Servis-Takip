import type { Arac, Islem } from "./types";
import {
  plakaAnahtari,
  plakaBicimle,
  tarihGecerliMi,
  yerelTarihISO,
} from "./format";
import { MAKS_METIN_UZUNLUGU } from "./kayit-dogrula";

// The whole data set of the phone version as one plain, JSON-serialisable
// value, plus pure functions over it. Storage (IndexedDB etc.) is handled
// elsewhere; nothing in this file touches browser APIs. Every function that
// "changes" the data returns a new Veri and leaves its input untouched.

export interface KullanimGunu {
  acilis: number;
  kayit: number;
  whatsapp: number;
}

export interface Veri {
  surum: 1;
  araclar: Arac[]; // every vehicle with its full job history, oldest job first
  kullanim: Record<string, KullanimGunu>; // key: local day "YYYY-MM-DD"
  sonYedek: string | null; // ISO timestamp of the last export, null if never
}

export type KullanimTuru = "acilis" | "kayit" | "whatsapp";

export type AracGuncellemeSonucu = "tamam" | "bulunamadi" | "plaka-kullanimda";

export type IceAktarmaSonucu =
  | { tamam: true; veri: Veri }
  | { tamam: false; hata: string };

export interface GeriYuklemeFarki {
  silinecekAracSayisi: number;
  silinecekPlakalar: string[];
  kaybolacakIslemSayisi: number;
}

const GUN_MS = 1000 * 60 * 60 * 24;

// ---------------------------------------------------------------------------
// Copy helpers. Values handed out to callers are always fresh copies, so a
// caller editing a returned object can never change the stored data.

function islemKopyala(islem: Islem): Islem {
  return {
    tarih: islem.tarih,
    yapilanIs: islem.yapilanIs,
    // "+ 0" turns -0 into 0; JSON cannot keep -0, so this keeps round-trips exact.
    ucret: islem.ucret + 0,
    garantiBitis: islem.garantiBitis,
    sonrakiBakim: islem.sonrakiBakim,
  };
}

function aracKopyala(arac: Arac): Arac {
  return {
    plaka: arac.plaka,
    musteri: arac.musteri,
    telefon: arac.telefon,
    islemler: arac.islemler.map(islemKopyala),
  };
}

function kullanimKopyala(
  kullanim: Record<string, KullanimGunu>
): Record<string, KullanimGunu> {
  const kopya: Record<string, KullanimGunu> = {};
  for (const gun of Object.keys(kullanim)) {
    const sayac = kullanim[gun];
    kopya[gun] = {
      acilis: sayac.acilis,
      kayit: sayac.kayit,
      whatsapp: sayac.whatsapp,
    };
  }
  return kopya;
}

function veriKopyala(veri: Veri): Veri {
  return {
    surum: 1,
    araclar: veri.araclar.map(aracKopyala),
    kullanim: kullanimKopyala(veri.kullanim),
    sonYedek: veri.sonYedek,
  };
}

// Plain code-unit comparison, like SQLite's default BINARY collation used by
// "ORDER BY a.plaka" in faz3 (identical for the ASCII characters of a plate).
function plakaSirala(a: Arac, b: Arac): number {
  if (a.plaka < b.plaka) return -1;
  if (a.plaka > b.plaka) return 1;
  return 0;
}

// ---------------------------------------------------------------------------
// Queries

export function bosVeri(): Veri {
  return { surum: 1, araclar: [], kullanim: {}, sonYedek: null };
}

// Same shape as tumAraclariGetir in faz3: every vehicle, `islemler` holding
// only its latest job (or nothing), ordered by plate.
export function tumAraclar(veri: Veri): Arac[] {
  return veri.araclar
    .map((arac) => {
      const son = arac.islemler[arac.islemler.length - 1];
      return {
        plaka: arac.plaka,
        musteri: arac.musteri,
        telefon: arac.telefon,
        islemler: son === undefined ? [] : [islemKopyala(son)],
      };
    })
    .sort(plakaSirala);
}

// One vehicle with its full history, oldest job first. Exact plate match, as
// the faz3 query does.
export function aracGetir(veri: Veri, plaka: string): Arac | undefined {
  const arac = veri.araclar.find((a) => a.plaka === plaka);
  return arac === undefined ? undefined : aracKopyala(arac);
}

// ---------------------------------------------------------------------------
// Updates

// Adds a job. A new plate creates the vehicle; an existing one (matched by
// space-free plakaAnahtari, keeping its stored plate text) gets its name
// and phone updated and the job appended to the end of its history.
export function islemEkle(
  veri: Veri,
  plaka: string,
  musteri: string,
  telefon: string,
  islem: Islem
): Veri {
  const yeni = veriKopyala(veri);
  const yeniIslem = islemKopyala(islem);
  const arananAnahtar = plakaAnahtari(plaka);
  const mevcut = yeni.araclar.find(
    (a) => plakaAnahtari(a.plaka) === arananAnahtar
  );
  if (mevcut === undefined) {
    yeni.araclar.push({ plaka, musteri, telefon, islemler: [yeniIslem] });
  } else {
    mevcut.musteri = musteri;
    mevcut.telefon = telefon;
    mevcut.islemler.push(yeniIslem);
  }
  return yeni;
}

// Changes name, phone and, if needed, the plate. A changed plate takes the
// whole job history with it. "34ABC123" and "34 ABC 123" count as the same
// plate in the clash check. On any result other than "tamam" the input value
// itself is returned unchanged.
export function aracGuncelle(
  veri: Veri,
  eskiPlaka: string,
  yeniPlaka: string,
  musteri: string,
  telefon: string
): { sonuc: AracGuncellemeSonucu; veri: Veri } {
  const sira = veri.araclar.findIndex((a) => a.plaka === eskiPlaka);
  if (sira === -1) return { sonuc: "bulunamadi", veri };

  if (yeniPlaka !== eskiPlaka) {
    const yeniAnahtar = plakaAnahtari(yeniPlaka);
    const cakisan = veri.araclar.some(
      (a) => a.plaka !== eskiPlaka && plakaAnahtari(a.plaka) === yeniAnahtar
    );
    if (cakisan) return { sonuc: "plaka-kullanimda", veri };
  }

  const yeni = veriKopyala(veri);
  const arac = yeni.araclar[sira];
  arac.plaka = yeniPlaka;
  arac.musteri = musteri;
  arac.telefon = telefon;
  return { sonuc: "tamam", veri: yeni };
}

// Removes a vehicle together with all of its jobs (exact plate match).
export function aracSil(
  veri: Veri,
  plaka: string
): { silindi: boolean; veri: Veri } {
  const yeni = veriKopyala(veri);
  const kalanlar = yeni.araclar.filter((a) => a.plaka !== plaka);
  const silindi = kalanlar.length !== yeni.araclar.length;
  yeni.araclar = kalanlar;
  return { silindi, veri: yeni };
}

// Increments one usage counter of a local day (today by default). Only counts
// are stored here, never names, phones or plates.
export function kullanimSay(
  veri: Veri,
  tur: KullanimTuru,
  gun: string = yerelTarihISO()
): Veri {
  // A non-day key would make the data fail iceAktar later, so it is a
  // programming error here, reported the same way formatPlaka does.
  if (!tarihGecerliMi(gun)) throw new Error(`Geçersiz gün: ${gun}`);
  const yeni = veriKopyala(veri);
  const sayac = Object.prototype.hasOwnProperty.call(yeni.kullanim, gun)
    ? yeni.kullanim[gun]
    : { acilis: 0, kayit: 0, whatsapp: 0 };
  sayac[tur] += 1;
  yeni.kullanim[gun] = sayac;
  return yeni;
}

// Records that an export was taken at `zaman` (now by default).
export function yedekAlindi(
  veri: Veri,
  zaman: string = new Date().toISOString()
): Veri {
  const yeni = veriKopyala(veri);
  yeni.sonYedek = zaman;
  return yeni;
}

// Restores only `araclar` from a validated backup file, keeping the phone's
// own `kullanim` counters and setting `sonYedek` to `zaman` (now by default).
export function yedektenYukle(
  mevcut: Veri,
  dosyadan: Veri,
  zaman: string = new Date().toISOString()
): Veri {
  return {
    surum: 1,
    araclar: dosyadan.araclar.map(aracKopyala),
    kullanim: kullanimKopyala(mevcut.kullanim),
    sonYedek: zaman,
  };
}

// Compares the phone's current records with a backup file to find vehicles
// that exist only on the phone (matched by space-free plakaAnahtari) and the
// total number of phone jobs that restoring the file would lose. For a vehicle
// present on both sides, jobs are compared across all five fields using
// multiset matching (pooling file vehicles that share a plakaAnahtari), so
// each file job can match at most one equal phone job.
export function geriYuklemeFarki(
  mevcut: Veri,
  dosyadan: Veri
): GeriYuklemeFarki {
  const dosyadakiIslemler = new Map<string, Islem[]>();
  for (const arac of dosyadan.araclar) {
    const anahtar = plakaAnahtari(arac.plaka);
    const havuz = dosyadakiIslemler.get(anahtar);
    if (havuz === undefined) {
      dosyadakiIslemler.set(anahtar, [...arac.islemler]);
    } else {
      havuz.push(...arac.islemler);
    }
  }

  const silinecekPlakalar: string[] = [];
  let kaybolacakIslemSayisi = 0;

  for (const arac of mevcut.araclar) {
    const anahtar = plakaAnahtari(arac.plaka);
    const kalanIslemler = dosyadakiIslemler.get(anahtar);
    if (kalanIslemler === undefined) {
      silinecekPlakalar.push(arac.plaka);
      kaybolacakIslemSayisi += arac.islemler.length;
    } else {
      for (const islem of arac.islemler) {
        const eslesenSira = kalanIslemler.findIndex(
          (d) =>
            d.tarih === islem.tarih &&
            d.yapilanIs === islem.yapilanIs &&
            d.ucret === islem.ucret &&
            d.garantiBitis === islem.garantiBitis &&
            d.sonrakiBakim === islem.sonrakiBakim
        );
        if (eslesenSira === -1) {
          kaybolacakIslemSayisi += 1;
        } else {
          kalanIslemler.splice(eslesenSira, 1);
        }
      }
    }
  }

  return {
    silinecekAracSayisi: silinecekPlakalar.length,
    silinecekPlakalar,
    kaybolacakIslemSayisi,
  };
}

// Whole local calendar days between the last export and `buAn`; null if no
// export was ever taken. Both instants are reduced to their local calendar
// day and compared as UTC midnights, so DST changes cannot skew the count.
export function sonYedektenBuYanaGun(
  veri: Veri,
  buAn: Date = new Date()
): number | null {
  if (veri.sonYedek === null) return null;
  const yedek = new Date(veri.sonYedek);
  if (Number.isNaN(yedek.getTime())) return null;
  const yedekGunu = Date.UTC(
    yedek.getFullYear(),
    yedek.getMonth(),
    yedek.getDate()
  );
  const buGun = Date.UTC(buAn.getFullYear(), buAn.getMonth(), buAn.getDate());
  return Math.round((buGun - yedekGunu) / GUN_MS);
}

// ---------------------------------------------------------------------------
// Export / import

export function disaAktar(veri: Veri): string {
  return JSON.stringify(veriKopyala(veri), null, 2);
}

function duzNesneMi(deger: unknown): deger is Record<string, unknown> {
  return typeof deger === "object" && deger !== null && !Array.isArray(deger);
}

function negatifOlmayanTamSayiMi(deger: unknown): deger is number {
  return typeof deger === "number" && Number.isInteger(deger) && deger >= 0;
}

class IceAktarmaHatasi extends Error {}

function reddet(mesaj: string): never {
  throw new IceAktarmaHatasi(mesaj);
}

function islemOku(ham: unknown, aracNo: number, islemNo: number): Islem {
  const yer = `${aracNo}. araçtaki ${islemNo}. işlem`;
  if (!duzNesneMi(ham)) reddet(`${yer} okunamadı.`);
  const { tarih, yapilanIs, ucret, garantiBitis, sonrakiBakim } = ham;
  if (typeof tarih !== "string" || !tarihGecerliMi(tarih)) {
    reddet(`${yer}: tarih geçersiz.`);
  }
  if (typeof yapilanIs !== "string") {
    reddet(`${yer}: yapılan iş geçersiz.`);
  }
  if (typeof ucret !== "number" || !Number.isFinite(ucret) || ucret < 0) {
    reddet(`${yer}: ücret geçersiz.`);
  }
  if (
    typeof garantiBitis !== "string" ||
    (garantiBitis !== "" && !tarihGecerliMi(garantiBitis))
  ) {
    reddet(`${yer}: garanti bitiş tarihi geçersiz.`);
  }
  if (typeof sonrakiBakim !== "string" || !tarihGecerliMi(sonrakiBakim)) {
    reddet(`${yer}: sonraki bakım tarihi geçersiz.`);
  }
  return {
    tarih,
    yapilanIs,
    ucret: ucret + 0,
    garantiBitis,
    sonrakiBakim,
  };
}

function aracOku(ham: unknown, aracNo: number): Arac {
  const yer = `${aracNo}. araç`;
  if (!duzNesneMi(ham)) reddet(`${yer} okunamadı.`);
  const { plaka, musteri, telefon, islemler } = ham;
  if (typeof plaka !== "string" || plaka.trim() === "") {
    reddet(`${yer}: plaka eksik.`);
  }
  if (
    typeof musteri !== "string" ||
    musteri.trim() === "" ||
    musteri.length > MAKS_METIN_UZUNLUGU
  ) {
    reddet(
      `${yer}: müşteri adı boş olamaz, en fazla ${MAKS_METIN_UZUNLUGU} karakter olabilir.`
    );
  }
  if (typeof telefon !== "string") {
    reddet(`${yer}: telefon eksik.`);
  }
  if (!Array.isArray(islemler)) {
    reddet(`${yer}: işlem listesi okunamadı.`);
  }
  return {
    plaka: plakaBicimle(plaka) ?? plaka.trim(),
    musteri,
    telefon,
    islemler: islemler.map((islem: unknown, i: number) =>
      islemOku(islem, aracNo, i + 1)
    ),
  };
}

function kullanimOku(ham: unknown): Record<string, KullanimGunu> {
  if (!duzNesneMi(ham)) reddet("Kullanım bilgisi okunamadı.");
  const sonuc: Record<string, KullanimGunu> = {};
  for (const gun of Object.keys(ham)) {
    // Keys must be real days; this also keeps keys like "__proto__" out.
    if (!tarihGecerliMi(gun)) reddet(`Kullanım bilgisinde geçersiz gün: ${gun}`);
    const sayac = ham[gun];
    if (!duzNesneMi(sayac)) reddet(`${gun} kullanım bilgisi okunamadı.`);
    const { acilis, kayit, whatsapp } = sayac;
    if (
      !negatifOlmayanTamSayiMi(acilis) ||
      !negatifOlmayanTamSayiMi(kayit) ||
      !negatifOlmayanTamSayiMi(whatsapp)
    ) {
      reddet(`${gun} kullanım sayıları geçersiz.`);
    }
    sonuc[gun] = { acilis, kayit, whatsapp };
  }
  return sonuc;
}

// Parses and strictly validates an exported file. Unknown extra keys are
// dropped. Never throws: every problem comes back as a Turkish message.
export function iceAktar(metin: string): IceAktarmaSonucu {
  try {
    if (typeof metin !== "string") reddet("Yedek dosyası okunamadı.");

    let ham: unknown;
    try {
      ham = JSON.parse(metin);
    } catch {
      reddet("Yedek dosyası okunamadı: dosya bozuk ya da yedek dosyası değil.");
    }

    if (!duzNesneMi(ham)) reddet("Yedek dosyası okunamadı: beklenen biçimde değil.");
    if (ham.surum !== 1) reddet("Bu yedek dosyasının sürümü desteklenmiyor.");
    if (!Array.isArray(ham.araclar)) reddet("Yedek dosyasında araç listesi yok.");

    const araclar = ham.araclar.map((arac: unknown, i: number) =>
      aracOku(arac, i + 1)
    );

    const gorulen = new Set<string>();
    for (const arac of araclar) {
      const anahtar = plakaAnahtari(arac.plaka);
      if (gorulen.has(anahtar)) {
        reddet(`${arac.plaka} plakası yedekte birden fazla araçta var.`);
      }
      gorulen.add(anahtar);
    }

    const kullanim = kullanimOku(ham.kullanim);

    const sonYedek = ham.sonYedek;
    if (
      sonYedek !== null &&
      (typeof sonYedek !== "string" || Number.isNaN(Date.parse(sonYedek)))
    ) {
      reddet("Son yedek zamanı geçersiz.");
    }

    return {
      tamam: true,
      veri: { surum: 1, araclar, kullanim, sonYedek },
    };
  } catch (e) {
    if (e instanceof IceAktarmaHatasi) return { tamam: false, hata: e.message };
    return { tamam: false, hata: "Yedek dosyası okunamadı." };
  }
}
