import { bosVeri, iceAktar, type Veri } from "./depo";

// Browser IndexedDB storage for the single Veri document. Nothing outside this
// module touches IndexedDB directly.

const VERITABANI_ADI = "servis-takip";
const VERITABANI_SURUMU = 1;
const DEPO_ADI = "veri";
const KAYIT_ANAHTARI = "ana";

function veritabaniAc(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(
        new Error("Bu tarayıcıda yerel depolama (IndexedDB) kullanılamıyor.")
      );
      return;
    }

    let istek: IDBOpenDBRequest;
    try {
      istek = indexedDB.open(VERITABANI_ADI, VERITABANI_SURUMU);
    } catch {
      reject(new Error("Tarayıcı veritabanı açılamadı."));
      return;
    }

    istek.onupgradeneeded = () => {
      const db = istek.result;
      if (!db.objectStoreNames.contains(DEPO_ADI)) {
        db.createObjectStore(DEPO_ADI);
      }
    };

    istek.onsuccess = () => {
      resolve(istek.result);
    };

    istek.onerror = () => {
      reject(new Error("Tarayıcı veritabanı açılamadı."));
    };

    istek.onblocked = () => {
      reject(
        new Error("Tarayıcı veritabanı başka bir sekme tarafından engellendi.")
      );
    };
  });
}

// Reads the stored Veri value. Returns bosVeri() when nothing has been stored
// yet. If a stored value exists but fails iceAktar validation, throws an Error
// with a Turkish message and leaves the stored value untouched.
export async function veriyiOku(): Promise<Veri> {
  const db = await veritabaniAc();
  let ham: unknown;

  try {
    ham = await new Promise<unknown>((resolve, reject) => {
      const islem = db.transaction(DEPO_ADI, "readonly");
      const depo = islem.objectStore(DEPO_ADI);
      const istek = depo.get(KAYIT_ANAHTARI);

      istek.onsuccess = () => {
        resolve(istek.result);
      };

      istek.onerror = () => {
        reject(new Error("Kayıtlı veriler tarayıcıdan okunamadı."));
      };

      islem.onabort = () => {
        reject(new Error("Kayıtlı veriler tarayıcıdan okunamadı."));
      };
    });
  } finally {
    db.close();
  }

  if (ham === undefined) {
    return bosVeri();
  }

  let metin: string;
  try {
    const serilestirilen = JSON.stringify(ham);
    if (typeof serilestirilen !== "string") {
      throw new Error("not serialisable");
    }
    metin = serilestirilen;
  } catch {
    throw new Error("Kayıtlı veriler bozuk olduğu için okunamadı.");
  }

  const dogrulama = iceAktar(metin);
  if (!dogrulama.tamam) {
    throw new Error(`Kayıtlı veriler doğrulanamadı: ${dogrulama.hata}`);
  }

  return dogrulama.veri;
}

// Writes the whole Veri value under the single store key.
export async function veriyiYaz(veri: Veri): Promise<void> {
  const db = await veritabaniAc();

  try {
    await new Promise<void>((resolve, reject) => {
      const islem = db.transaction(DEPO_ADI, "readwrite");
      const depo = islem.objectStore(DEPO_ADI);
      depo.put(veri, KAYIT_ANAHTARI);

      islem.oncomplete = () => {
        resolve();
      };

      islem.onerror = () => {
        reject(new Error("Veriler tarayıcıya kaydedilemedi."));
      };

      islem.onabort = () => {
        reject(new Error("Veriler tarayıcıya kaydedilemedi."));
      };
    });
  } finally {
    db.close();
  }
}

// Requests persistent storage from the browser when supported so the OS does
// not evict IndexedDB data under storage pressure.
export async function kaliciDepolamaIste(): Promise<boolean> {
  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.storage &&
      typeof navigator.storage.persist === "function"
    ) {
      return await navigator.storage.persist();
    }
  } catch {
    // Ignored: browsers may reject or block storage.persist().
  }
  return false;
}
