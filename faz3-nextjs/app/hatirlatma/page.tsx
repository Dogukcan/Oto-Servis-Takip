import { tumAraclariGetir } from "@/lib/db-sorgular";
import { aracBakimDurumu, sonSonrakiBakimTarihi } from "@/lib/bakim-durumu";
import { whatsappLinkOlustur } from "@/lib/whatsapp";
import { DurumRozeti } from "@/components/DurumRozeti";

export const dynamic = "force-dynamic";

export default function HatirlatmaSayfasi() {
  const araclar = tumAraclariGetir();

  const hatirlatilacaklar = araclar
    .map((arac) => ({ arac, durum: aracBakimDurumu(arac) }))
    .filter((k) => k.durum === "gecmis" || k.durum === "yaklasiyor")
    .sort((a, b) => (a.durum === "gecmis" ? -1 : 1) - (b.durum === "gecmis" ? -1 : 1));

  return (
    <>
      <h2>Hatırlatmalar</h2>

      {hatirlatilacaklar.length === 0 ? (
        <p>Şu an hatırlatma gereken araç yok.</p>
      ) : (
        hatirlatilacaklar.map(({ arac, durum }) => (
          <div
            key={arac.plaka}
            className={`hatirlatma-karti ${durum === "gecmis" ? "gecmis" : "yaklasiyor"}`}
          >
            <div className="hatirlatma-bilgi">
              <p>
                <strong>{arac.plaka}</strong> — {arac.musteri}
              </p>
              <p>
                Sonraki bakım: {sonSonrakiBakimTarihi(arac)}
              </p>
              <DurumRozeti durum={durum} />
            </div>
            <a
              className="buyuk-buton buton-whatsapp"
              href={whatsappLinkOlustur(arac)}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp&apos;tan Bilgi Ver
            </a>
          </div>
        ))
      )}
    </>
  );
}
