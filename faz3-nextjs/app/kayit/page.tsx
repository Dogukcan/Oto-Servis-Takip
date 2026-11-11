"use client";

import { useRef, useState, type FormEvent, type RefObject } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { dogrulaPlaka, plakaBicimle, telefonGecerliMi } from "@/lib/format";
import { Plaka } from "@/components/Plaka";

interface FormHatalari {
  plaka?: string;
  musteri?: string;
  telefon?: string;
  yapilanIs?: string;
  ucret?: string;
  garantiBitis?: string;
  sonrakiBakim?: string;
}

type Alan = keyof FormHatalari;

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

function HizliTarihButonlari({
  hedef,
  secildi,
}: {
  hedef: RefObject<HTMLInputElement | null>;
  secildi: () => void;
}) {
  return (
    <div className="hizli-tarih">
      {HIZLI_TARIH_SECENEKLERI.map((secenek) => (
        <button
          key={secenek.ay}
          type="button"
          className="hizli-tarih-butonu"
          onClick={() => {
            if (!hedef.current) return;
            hedef.current.value = bugundenAySonra(secenek.ay);
            // Setting the value from code fires no change event, so the
            // field's error is cleared here.
            secildi();
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
  const [plaka, setPlaka] = useState("");
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const plakaOnizleme = plakaBicimle(plaka);

  // An error goes away as soon as its field is edited, not on the next save.
  function hatayiTemizle(alan: Alan) {
    setHatalar((onceki) => {
      if (!onceki[alan]) return onceki;
      const kalan = { ...onceki };
      delete kalan[alan];
      return kalan;
    });
  }

  async function gonder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (kaydediliyor) return;
    const formElementi = e.currentTarget;
    const form = new FormData(e.currentTarget);
    const girilenPlaka = plaka.trim();
    const musteri = String(form.get("musteri") ?? "").trim();
    const telefon = String(form.get("telefon") ?? "").trim();
    const yapilanIs = String(form.get("yapilanIs") ?? "").trim();
    const ucret = String(form.get("ucret") ?? "").trim();
    const garantiBitis = garantiVar ? String(form.get("garantiBitis") ?? "").trim() : "";
    const sonrakiBakim = String(form.get("sonrakiBakim") ?? "").trim();

    const yeniHatalar: FormHatalari = {};
    if (!dogrulaPlaka(girilenPlaka)) {
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

    // The button stays locked from here until the redirect, so a double tap
    // cannot save the same job twice.
    setSunucuHatasi(null);
    setKaydediliyor(true);
    try {
      const yanit = await fetch("/api/kayit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plaka: girilenPlaka,
          musteri,
          telefon,
          yapilanIs,
          ucret: Number(ucret),
          garantiBitis,
          sonrakiBakim,
        }),
      });

      if (!yanit.ok) {
        // A server error may come back without a JSON body.
        const govde = (await yanit.json().catch(() => ({}))) as { hata?: string };
        setSunucuHatasi(govde.hata ?? "Kayıt sırasında bir hata oluştu.");
        setBasarili(false);
        setKaydediliyor(false);
        return;
      }
    } catch {
      setSunucuHatasi(
        "Sunucuya ulaşılamadı. Kaydın gidip gitmediğini araç listesinden kontrol edip tekrar deneyin."
      );
      setBasarili(false);
      setKaydediliyor(false);
      return;
    }

    setBasarili(true);
    formElementi.reset();
    setPlaka("");
    setGarantiVar(false);
    setTimeout(() => router.push("/"), 800);
  }

  return (
    <>
      <h1>Yeni Kayıt</h1>
      <form
        className="kayit-formu kayit-genis"
        onSubmit={gonder}
        onChange={(e) => {
          // The event bubbles up from whichever field was edited.
          if (e.target instanceof HTMLInputElement && e.target.name) {
            hatayiTemizle(e.target.name as Alan);
          }
        }}
      >
        <div className="form-izgara">
          <section className="form-paneli">
            <div className="panel-basligi">
              <h2>Araç ve müşteri</h2>
              {plakaOnizleme && <Plaka plaka={plakaOnizleme} />}
            </div>
            <label>
              Plaka
              <input
                type="text"
                name="plaka"
                placeholder="34 ABC 123"
                autoCapitalize="characters"
                autoComplete="off"
                value={plaka}
                onChange={(e) => setPlaka(e.target.value)}
              />
              {hatalar.plaka && <span className="hata-metni">{hatalar.plaka}</span>}
            </label>
            <label>
              Müşteri Adı
              <input type="text" name="musteri" placeholder="Ahmet Yılmaz" autoComplete="off" />
              {hatalar.musteri && <span className="hata-metni">{hatalar.musteri}</span>}
            </label>
            <label>
              Telefon
              <input
                type="tel"
                name="telefon"
                inputMode="tel"
                placeholder="532 111 22 33"
                autoComplete="off"
              />
              <span className="alan-notu">Başına 0 yazmanıza gerek yok.</span>
              {hatalar.telefon && <span className="hata-metni">{hatalar.telefon}</span>}
            </label>
          </section>

          <section className="form-paneli">
            <div className="panel-basligi">
              <h2>Yapılan iş</h2>
            </div>
            <label>
              Yapılan İş
              <input type="text" name="yapilanIs" placeholder="Akü değişimi" autoComplete="off" />
              {hatalar.yapilanIs && <span className="hata-metni">{hatalar.yapilanIs}</span>}
            </label>
            <label>
              Ücret (TL)
              <input
                type="number"
                name="ucret"
                inputMode="numeric"
                placeholder="1500"
                min="0"
                step="1"
              />
              {hatalar.ucret && <span className="hata-metni">{hatalar.ucret}</span>}
            </label>
            <div className="tarih-alani">
              <label>
                Sonraki Bakım Tarihi
                <input type="date" name="sonrakiBakim" ref={sonrakiBakimRef} />
                {hatalar.sonrakiBakim && (
                  <span className="hata-metni">{hatalar.sonrakiBakim}</span>
                )}
              </label>
              <HizliTarihButonlari
                hedef={sonrakiBakimRef}
                secildi={() => hatayiTemizle("sonrakiBakim")}
              />
            </div>
            <div className="tarih-alani">
              <label className="onay-satiri">
                <input
                  type="checkbox"
                  checked={garantiVar}
                  onChange={(e) => {
                    setGarantiVar(e.target.checked);
                    hatayiTemizle("garantiBitis");
                  }}
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
                  <HizliTarihButonlari
                    hedef={garantiBitisRef}
                    secildi={() => hatayiTemizle("garantiBitis")}
                  />
                </>
              )}
            </div>
          </section>
        </div>

        <div className="eylem-satiri">
          <button className="buyuk-buton" type="submit" disabled={kaydediliyor}>
            {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
          </button>
          <Link className="buyuk-buton ikincil-buton" href="/">
            Vazgeç
          </Link>
        </div>
        {basarili && (
          <span className="basari-metni">Kaydedildi, listeye yönlendiriliyorsunuz...</span>
        )}
        {sunucuHatasi && <span className="hata-metni">{sunucuHatasi}</span>}
      </form>
    </>
  );
}
