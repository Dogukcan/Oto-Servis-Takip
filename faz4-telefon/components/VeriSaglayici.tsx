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
  // Serialises the initial load and every guncelle call so two quick updates
  // never overwrite each other.
  const kuyrukRef = useRef<Promise<void>>(Promise.resolve());
  const baslatildiRef = useRef<boolean>(false);

  const guncelle = useCallback((fn: (veri: Veri) => Veri): Promise<Veri> => {
    const islem = kuyrukRef.current.then(async () => {
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

  useEffect(() => {
    if (baslatildiRef.current) return;
    baslatildiRef.current = true;

    void kaliciDepolamaIste();

    const ilkYukleme = kuyrukRef.current.then(async () => {
      try {
        let okunan = await veriyiOku();
        if (!oturumdaAcilisSayildiMi()) {
          okunan = kullanimSay(okunan, "acilis");
          await veriyiYaz(okunan);
          oturumAcilisiniIsaretle();
        }
        sonVeriRef.current = okunan;
        setVeri(okunan);
        setHata(null);
      } catch (err) {
        const mesaj =
          err instanceof Error && err.message
            ? err.message
            : "Veriler yüklenirken bir hata oluştu.";
        setHata(mesaj);
      } finally {
        setYukleniyor(false);
      }
    });

    kuyrukRef.current = ilkYukleme.then(
      () => undefined,
      () => undefined
    );
  }, []);

  return (
    <VeriBaglami.Provider value={{ veri, yukleniyor, hata, guncelle }}>
      {yukleniyor ? (
        <p className="bos-durum">Yükleniyor…</p>
      ) : hata !== null ? (
        <p className="bos-durum hata-metni" role="alert">
          {hata}
        </p>
      ) : (
        children
      )}
    </VeriBaglami.Provider>
  );
}

export function useVeri(): VeriBaglamiDegeri {
  const baglam = useContext(VeriBaglami);
  if (baglam === null) {
    throw new Error("useVeri yalnızca VeriSaglayici içinde kullanılabilir.");
  }
  return baglam;
}
