import Link from "next/link";
import type { Arac } from "@/lib/types";
import {
  bakimaKalanGun,
  hesaplaBakimDurumu,
  kalanGunMetni,
  sonSonrakiBakimTarihi,
} from "@/lib/bakim-durumu";
import { tarihTR } from "@/lib/format";
import { DurumRozeti } from "./DurumRozeti";
import { Plaka } from "./Plaka";

// The vehicle rows shared by the home list and the search page. The whole row
// is one link to the vehicle's detail page.
export function AracListesi({ araclar }: { araclar: Arac[] }) {
  const buAn = new Date();

  // Most urgent first: the most overdue vehicle on top, vehicles without any
  // record at the bottom.
  const satirlar = araclar
    .map((arac) => {
      const sonrakiBakim = sonSonrakiBakimTarihi(arac);
      return {
        arac,
        sonIslem: arac.islemler[arac.islemler.length - 1],
        sonrakiBakim,
        kalanGun:
          sonrakiBakim === null ? null : bakimaKalanGun(sonrakiBakim, buAn),
        durum:
          sonrakiBakim === null ? null : hesaplaBakimDurumu(sonrakiBakim, buAn),
      };
    })
    .sort(
      (a, b) =>
        (a.kalanGun ?? Number.POSITIVE_INFINITY) -
        (b.kalanGun ?? Number.POSITIVE_INFINITY)
    );

  return (
    <div className="arac-listesi">
      <div className="arac-listesi-basligi" aria-hidden="true">
        <span>Plaka</span>
        <span>Müşteri</span>
        <span>Telefon</span>
        <span>Son işlem</span>
        <span>Sonraki bakım</span>
        <span>Durum</span>
        <span />
      </div>
      <ul>
        {satirlar.map(({ arac, sonIslem, sonrakiBakim, kalanGun, durum }) => (
          <li key={arac.plaka}>
            <Link
              className="arac-satiri"
              href={`/arac/${encodeURIComponent(arac.plaka)}`}
            >
              <span className="hucre-plaka">
                <Plaka plaka={arac.plaka} />
              </span>
              <span className="hucre-musteri">{arac.musteri}</span>
              <span className="hucre-telefon">{arac.telefon}</span>
              <span className="hucre-islem">{sonIslem?.yapilanIs ?? "—"}</span>
              <span className="hucre-bakim">
                {sonrakiBakim === null || kalanGun === null ? (
                  "—"
                ) : (
                  <>
                    <span className="bakim-tarihi">{tarihTR(sonrakiBakim)}</span>
                    <span className="bakim-kalan">{kalanGunMetni(kalanGun)}</span>
                  </>
                )}
              </span>
              <span className="hucre-durum">
                <DurumRozeti durum={durum} />
              </span>
              <svg className="satir-oku" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m9 5 7 7-7 7" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
