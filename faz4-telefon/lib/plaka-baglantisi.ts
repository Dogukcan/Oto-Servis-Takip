"use client";

import { useEffect, useState } from "react";

// Builds and reads vehicle detail/edit URLs that keep the plate inside the
// URL fragment (`#...`), which browsers never send to the server in HTTP
// requests, Link prefetches or RSC fetches.

export function detayYolu(plaka: string): string {
  return `/arac/detay/#${encodeURIComponent(plaka)}`;
}

export function duzenleYolu(plaka: string): string {
  return `/arac/duzenle/#${encodeURIComponent(plaka)}`;
}

// Decodes a plate from a `location.hash` value (or a path/URL containing `#`).
// Returns "" when the fragment is missing or has invalid percent-encoding so
// malformed URLs never throw URIError.
export function plakaCoz(hashVeyaYol: string): string {
  if (typeof hashVeyaYol !== "string" || hashVeyaYol === "") return "";
  const diyez = hashVeyaYol.indexOf("#");
  const ham = diyez >= 0 ? hashVeyaYol.slice(diyez + 1) : hashVeyaYol;
  if (ham === "") return "";
  try {
    return decodeURIComponent(ham).trim();
  } catch {
    return "";
  }
}

let gecmisYamaYapildi = false;
const gecmisDinleyicileri = new Set<() => void>();

function gecmisDinleyicileriniBilgilendir(): void {
  for (const dinleyici of gecmisDinleyicileri) {
    dinleyici();
  }
}

// Next's router updates the URL via history.pushState / replaceState inside
// its own parent useEffect, which does not fire `hashchange`. Wrapping both
// methods lets the hook react as soon as the router commits the new URL.
function gecmisYamasiniKur(): void {
  if (gecmisYamaYapildi || typeof window === "undefined") return;
  gecmisYamaYapildi = true;

  const orijinalPushState = window.history.pushState;
  window.history.pushState = function (...args) {
    const sonuc = orijinalPushState.apply(this, args);
    gecmisDinleyicileriniBilgilendir();
    return sonuc;
  };

  const orijinalReplaceState = window.history.replaceState;
  window.history.replaceState = function (...args) {
    const sonuc = orijinalReplaceState.apply(this, args);
    gecmisDinleyicileriniBilgilendir();
    return sonuc;
  };
}

// Returns `null` during server rendering and initial hydration, then the
// decoded plate (or "" if empty/malformed) from `window.location.hash`,
// updating on `hashchange`, `popstate` and router `pushState`/`replaceState`.
export function usePlaka(): string | null {
  const [plaka, setPlaka] = useState<string | null>(null);

  useEffect(() => {
    gecmisYamasiniKur();
    let iptal = false;

    function oku() {
      if (iptal) return;
      setPlaka(plakaCoz(window.location.hash));
    }

    gecmisDinleyicileri.add(oku);
    window.addEventListener("hashchange", oku);
    window.addEventListener("popstate", oku);
    // Deferred past the synchronous useEffect flush so parent AppRouter
    // effects that call history.pushState run before the initial read.
    queueMicrotask(oku);
    const zamanlayici = setTimeout(oku, 0);

    return () => {
      iptal = true;
      clearTimeout(zamanlayici);
      gecmisDinleyicileri.delete(oku);
      window.removeEventListener("hashchange", oku);
      window.removeEventListener("popstate", oku);
    };
  }, []);

  return plaka;
}
