import type { Arac } from "./types";

export type BakimDurumu = "gecmis" | "yaklasiyor" | "uygun";

const YAKLASMA_GUN_SAYISI = 14;

export function sonSonrakiBakimTarihi(arac: Arac): string | null {
  if (arac.islemler.length === 0) return null;
  return arac.islemler[arac.islemler.length - 1].sonrakiBakim;
}

// Takvim gününe göre karşılaştırma yapar (saat/saat dilimi farkından etkilenmez).
// sonrakiBakim "YYYY-MM-DD" olarak saklanıyor; buAnTarih'in de yerel takvim
// günü alınır, ikisi UTC gece yarısına sabitlenip gün farkı hesaplanır.
function takvimGunuUTC(yil: number, ay: number, gun: number): number {
  return Date.UTC(yil, ay - 1, gun);
}

// Bakım gününe kaç takvim günü kaldığını verir. Negatif değer, bakımın o kadar
// gün önce geçtiği anlamına gelir.
export function bakimaKalanGun(
  sonrakiBakim: string,
  buAnTarih: Date = new Date()
): number {
  const [yil, ay, gun] = sonrakiBakim.split("-").map(Number);
  const bakimGunu = takvimGunuUTC(yil, ay, gun);
  const buGun = takvimGunuUTC(
    buAnTarih.getFullYear(),
    buAnTarih.getMonth() + 1,
    buAnTarih.getDate()
  );
  return Math.round((bakimGunu - buGun) / (1000 * 60 * 60 * 24));
}

const AY_OLARAK_GOSTERME_ESIGI = 90;

// "41 gün geçti", "Bugün", "82 gün kaldı", "5 ay kaldı" gibi okunur bir metin üretir.
export function kalanGunMetni(kalanGun: number): string {
  if (kalanGun === 0) return "Bugün";
  const mutlak = Math.abs(kalanGun);
  const sure =
    mutlak > AY_OLARAK_GOSTERME_ESIGI
      ? `${Math.floor(mutlak / 30)} ay`
      : `${mutlak} gün`;
  return kalanGun < 0 ? `${sure} geçti` : `${sure} kaldı`;
}

export function hesaplaBakimDurumu(
  sonrakiBakim: string,
  buAnTarih: Date = new Date()
): BakimDurumu {
  const farkGun = bakimaKalanGun(sonrakiBakim, buAnTarih);
  if (farkGun < 0) return "gecmis";
  if (farkGun <= YAKLASMA_GUN_SAYISI) return "yaklasiyor";
  return "uygun";
}

export function aracBakimDurumu(
  arac: Arac,
  buAnTarih: Date = new Date()
): BakimDurumu | null {
  const sonrakiBakim = sonSonrakiBakimTarihi(arac);
  if (sonrakiBakim === null) return null;
  return hesaplaBakimDurumu(sonrakiBakim, buAnTarih);
}
