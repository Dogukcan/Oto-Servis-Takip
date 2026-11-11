"use client";

import { TEMA_ANAHTARI } from "@/lib/tema";

// Both icons are always rendered and CSS shows the one that fits the active
// theme, so the server and the browser produce the same markup.
export function TemaDugmesi() {
  function degistir() {
    const kok = document.documentElement;
    const yeni = kok.dataset.tema === "koyu" ? "acik" : "koyu";
    kok.dataset.tema = yeni;
    try {
      localStorage.setItem(TEMA_ANAHTARI, yeni);
    } catch {
      // Storage can be blocked; the theme still changes for this visit.
    }
  }

  return (
    <button
      type="button"
      className="tema-dugmesi"
      onClick={degistir}
      aria-label="Açık ve koyu tema arasında geçiş yap"
      title="Açık / koyu tema"
    >
      <svg className="tema-ikon-ay" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
      </svg>
      <svg className="tema-ikon-gunes" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
      </svg>
    </button>
  );
}
