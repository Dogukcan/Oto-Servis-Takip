import type { Arac } from "./types";
import { sonSonrakiBakimTarihi, hesaplaBakimDurumu } from "./bakim-durumu";

function telefonuWaFormatinaCevir(telefon: string): string {
  const rakamlar = telefon.replace(/\D/g, "");
  const yerelRakamlar = rakamlar.startsWith("0") ? rakamlar.slice(1) : rakamlar;
  return `90${yerelRakamlar}`;
}

function tarihiGoster(isoTarih: string): string {
  const [yil, ay, gun] = isoTarih.split("-");
  return `${gun}.${ay}.${yil}`;
}

export function whatsappLinkOlustur(arac: Arac, buAnTarih: Date = new Date()): string {
  const sonrakiBakim = sonSonrakiBakimTarihi(arac);
  const musteriAdi = arac.musteri.split(" ")[0];

  let mesaj: string;
  if (sonrakiBakim === null) {
    mesaj = `Merhaba ${musteriAdi}, ${arac.plaka} plakalı aracınız için sizi aramak istiyoruz.`;
  } else {
    const durum = hesaplaBakimDurumu(sonrakiBakim, buAnTarih);
    const tarih = tarihiGoster(sonrakiBakim);
    if (durum === "gecmis") {
      mesaj = `Merhaba ${musteriAdi}, ${arac.plaka} plakalı aracınızın bakım zamanı ${tarih} tarihinde geçti.`;
    } else if (durum === "yaklasiyor") {
      mesaj = `Merhaba ${musteriAdi}, ${arac.plaka} plakalı aracınızın bakım zamanı ${tarih} tarihinde yaklaşıyor.`;
    } else {
      mesaj = `Merhaba ${musteriAdi}, ${arac.plaka} plakalı aracınızın bir sonraki bakım tarihi ${tarih}. Bilginize.`;
    }
  }

  const numara = telefonuWaFormatinaCevir(arac.telefon);
  return `https://wa.me/${numara}?text=${encodeURIComponent(mesaj)}`;
}
