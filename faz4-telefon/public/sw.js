const SURUM = "__SW_SURUM__";
const ONBELLEK_LISTESI = ["__SW_LISTE__"];
const ONBELLEK_ON_EKI = "servis-takip-";
const ONBELLEK_ADI = ONBELLEK_ON_EKI + SURUM;

const PARALEL_INDIRME_SINIRI = 6;

async function dosyayiOnbellekle(onbellek, goreliYol) {
  const tamUrl = new URL(goreliYol, self.registration.scope).href;
  const yanit = await fetch(tamUrl, { cache: "reload" });

  if (!yanit.ok) {
    throw new Error(`Onbellek yuklemesi basarisiz: ${tamUrl} (${yanit.status})`);
  }

  // WebKit refuses to serve a response whose redirected flag is set for a
  // navigation request, so rebuild a clean Response from the body when needed.
  // Strip transfer-encoding metadata headers so they do not conflict with the
  // already-decoded body stream.
  let kaydedilecekYanit = yanit;
  if (yanit.redirected) {
    const basliklar = new Headers(yanit.headers);
    basliklar.delete("content-encoding");
    basliklar.delete("content-length");
    kaydedilecekYanit = new Response(yanit.body, {
      status: yanit.status,
      statusText: yanit.statusText,
      headers: basliklar,
    });
  }

  await onbellek.put(tamUrl, kaydedilecekYanit);
}

self.addEventListener("install", (olay) => {
  olay.waitUntil(
    (async () => {
      try {
        const onbellek = await caches.open(ONBELLEK_ADI);
        let sira = 0;

        async function isciCalistir() {
          while (sira < ONBELLEK_LISTESI.length) {
            const goreliYol = ONBELLEK_LISTESI[sira++];
            await dosyayiOnbellekle(onbellek, goreliYol);
          }
        }

        // Every asset in the build must be fetched and cached atomically before
        // this version is considered installed; if any fetch fails, the promise
        // rejects so the previous worker and its cache stay intact.
        const isciSayisi = Math.min(
          PARALEL_INDIRME_SINIRI,
          ONBELLEK_LISTESI.length
        );
        await Promise.all(
          Array.from({ length: isciSayisi }, () => isciCalistir())
        );
      } catch (hata) {
        await caches.delete(ONBELLEK_ADI);
        throw hata;
      }

      // Intentionally do NOT call self.skipWaiting() here: a new worker must
      // wait until all tabs/pages running the old version are closed so that a
      // single page session never mixes HTML, RSC payloads, and JS chunks from
      // two different deployments.
    })()
  );
});

self.addEventListener("activate", (olay) => {
  olay.waitUntil(
    (async () => {
      const anahtarlar = await caches.keys();
      await Promise.all(
        anahtarlar
          .filter(
            (ad) => ad.startsWith(ONBELLEK_ON_EKI) && ad !== ONBELLEK_ADI
          )
          .map((ad) => caches.delete(ad))
      );
      await self.clients.claim();
    })()
  );
});

async function gezinmeYaniti(istek) {
  const onbellek = await caches.open(ONBELLEK_ADI);
  const sadeUrl = new URL(istek.url);
  sadeUrl.search = "";
  sadeUrl.hash = "";

  let kayitli = await onbellek.match(sadeUrl.href);
  if (!kayitli && !sadeUrl.pathname.endsWith("/")) {
    kayitli = await onbellek.match(`${sadeUrl.href}/`);
  }
  if (kayitli) return kayitli;

  try {
    return await fetch(istek);
  } catch (hata) {
    const kokUrl = new URL("./", self.registration.scope).href;
    const kokSayfa = await onbellek.match(kokUrl);
    if (kokSayfa) return kokSayfa;
    throw hata;
  }
}

async function varlikYaniti(istek) {
  const onbellek = await caches.open(ONBELLEK_ADI);
  const kayitli = await onbellek.match(istek, { ignoreSearch: true });
  if (kayitli) return kayitli;
  return fetch(istek);
}

// The fetch handler only reads from ONBELLEK_ADI and never writes to it.
// Because the entire static export is pre-cached during install, writing single
// responses during runtime could mix HTML and chunks from different builds or
// overwrite valid cached pages when the connection is partial.
self.addEventListener("fetch", (olay) => {
  const istek = olay.request;
  if (istek.method !== "GET") return;

  const url = new URL(istek.url);
  if (url.origin !== self.location.origin) return;

  if (istek.mode === "navigate") {
    olay.respondWith(gezinmeYaniti(istek));
    return;
  }

  olay.respondWith(varlikYaniti(istek));
});
