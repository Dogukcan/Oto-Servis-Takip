"use client";

import { tarihTR } from "@/lib/format";
import { kullanimOzeti } from "@/lib/kullanim-ozeti";
import { useVeri } from "@/components/VeriSaglayici";

export default function KullanimSayfasi() {
  const { veri } = useVeri();
  const ozet = kullanimOzeti(veri);

  return (
    <>
      <h1>Kullanım</h1>
      <p className="baslik-alti form-aciklamasi">
        Bu sayılar yalnızca bu telefonda durur ve müşteri bilgisi içermez.
      </p>

      <div className="kullanim-ozet-izgara">
        <section className="form-paneli kullanim-karti">
          <h2>Kayıtlı Veriler</h2>
          <dl className="kullanim-sayaclar">
            <div>
              <dt>Araç</dt>
              <dd>{ozet.aracSayisi}</dd>
            </div>
            <div>
              <dt>İşlem</dt>
              <dd>{ozet.islemSayisi}</dd>
            </div>
          </dl>
        </section>

        <section className="form-paneli kullanim-karti">
          <h2>Son 7 Gün</h2>
          <dl className="kullanim-sayaclar">
            <div>
              <dt>Açılış</dt>
              <dd>{ozet.son7Gun.acilis}</dd>
            </div>
            <div>
              <dt>Kayıt</dt>
              <dd>{ozet.son7Gun.kayit}</dd>
            </div>
            <div>
              <dt>WhatsApp</dt>
              <dd>{ozet.son7Gun.whatsapp}</dd>
            </div>
          </dl>
        </section>

        <section className="form-paneli kullanim-karti">
          <h2>Tüm Zamanlar</h2>
          <dl className="kullanim-sayaclar">
            <div>
              <dt>Açılış</dt>
              <dd>{ozet.tumZamanlar.acilis}</dd>
            </div>
            <div>
              <dt>Kayıt</dt>
              <dd>{ozet.tumZamanlar.kayit}</dd>
            </div>
            <div>
              <dt>WhatsApp</dt>
              <dd>{ozet.tumZamanlar.whatsapp}</dd>
            </div>
          </dl>
        </section>
      </div>

      <h2>Günlük Kullanım</h2>
      {ozet.gunler.length === 0 ? (
        <p className="bos-durum">Henüz kullanım verisi yok.</p>
      ) : (
        <table className="kullanim-tablosu">
          <thead>
            <tr>
              <th scope="col">Gün</th>
              <th scope="col">Açılış</th>
              <th scope="col">Kayıt</th>
              <th scope="col">WhatsApp</th>
            </tr>
          </thead>
          <tbody>
            {ozet.gunler.map((satir) => (
              <tr key={satir.gun}>
                <td>{tarihTR(satir.gun)}</td>
                <td>{satir.acilis}</td>
                <td>{satir.kayit}</td>
                <td>{satir.whatsapp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
