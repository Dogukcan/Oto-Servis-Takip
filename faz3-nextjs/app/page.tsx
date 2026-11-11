import Link from "next/link";
import { tumAraclariGetir } from "@/lib/db-sorgular";

export const dynamic = "force-dynamic";
import { aracBakimDurumu, sonSonrakiBakimTarihi } from "@/lib/bakim-durumu";
import { DurumRozeti } from "@/components/DurumRozeti";

export default function AracListesiSayfasi() {
  const araclar = tumAraclariGetir();

  return (
    <>
      <h2>Araç Listesi</h2>
      <Link className="buyuk-buton" href="/kayit">
        + Yeni Kayıt
      </Link>

      <div className="tablo-sarici">
        <table>
          <thead>
            <tr>
              <th>Plaka</th>
              <th>Müşteri</th>
              <th>Telefon</th>
              <th>Son İşlem</th>
              <th>Sonraki Bakım</th>
              <th>Durum</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {araclar.map((arac) => {
              const sonIslem = arac.islemler[arac.islemler.length - 1];
              const sonrakiBakim = sonSonrakiBakimTarihi(arac);
              const durum = aracBakimDurumu(arac);
              return (
                <tr key={arac.plaka}>
                  <td>{arac.plaka}</td>
                  <td>{arac.musteri}</td>
                  <td>{arac.telefon}</td>
                  <td>{sonIslem?.yapilanIs ?? "-"}</td>
                  <td>{sonrakiBakim ?? "-"}</td>
                  <td>
                    <DurumRozeti durum={durum} />
                  </td>
                  <td>
                    <Link
                      className="buyuk-buton"
                      href={`/arac/${encodeURIComponent(arac.plaka)}`}
                    >
                      Detay
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
