"use client";

import { useRef, useState, type FormEvent, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { dogrulaPlaka, telefonGecerliMi } from "@/lib/format";

interface FormHatalari {
  plaka?: string;
  musteri?: string;
  telefon?: string;
  yapilanIs?: string;
  ucret?: string;
  garantiBitis?: string;
  sonrakiBakim?: string;
}

const HIZLI_TARIH_SECENEKLERI = [
  { etiket: "+6 Ay", ay: 6 },
  { etiket: "+1 Yıl", ay: 12 },
];

// Returns today plus the given months as YYYY-MM-DD in local time.
// The day is clamped so that 31 August + 6 months gives 28 February, not 3 March.
function bugundenAySonra(ay: number): string {
  const bugun = new Date();
  const hedef = new Date(bugun.getFullYear(), bugun.getMonth() + ay, 1);
  const aydakiSonGun = new Date(hedef.getFullYear(), hedef.getMonth() + 1, 0).getDate();
  hedef.setDate(Math.min(bugun.getDate(), aydakiSonGun));
  const yil = hedef.getFullYear();
  const ayNo = String(hedef.getMonth() + 1).padStart(2, "0");
  const gun = String(hedef.getDate()).padStart(2, "0");
  return `${yil}-${ayNo}-${gun}`;
}

function HizliTarihButonlari({ hedef }: { hedef: RefObject<HTMLInputElement | null> }) {
  return (
    <div className="hizli-tarih">
      {HIZLI_TARIH_SECENEKLERI.map((secenek) => (
        <button
          key={secenek.ay}
          type="button"
          className="hizli-tarih-butonu"
          onClick={() => {
            if (hedef.current) hedef.current.value = bugundenAySonra(secenek.ay);
          }}
        >
          {secenek.etiket}
        </button>
      ))}
    </div>
  );
}

export default function KayitSayfasi() {
  const router = useRouter();
  const garantiBitisRef = useRef<HTMLInputElement>(null);
  const sonrakiBakimRef = useRef<HTMLInputElement>(null);
  const [hatalar, setHatalar] = useState<FormHatalari>({});
  const [basarili, setBasarili] = useState(false);
  const [sunucuHatasi, setSunucuHatasi] = useState<string | null>(null);
  const [garantiVar, setGarantiVar] = useState(false);

  async function gonder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formElementi = e.currentTarget;
    const form = new FormData(e.currentTarget);
    const plaka = String(form.get("plaka") ?? "").trim();
    const musteri = String(form.get("musteri") ?? "").trim();
    const telefon = String(form.get("telefon") ?? "").trim();
    const yapilanIs = String(form.get("yapilanIs") ?? "").trim();
    const ucret = String(form.get("ucret") ?? "").trim();
    const garantiBitis = garantiVar ? String(form.get("garantiBitis") ?? "").trim() : "";
    const sonrakiBakim = String(form.get("sonrakiBakim") ?? "").trim();

    const yeniHatalar: FormHatalari = {};
    if (!dogrulaPlaka(plaka)) {
      yeniHatalar.plaka = "Geçerli bir plaka girin (örn. 34 ABC 123).";
    }
    if (musteri === "") {
      yeniHatalar.musteri = "Müşteri adı boş olamaz.";
    }
    if (!telefonGecerliMi(telefon)) {
      yeniHatalar.telefon = "Geçerli bir telefon numarası girin (10 hane).";
    }
    if (yapilanIs === "") {
      yeniHatalar.yapilanIs = "Yapılan iş boş olamaz.";
    }
    if (ucret === "" || Number(ucret) < 0 || Number.isNaN(Number(ucret))) {
      yeniHatalar.ucret = "Geçerli bir ücret girin.";
    }
    if (garantiVar && garantiBitis === "") {
      yeniHatalar.garantiBitis = "Garanti bitiş tarihini girin ya da garanti kutusunun işaretini kaldırın.";
    }
    if (sonrakiBakim === "") {
      yeniHatalar.sonrakiBakim = "Sonraki bakım tarihi boş olamaz.";
    }

    setHatalar(yeniHatalar);
    if (Object.keys(yeniHatalar).length > 0) {
      setBasarili(false);
      return;
    }

    setSunucuHatasi(null);
    const yanit = await fetch("/api/kayit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plaka,
        musteri,
        telefon,
        yapilanIs,
        ucret: Number(ucret),
        garantiBitis,
        sonrakiBakim,
      }),
    });

    if (!yanit.ok) {
      const govde = (await yanit.json()) as { hata?: string };
      setSunucuHatasi(govde.hata ?? "Kayıt sırasında bir hata oluştu.");
      setBasarili(false);
      return;
    }

    setBasarili(true);
    formElementi.reset();
    setGarantiVar(false);
    setTimeout(() => router.push("/"), 800);
  }

  return (
    <>
      <h2>Yeni Kayıt</h2>
      <form className="kayit-formu" onSubmit={gonder}>
        <label>
          Plaka
          <input type="text" name="plaka" placeholder="34 ABC 123" />
          {hatalar.plaka && <span className="hata-metni">{hatalar.plaka}</span>}
        </label>
        <label>
          Müşteri Adı
          <input type="text" name="musteri" placeholder="Ahmet Yılmaz" />
          {hatalar.musteri && <span className="hata-metni">{hatalar.musteri}</span>}
        </label>
        <label>
          Telefon
          <input type="tel" name="telefon" placeholder="532 111 22 33 (başına 0 eklemenize gerek yok)" />
          {hatalar.telefon && <span className="hata-metni">{hatalar.telefon}</span>}
        </label>
        <label>
          Yapılan İş
          <input type="text" name="yapilanIs" placeholder="Akü değişimi" />
          {hatalar.yapilanIs && <span className="hata-metni">{hatalar.yapilanIs}</span>}
        </label>
        <label>
          Ücret (TL)
          <input type="number" name="ucret" placeholder="1500" min="0" step="1" />
          {hatalar.ucret && <span className="hata-metni">{hatalar.ucret}</span>}
        </label>
        <div className="tarih-alani">
          <label className="onay-satiri">
            <input
              type="checkbox"
              checked={garantiVar}
              onChange={(e) => setGarantiVar(e.target.checked)}
            />
            Bu işe garanti verildi
          </label>
          {garantiVar && (
            <>
              <label>
                Yapılan İşin Garanti Bitişi
                <input type="date" name="garantiBitis" ref={garantiBitisRef} />
                {hatalar.garantiBitis && (
                  <span className="hata-metni">{hatalar.garantiBitis}</span>
                )}
              </label>
              <HizliTarihButonlari hedef={garantiBitisRef} />
            </>
          )}
        </div>
        <div className="tarih-alani">
          <label>
            Sonraki Bakım Tarihi
            <input type="date" name="sonrakiBakim" ref={sonrakiBakimRef} />
            {hatalar.sonrakiBakim && <span className="hata-metni">{hatalar.sonrakiBakim}</span>}
          </label>
          <HizliTarihButonlari hedef={sonrakiBakimRef} />
        </div>
        <button className="buyuk-buton" type="submit">
          Kaydet
        </button>
        {basarili && <span className="basari-metni">Kaydedildi, listeye yönlendiriliyorsunuz...</span>}
        {sunucuHatasi && <span className="hata-metni">{sunucuHatasi}</span>}
      </form>
    </>
  );
}
