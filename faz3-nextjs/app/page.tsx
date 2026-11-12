import Link from "next/link";
import { tumAraclariGetir } from "@/lib/db-sorgular";
import { aracBakimDurumu } from "@/lib/bakim-durumu";
import { AracListesi } from "@/components/AracListesi";

export const dynamic = "force-dynamic";

function ozetCumlesi(gecenSayisi: number, yaklasanSayisi: number): string {
  if (gecenSayisi > 0) return `${gecenSayisi} aracın bakımı geçti`;
  if (yaklasanSayisi > 0) return `${yaklasanSayisi} aracın bakımı yaklaşıyor`;
  return "Bakımı geçen ya da yaklaşan araç yok";
}

export default function AracListesiSayfasi() {
  const araclar = tumAraclariGetir();
  const durumlar = araclar.map((arac) => aracBakimDurumu(arac));
  const gecenSayisi = durumlar.filter((d) => d === "gecmis").length;
  const yaklasanSayisi = durumlar.filter((d) => d === "yaklasiyor").length;

  return (
    <>
      <div className="baslik-satiri">
        <div>
          <h1>Araç Listesi</h1>
          {araclar.length > 0 && (
            <p className="baslik-alti">
              {ozetCumlesi(gecenSayisi, yaklasanSayisi)}
            </p>
          )}
        </div>
        <Link className="buyuk-buton" href="/kayit">
          + Yeni Kayıt
        </Link>
      </div>

      {araclar.length === 0 ? (
        <p className="bos-durum">
          Henüz kayıtlı araç yok. İlk aracı eklemek için &quot;Yeni Kayıt&quot;a
          basın.
        </p>
      ) : (
        <AracListesi araclar={araclar} />
      )}
    </>
  );
}
