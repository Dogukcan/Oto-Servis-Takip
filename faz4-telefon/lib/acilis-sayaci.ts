// Pure timing logic for counting a return from the background as a new
// "acilis" when the page becomes visible again after at least 30 minutes
// hidden. Kept free of DOM/storage globals so it can be unit-tested directly.

export const ARKA_PLAN_ACILIS_ESIGI_MS = 30 * 60 * 1000;

export type GorunurlukDurumu = "visible" | "hidden";

// Returns true when a page hidden at `gizlenmeZamani` (epoch ms) and becoming
// visible at `simdi` (epoch ms) has been in the background for at least
// `esikMs` (30 minutes by default).
export function arkaPlanAcilisiSayilmaliMi(
  gizlenmeZamani: number | null,
  simdi: number,
  esikMs: number = ARKA_PLAN_ACILIS_ESIGI_MS
): boolean {
  if (gizlenmeZamani === null) return false;
  if (!Number.isFinite(gizlenmeZamani) || !Number.isFinite(simdi)) {
    return false;
  }
  return simdi - gizlenmeZamani >= esikMs;
}

export interface AcilisSayaciIzleyici {
  gorunurlukDegisti: (durum: GorunurlukDurumu, simdi?: number) => boolean;
}

// Tracks `visibilitychange` transitions and returns true only when a transition
// to "visible" follows a "hidden" period of at least `esikMs`.
export function acilisIzleyiciOlustur(
  esikMs: number = ARKA_PLAN_ACILIS_ESIGI_MS
): AcilisSayaciIzleyici {
  let gizlenmeZamani: number | null = null;

  return {
    gorunurlukDegisti(
      durum: GorunurlukDurumu,
      simdi: number = Date.now()
    ): boolean {
      if (durum === "hidden") {
        // Keep the first hidden timestamp if multiple hidden events fire in a row.
        if (gizlenmeZamani === null && Number.isFinite(simdi)) {
          gizlenmeZamani = simdi;
        }
        return false;
      }

      const sayilmali = arkaPlanAcilisiSayilmaliMi(
        gizlenmeZamani,
        simdi,
        esikMs
      );
      gizlenmeZamani = null;
      return sayilmali;
    },
  };
}
