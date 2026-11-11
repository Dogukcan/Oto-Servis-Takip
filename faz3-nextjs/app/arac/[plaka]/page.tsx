import { aracGetir } from "@/lib/db-sorgular";
import { whatsappLinkOlustur } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export default async function AracDetaySayfasi({
  params,
}: {
  params: Promise<{ plaka: string }>;
}) {
  const { plaka: plakaParam } = await params;
  const plaka = decodeURIComponent(plakaParam);
  const arac = aracGetir(plaka);

  if (!arac) {
    return <p>&quot;{plaka}&quot; plakalı araç bulunamadı.</p>;
  }

  return (
    <>
      <h1>
        {arac.plaka} — {arac.musteri}
      </h1>
      <p>Telefon: {arac.telefon}</p>
      <a
        className="buyuk-buton buton-whatsapp"
        href={whatsappLinkOlustur(arac)}
        target="_blank"
        rel="noopener noreferrer"
      >
        WhatsApp&apos;tan Bilgi Ver
      </a>

      <h2>İşlem Geçmişi</h2>
      <div className="tablo-sarici">
        <table>
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Yapılan İş</th>
              <th>Ücret</th>
              <th>Garanti Bitişi</th>
              <th>Sonraki Bakım</th>
            </tr>
          </thead>
          <tbody>
            {arac.islemler.map((islem, i) => (
              <tr key={i}>
                <td>{islem.tarih}</td>
                <td>{islem.yapilanIs}</td>
                <td>{islem.ucret.toLocaleString("tr-TR")} TL</td>
                <td>{islem.garantiBitis === "" ? "Garanti yok" : islem.garantiBitis}</td>
                <td>{islem.sonrakiBakim}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
