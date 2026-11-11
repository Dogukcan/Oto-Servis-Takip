import type { Arac } from "./types.ts";

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

export function hesaplaBakimDurumu(
  sonrakiBakim: string,
  buAnTarih: Date = new Date()
): BakimDurumu {
  const [yil, ay, gun] = sonrakiBakim.split("-").map(Number);
  const bakimGunu = takvimGunuUTC(yil, ay, gun);
  const buGun = takvimGunuUTC(
    buAnTarih.getFullYear(),
    buAnTarih.getMonth() + 1,
    buAnTarih.getDate()
  );
  const farkGun = Math.round((bakimGunu - buGun) / (1000 * 60 * 60 * 24));
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
