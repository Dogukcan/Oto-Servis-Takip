"use client";

import { useState } from "react";
import Link from "next/link";
import type { Arac } from "@/lib/types";
import { aracAra } from "@/lib/arama";
import { aracBakimDurumu } from "@/lib/bakim-durumu";
import { DurumRozeti } from "./DurumRozeti";

export function AramaSonuclari({ araclar }: { araclar: Arac[] }) {
  const [sorgu, setSorgu] = useState("");
  const sonuclar = aracAra(araclar, sorgu);

  return (
    <>
      <div className="arama-kutusu">
        <input
          type="text"
          placeholder="Plaka yazın (örn. 34 ABC 123)"
          value={sorgu}
          onChange={(e) => setSorgu(e.target.value)}
          autoFocus
        />
      </div>

      {sonuclar.length === 0 ? (
        <p>Eşleşen araç bulunamadı.</p>
      ) : (
        <div className="tablo-sarici">
          <table>
            <thead>
              <tr>
                <th>Plaka</th>
                <th>Müşteri</th>
                <th>Durum</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sonuclar.map((arac) => (
                <tr key={arac.plaka}>
                  <td>{arac.plaka}</td>
                  <td>{arac.musteri}</td>
                  <td>
                    <DurumRozeti durum={aracBakimDurumu(arac)} />
                  </td>
                  <td>
                    <Link
                      className="buyuk-buton"
                      href={`/arac/${encodeURIComponent(arac.plaka)}`}
                    >
                      Detay
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
