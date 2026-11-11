import { aracGetir } from "@/lib/db-sorgular";
import { AracDuzenleFormu } from "@/components/AracDuzenleFormu";

export const dynamic = "force-dynamic";

export default async function AracDuzenleSayfasi({
  params,
}: {
  params: Promise<{ plaka: string }>;
}) {
  const { plaka: plakaParam } = await params;
  const plaka = decodeURIComponent(plakaParam);
  const arac = aracGetir(plaka);

  if (!arac) {
    return (
      <>
        <h1>Araç bulunamadı</h1>
        <p>&quot;{plaka}&quot; plakalı araç kayıtlarda yok.</p>
      </>
    );
  }

  return (
    <>
      <h1>Bilgileri Düzenle</h1>
      <p className="baslik-alti form-aciklamasi">
        Plakayı değiştirirseniz aracın işlem geçmişi yeni plakaya taşınır.
      </p>
      <AracDuzenleFormu
        plaka={arac.plaka}
        musteri={arac.musteri}
        telefon={arac.telefon}
      />
    </>
  );
}
