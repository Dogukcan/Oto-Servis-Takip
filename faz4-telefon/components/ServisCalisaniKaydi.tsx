"use client";

import { useEffect } from "react";

const TABAN_YOL = process.env.TELEFON_BASE_PATH || "";

export function ServisCalisaniKaydi() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const kapsam = `${TABAN_YOL}/`;
    const betikYolu = `${TABAN_YOL}/sw.js`;

    void navigator.serviceWorker
      .register(betikYolu, { scope: kapsam })
      .catch(() => {
        // Service worker registration can fail in restricted browsing modes;
        // the app still runs with IndexedDB.
      });
  }, []);

  return null;
}
