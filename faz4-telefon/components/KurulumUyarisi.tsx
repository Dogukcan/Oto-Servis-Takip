"use client";

import { useEffect, useState } from "react";

const KURULUM_UYARISI_ANAHTARI = "servis-takip-kurulum-uyarisi-kapatildi";

function kapatildiMi(): boolean {
  try {
    return localStorage.getItem(KURULUM_UYARISI_ANAHTARI) === "1";
  } catch {
    return false;
  }
}

function anaEkrandaCalisiyorMu(): boolean {
  const standaloneMedya =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    (navigator as Navigator & { standalone?: unknown }).standalone === true;
  return standaloneMedya || iosStandalone;
}

export function KurulumUyarisi() {
  // Starts hidden so installed home-screen users never see a flash before the
  // client-side check runs.
  const [gorunur, setGorunur] = useState(false);

  useEffect(() => {
    if (kapatildiMi() || anaEkrandaCalisiyorMu()) return;
    setGorunur(true);
  }, []);

  if (!gorunur) return null;

  function kapat() {
    try {
      localStorage.setItem(KURULUM_UYARISI_ANAHTARI, "1");
    } catch {
      // localStorage may be blocked in strict privacy modes; still hide for this visit.
    }
    setGorunur(false);
  }

  return (
    <aside className="kurulum-uyarisi" aria-label="Ana ekrana ekleme uyarısı">
      <p>
        Kayıt girmeden önce bu sayfayı ana ekrana ekleyin: Safari&apos;de Paylaş
        düğmesine, sonra &apos;Ana Ekrana Ekle&apos;ye dokunun. Safari&apos;de
        girilen kayıtlar ana ekrandaki uygulamaya geçmez.
      </p>
      <button
        type="button"
        className="buyuk-buton ikincil-buton"
        onClick={kapat}
      >
        Anladım, Kapat
      </button>
    </aside>
  );
}
