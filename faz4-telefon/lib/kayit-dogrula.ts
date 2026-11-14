import type { Islem } from "./types";
import {
  formatPlaka,
  dogrulaPlaka,
  formatTelefon,
  telefonGecerliMi,
  tarihGecerliMi,
  yerelTarihISO,
} from "./format";

// Pure validation rules shared by the phone version. They mirror the rules of
// the POST /api/kayit and PUT /api/arac route handlers in faz3-nextjs (same
// limits, same Turkish messages), without any request/response handling.

export const MAKS_METIN_UZUNLUGU = 200;

const ISTEK_OKUNAMADI = "İstek okunamadı.";
const MUSTERI_HATASI = `Müşteri adı boş olamaz, en fazla ${MAKS_METIN_UZUNLUGU} karakter olabilir.`;
const YAPILAN_IS_HATASI = `Yapılan iş boş olamaz, en fazla ${MAKS_METIN_UZUNLUGU} karakter olabilir.`;

export type DogrulamaHatasi = { tamam: false; hata: string };

export type YeniKayitSonucu =
  | {
      tamam: true;
      plaka: string;
      musteri: string;
      telefon: string;
      islem: Islem;
    }
  | DogrulamaHatasi;

export type AracGuncellemeDogrulamaSonucu =
  | {
      tamam: true;
      eskiPlaka: string;
      yeniPlaka: string;
      musteri: string;
      telefon: string;
    }
  | DogrulamaHatasi;

// Same check as the route handlers: anything that is not a non-null object
// (e.g. a string, a number, null) cannot be read as a form body.
function nesneMi(govde: unknown): govde is Record<string, unknown> {
  return typeof govde === "object" && govde !== null;
}

// String(x ?? "").trim(), exactly as the route handlers read each field.
function metinAl(govde: Record<string, unknown>, alan: string): string {
  return String(govde[alan] ?? "").trim();
}

function hata(mesaj: string): DogrulamaHatasi {
  return { tamam: false, hata: mesaj };
}

// Validates the "new job" form. `tarih` is the job date; it defaults to the
// local calendar day and is only passed in by tests.
export function yeniKayitDogrula(
  govde: unknown,
  tarih: string = yerelTarihISO()
): YeniKayitSonucu {
  if (!nesneMi(govde)) return hata(ISTEK_OKUNAMADI);

  const plaka = metinAl(govde, "plaka");
  const musteri = metinAl(govde, "musteri");
  const telefon = metinAl(govde, "telefon");
  const yapilanIs = metinAl(govde, "yapilanIs");
  const ucret = Number(govde.ucret);
  const garantiBitis = metinAl(govde, "garantiBitis");
  const sonrakiBakim = metinAl(govde, "sonrakiBakim");

  if (!dogrulaPlaka(plaka)) {
    return hata("Geçerli bir plaka girin.");
  }
  if (musteri === "" || musteri.length > MAKS_METIN_UZUNLUGU) {
    return hata(MUSTERI_HATASI);
  }
  if (!telefonGecerliMi(telefon)) {
    return hata("Geçerli bir telefon numarası girin.");
  }
  if (yapilanIs === "" || yapilanIs.length > MAKS_METIN_UZUNLUGU) {
    return hata(YAPILAN_IS_HATASI);
  }
  if (!Number.isFinite(ucret) || ucret < 0) {
    return hata("Geçerli bir ücret girin.");
  }
  // Warranty is optional: an empty value means the job has no warranty.
  if (garantiBitis !== "" && !tarihGecerliMi(garantiBitis)) {
    return hata("Geçerli bir garanti bitiş tarihi girin.");
  }
  if (!tarihGecerliMi(sonrakiBakim)) {
    return hata("Geçerli bir sonraki bakım tarihi girin.");
  }

  return {
    tamam: true,
    plaka: formatPlaka(plaka),
    musteri,
    telefon: formatTelefon(telefon),
    islem: {
      tarih,
      yapilanIs,
      ucret,
      garantiBitis,
      sonrakiBakim,
    },
  };
}

// Validates the "edit vehicle" form. The plate clash check is not done here;
// it needs the data set and lives in aracGuncelle (lib/depo.ts).
export function aracGuncellemeDogrula(
  govde: unknown
): AracGuncellemeDogrulamaSonucu {
  if (!nesneMi(govde)) return hata(ISTEK_OKUNAMADI);

  const eskiPlaka = metinAl(govde, "eskiPlaka");
  const plaka = metinAl(govde, "plaka");
  const musteri = metinAl(govde, "musteri");
  const telefon = metinAl(govde, "telefon");

  // An untouched plate is not re-validated. Older records may hold a plate the
  // current rules reject, and their name and phone must still be editable.
  const plakaDegisti = plaka !== eskiPlaka;

  if (eskiPlaka === "") {
    return hata("Düzenlenecek araç belirtilmedi.");
  }
  if (plakaDegisti && !dogrulaPlaka(plaka)) {
    return hata("Geçerli bir plaka girin.");
  }
  if (musteri === "" || musteri.length > MAKS_METIN_UZUNLUGU) {
    return hata(MUSTERI_HATASI);
  }
  if (!telefonGecerliMi(telefon)) {
    return hata("Geçerli bir telefon numarası girin.");
  }

  return {
    tamam: true,
    eskiPlaka,
    yeniPlaka: plakaDegisti ? formatPlaka(plaka) : eskiPlaka,
    musteri,
    telefon: formatTelefon(telefon),
  };
}
