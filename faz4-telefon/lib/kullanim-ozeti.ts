import type { KullanimGunu, Veri } from "./depo";
import { tarihGecerliMi } from "./format";

export interface KullanimGunSatiri extends KullanimGunu {
  gun: string;
}

export interface KullanimOzeti {
  aracSayisi: number;
  islemSayisi: number;
  son7Gun: KullanimGunu;
  tumZamanlar: KullanimGunu;
  gunler: KullanimGunSatiri[];
}

const GUN_MS = 1000 * 60 * 60 * 24;
const SON_GUN_PENCERESI = 7;

// Summarises local usage counters (last 7 calendar days including today, all
// time, and per-day rows ordered newest first) together with total vehicle and
// job counts. Pure function: never mutates `veri`.
export function kullanimOzeti(
  veri: Veri,
  buAn: Date = new Date()
): KullanimOzeti {
  const aracSayisi = veri.araclar.length;
  let islemSayisi = 0;
  for (const arac of veri.araclar) {
    islemSayisi += arac.islemler.length;
  }

  const son7Gun: KullanimGunu = { acilis: 0, kayit: 0, whatsapp: 0 };
  const tumZamanlar: KullanimGunu = { acilis: 0, kayit: 0, whatsapp: 0 };
  const gunler: KullanimGunSatiri[] = [];

  const buGunUTC = Date.UTC(
    buAn.getFullYear(),
    buAn.getMonth(),
    buAn.getDate()
  );

  for (const gun of Object.keys(veri.kullanim)) {
    if (!tarihGecerliMi(gun)) continue;
    const sayac = veri.kullanim[gun];
    const satir: KullanimGunSatiri = {
      gun,
      acilis: sayac.acilis + 0,
      kayit: sayac.kayit + 0,
      whatsapp: sayac.whatsapp + 0,
    };
    gunler.push(satir);

    tumZamanlar.acilis += satir.acilis;
    tumZamanlar.kayit += satir.kayit;
    tumZamanlar.whatsapp += satir.whatsapp;

    const [yil, ay, gunNo] = gun.split("-").map(Number);
    const satirGunUTC = Date.UTC(yil, ay - 1, gunNo);
    const farkGun = Math.round((buGunUTC - satirGunUTC) / GUN_MS);
    if (farkGun >= 0 && farkGun < SON_GUN_PENCERESI) {
      son7Gun.acilis += satir.acilis;
      son7Gun.kayit += satir.kayit;
      son7Gun.whatsapp += satir.whatsapp;
    }
  }

  gunler.sort((a, b) => (a.gun < b.gun ? 1 : a.gun > b.gun ? -1 : 0));

  return {
    aracSayisi,
    islemSayisi,
    son7Gun,
    tumZamanlar,
    gunler,
  };
}
