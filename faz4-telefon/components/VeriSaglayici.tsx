"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { acilisIzleyiciOlustur } from "@/lib/acilis-sayaci";
import { bosVeri, kullanimSay, type Veri } from "@/lib/depo";
import {
  kaliciDepolamaIste,
  veriyiOku,
  veriyiYaz,
} from "@/lib/depo-tarayici";

const OTURUM_ACILIS_ANAHTARI = "servis-takip-acilis";

export interface VeriBaglamiDegeri {
  veri: Veri;
  yukleniyor: boolean;
  hata: string | null;
  guncelle: (fn: (veri: Veri) => Veri) => Promise<Veri>;
  yenidenDene: () => void;
}

export const VeriBaglami = createContext<VeriBaglamiDegeri | null>(null);

function oturumdaAcilisSayildiMi(): boolean {
  try {
    return sessionStorage.getItem(OTURUM_ACILIS_ANAHTARI) === "1";
  } catch {
    return false;
  }
}

function oturumAcilisiniIsaretle(): void {
  try {
    sessionStorage.setItem(OTURUM_ACILIS_ANAHTARI, "1");
  } catch {
    // sessionStorage may be disabled in strict privacy modes.
  }
}

export function VeriSaglayici({ children }: { children: ReactNode }) {
  const [veri, setVeri] = useState<Veri>(() => bosVeri());
  const [yukleniyor, setYukleniyor] = useState<boolean>(true);
  const [hata, setHata] = useState<string | null>(null);

  // Holds the most recently committed Veri so queued writes always see the
  // latest value even before React finishes re-rendering.
  const sonVeriRef = useRef<Veri>(veri);
  // True only after `veriyiOku()` has succeeded at least once; blocks every
  // `guncelle` write while the initial read (or retry) has not succeeded so an
  // empty default state can never overwrite stored records.
  const okumaBasariliRef = useRef<boolean>(false);
  const yukleniyorRef = useRef<boolean>(false);
  // Serialises the initial load and every guncelle call so two quick updates
  // never overwrite each other.
  const kuyrukRef = useRef<Promise<void>>(Promise.resolve());
  const baslatildiRef = useRef<boolean>(false);

  const guncelle = useCallback((fn: (veri: Veri) => Veri): Promise<Veri> => {
    const islem = kuyrukRef.current.then(async () => {
      if (!okumaBasariliRef.current) {
        throw new Error(
          "Kayıtlı veriler henüz yüklenemediği için değişiklik kaydedilemez."
        );
      }
      const yeniVeri = fn(sonVeriRef.current);
      await veriyiYaz(yeniVeri);
      sonVeriRef.current = yeniVeri;
      setVeri(yeniVeri);
      return yeniVeri;
    });
    // Keep the queue moving even if one write rejects.
    kuyrukRef.current = islem.then(
      () => undefined,
      () => undefined
    );
    return islem;
  }, []);

  const veriyiYukle = useCallback(() => {
    if (yukleniyorRef.current) return;
    yukleniyorRef.current = true;
    setYukleniyor(true);
    setHata(null);

    const yukleme = kuyrukRef.current.then(async () => {
      try {
        const okunan = await veriyiOku();
        let sonVeri = okunan;
        if (!oturumdaAcilisSayildiMi()) {
          try {
            const sayili = kullanimSay(okunan, "acilis");
            await veriyiYaz(sayili);
            oturumAcilisiniIsaretle();
            sonVeri = sayili;
          } catch {
            // A failed "acilis" counter write must not fail the load: keep the
            // value that was read, show the screens, and skip the counter.
          }
        }
        okumaBasariliRef.current = true;
        sonVeriRef.current = sonVeri;
        setVeri(sonVeri);
        setHata(null);
      } catch (err) {
        const mesaj =
          err instanceof Error && err.message
            ? err.message
            : "Veriler yüklenirken bir hata oluştu.";
        setHata(mesaj);
      } finally {
        yukleniyorRef.current = false;
        setYukleniyor(false);
      }
    });

    kuyrukRef.current = yukleme.then(
      () => undefined,
      () => undefined
    );
  }, []);

  useEffect(() => {
    if (baslatildiRef.current) return;
    baslatildiRef.current = true;

    void kaliciDepolamaIste();
    veriyiYukle();
  }, [veriyiYukle]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const izleyici = acilisIzleyiciOlustur();

    function gorunurlukDinle() {
      const durum =
        document.visibilityState === "hidden" ? "hidden" : "visible";
      if (izleyici.gorunurlukDegisti(durum) && okumaBasariliRef.current) {
        void guncelle((v) => kullanimSay(v, "acilis")).catch(() => {
          // Ignore counter write errors on background return.
        });
      }
    }

    document.addEventListener("visibilitychange", gorunurlukDinle);
    return () => {
      document.removeEventListener("visibilitychange", gorunurlukDinle);
    };
  }, [guncelle]);

  return (
    <VeriBaglami.Provider
      value={{ veri, yukleniyor, hata, guncelle, yenidenDene: veriyiYukle }}
    >
      {children}
    </VeriBaglami.Provider>
  );
}

export function VeriIcerigi({ children }: { children: ReactNode }) {
  const { yukleniyor, hata, yenidenDene } = useVeri();
  if (yukleniyor) {
    return <p className="bos-durum">Yükleniyor…</p>;
  }
  if (hata !== null) {
    return (
      <>
        <p className="bos-durum hata-metni" role="alert">
          {hata}
        </p>
        <div className="eylem-satiri eylem-ust-bosluk">
          <button
            type="button"
            className="buyuk-buton ikincil-buton"
            onClick={yenidenDene}
          >
            Yeniden Dene
          </button>
        </div>
      </>
    );
  }
  return <>{children}</>;
}

export function useVeri(): VeriBaglamiDegeri {
  const baglam = useContext(VeriBaglami);
  if (baglam === null) {
    throw new Error("useVeri yalnızca VeriSaglayici içinde kullanılabilir.");
  }
  return baglam;
}
