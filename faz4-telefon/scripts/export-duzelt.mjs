import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Pure path fixer for Next.js static export RSC segment files on Windows.
// Given a path relative to `out/` (with `/` or `\` separators), returns the
// corrected POSIX relative path where segments inside a `__next.<segment>`
// directory are flattened with `.`, or `null` if the path does not need fixing
// or is unsafe.
export function segmentYolunuDuzelt(goreliYol) {
  if (typeof goreliYol !== "string" || goreliYol.length === 0) {
    return null;
  }

  // Reject absolute paths, Windows drive letters, or trailing slashes.
  if (
    goreliYol.startsWith("/") ||
    goreliYol.startsWith("\\") ||
    /^[a-zA-Z]:/.test(goreliYol) ||
    goreliYol.endsWith("/") ||
    goreliYol.endsWith("\\")
  ) {
    return null;
  }

  const parcalar = goreliYol.split(/[\\/]+/);
  if (parcalar.some((p) => p === "" || p === "." || p === "..")) {
    return null;
  }

  const baslangic = parcalar.findIndex(
    (p) => p.startsWith("__next.") && p.length > "__next.".length
  );
  // Only paths where `__next.<segment>` is a directory (not already a flat file)
  // need to be moved.
  if (baslangic === -1 || baslangic === parcalar.length - 1) {
    return null;
  }

  const ustDizinler = parcalar.slice(0, baslangic);
  const noktaDosyaAdi = parcalar.slice(baslangic).join(".");
  return [...ustDizinler, noktaDosyaAdi].join("/");
}

function outIcindeMi(kokOut, tamYol) {
  const goreli = path.relative(kokOut, path.resolve(tamYol));
  return (
    goreli.length > 0 &&
    goreli !== "." &&
    !goreli.startsWith("..") &&
    !path.isAbsolute(goreli)
  );
}

// Walks `outDizini`, moves every file inside a `__next.*` directory up next to
// that directory under its dotted filename, and removes the emptied `__next.*`
// directories.
export function exportDuzelt(outDizini, yazdir = console.log) {
  const kokOut = path.resolve(outDizini);
  if (path.basename(kokOut) !== "out") {
    throw new Error(
      `Güvenlik hatası: yalnızca "out" klasörü üzerinde çalışabilir (${kokOut}).`
    );
  }
  if (!fs.existsSync(kokOut)) {
    return [];
  }
  const kokStat = fs.lstatSync(kokOut);
  if (!kokStat.isDirectory() || kokStat.isSymbolicLink()) {
    throw new Error(`Geçersiz out dizini: ${kokOut}`);
  }

  const tasinanlar = [];

  function diziniTara(mevcutDizin, nextDiziniIcinde) {
    if (mevcutDizin !== kokOut && !outIcindeMi(kokOut, mevcutDizin)) {
      throw new Error(`Güvenlik hatası: out dizini dışına çıkılamaz (${mevcutDizin}).`);
    }

    const girdiler = fs
      .readdirSync(mevcutDizin, { withFileTypes: true })
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

    for (const girdi of girdiler) {
      if (girdi.isSymbolicLink()) {
        continue;
      }
      const tamYol = path.join(mevcutDizin, girdi.name);
      if (!outIcindeMi(kokOut, tamYol)) {
        throw new Error(`Güvenlik hatası: out dizini dışına çıkılamaz (${tamYol}).`);
      }

      if (girdi.isDirectory()) {
        const buNextDizini =
          nextDiziniIcinde ||
          (girdi.name.startsWith("__next.") &&
            girdi.name.length > "__next.".length);
        diziniTara(tamYol, buNextDizini);
      } else if (girdi.isFile() && nextDiziniIcinde) {
        const goreliKaynak = path.relative(kokOut, tamYol);
        const goreliHedef = segmentYolunuDuzelt(goreliKaynak);
        if (goreliHedef === null) {
          continue;
        }
        const hedefTamYol = path.resolve(kokOut, goreliHedef);
        if (!outIcindeMi(kokOut, hedefTamYol)) {
          throw new Error(
            `Güvenlik hatası: hedef out dizini dışında (${hedefTamYol}).`
          );
        }

        if (fs.existsSync(hedefTamYol)) {
          const hedefStat = fs.lstatSync(hedefTamYol);
          if (!hedefStat.isFile() || hedefStat.isSymbolicLink()) {
            throw new Error(
              `Hedef konumda farklı türde bir girdi zaten var: ${goreliHedef}`
            );
          }
          const kaynakIcerik = fs.readFileSync(tamYol);
          const hedefIcerik = fs.readFileSync(hedefTamYol);
          if (!kaynakIcerik.equals(hedefIcerik)) {
            throw new Error(
              `Hedef dosya zaten var ve içeriği farklı: ${goreliHedef}`
            );
          }
          fs.unlinkSync(tamYol);
        } else {
          fs.renameSync(tamYol, hedefTamYol);
        }

        const kaynakNorm = goreliKaynak.replace(/\\/g, "/");
        tasinanlar.push({ kaynak: kaynakNorm, hedef: goreliHedef });
        yazdir(`Taşındı: ${kaynakNorm} -> ${goreliHedef}`);
      }
    }

    if (nextDiziniIcinde && mevcutDizin !== kokOut) {
      const kalanlar = fs.readdirSync(mevcutDizin);
      if (kalanlar.length === 0) {
        fs.rmdirSync(mevcutDizin);
      }
    }
  }

  diziniTara(kokOut, false);
  return tasinanlar;
}

const buDosya = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === buDosya) {
  const varsayilanOut = path.resolve(path.dirname(buDosya), "..", "out");
  exportDuzelt(varsayilanOut);
}
