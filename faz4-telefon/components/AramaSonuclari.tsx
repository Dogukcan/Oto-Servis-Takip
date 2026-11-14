"use client";

import { useState } from "react";
import type { Arac } from "@/lib/types";
import { aracAra } from "@/lib/arama";
import { AracListesi } from "./AracListesi";

export function AramaSonuclari({ araclar }: { araclar: Arac[] }) {
  const [sorgu, setSorgu] = useState("");
  const sonuclar = aracAra(araclar, sorgu);

  return (
    <>
      <div className="arama-kutusu">
        <input
          type="text"
          aria-label="Plaka ile ara"
          placeholder="Plaka yazın (örn. 34 ABC 123)"
          autoCapitalize="characters"
          autoComplete="off"
          value={sorgu}
          onChange={(e) => setSorgu(e.target.value)}
          autoFocus
        />
      </div>

      {sonuclar.length === 0 ? (
        <p className="bos-durum">
          {araclar.length === 0
            ? "Henüz kayıtlı araç yok."
            : "Bu plakayla eşleşen araç yok. Yazdığınız plakayı kontrol edin."}
        </p>
      ) : (
        <AracListesi araclar={sonuclar} />
      )}
    </>
  );
}
