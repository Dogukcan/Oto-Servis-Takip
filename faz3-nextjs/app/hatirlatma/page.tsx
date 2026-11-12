import Link from "next/link";
import { tumAraclariGetir } from "@/lib/db-sorgular";
import {
  bakimaKalanGun,
  hesaplaBakimDurumu,
  kalanGunMetni,
  sonSonrakiBakimTarihi,
} from "@/lib/bakim-durumu";
import { tarihTR } from "@/lib/format";
import { whatsappLinkOlustur } from "@/lib/whatsapp";
import { DurumRozeti } from "@/components/DurumRozeti";
import { Plaka } from "@/components/Plaka";

export const dynamic = "force-dynamic";

function ozetCumlesi(gecenSayisi: number, yaklasanSayisi: number): string {
  const parcalar: string[] = [];
  if (gecenSayisi > 0) parcalar.push(`${gecenSayisi} aracın bakımı geçti`);
  if (yaklasanSayisi > 0) parcalar.push(`${yaklasanSayisi} aracın bakımı yaklaşıyor`);
  return parcalar.join(", ");
}

export default function HatirlatmaSayfasi() {
  const buAn = new Date();

  // Only vehicles whose service is overdue or close, the most overdue on top.
  const hatirlatilacaklar = tumAraclariGetir()
    .flatMap((arac) => {
      const sonrakiBakim = sonSonrakiBakimTarihi(arac);
      if (sonrakiBakim === null) return [];
      const durum = hesaplaBakimDurumu(sonrakiBakim, buAn);
      if (durum === "uygun") return [];
      return [
        {
          arac,
          sonrakiBakim,
          durum,
          kalanGun: bakimaKalanGun(sonrakiBakim, buAn),
        },
      ];
    })
    .sort((a, b) => a.kalanGun - b.kalanGun);

  const gecenSayisi = hatirlatilacaklar.filter((k) => k.durum === "gecmis").length;
  const yaklasanSayisi = hatirlatilacaklar.length - gecenSayisi;

  return (
    <>
      <div className="baslik-satiri">
        <div>
          <h1>Hatırlatmalar</h1>
          {hatirlatilacaklar.length > 0 && (
            <p className="baslik-alti">
              {ozetCumlesi(gecenSayisi, yaklasanSayisi)}
            </p>
          )}
        </div>
      </div>

      {hatirlatilacaklar.length === 0 ? (
        <p className="bos-durum">
          Şu an haber verilecek müşteri yok. Bakımı geçen ya da 14 gün içinde
          gelecek araçlar burada görünür.
        </p>
      ) : (
        <ul className="hatirlatma-listesi">
          {hatirlatilacaklar.map(({ arac, sonrakiBakim, durum, kalanGun }) => (
            <li key={arac.plaka} className="hatirlatma-satiri">
              <Link
                className="hatirlatma-bilgi"
                href={`/arac/${encodeURIComponent(arac.plaka)}`}
              >
                <span className="hucre-plaka">
                  <Plaka plaka={arac.plaka} />
                </span>
                <span className="hatirlatma-musteri">
                  <span className="hucre-musteri">{arac.musteri}</span>
                  <span className="bakim-kalan">{arac.telefon}</span>
                </span>
                <span className="hucre-bakim">
                  <span className="bakim-tarihi">{tarihTR(sonrakiBakim)}</span>
                  <span className="bakim-kalan">{kalanGunMetni(kalanGun)}</span>
                </span>
                <span className="hucre-durum">
                  <DurumRozeti durum={durum} />
                </span>
              </Link>
              <a
                className="buyuk-buton buton-whatsapp"
                href={whatsappLinkOlustur(arac)}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp&apos;tan Bilgi Ver
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
