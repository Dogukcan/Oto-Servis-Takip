import type { Arac } from "./types";

export const sahteAraclar: Arac[] = [
  {
    plaka: "34 ABC 123",
    musteri: "Ahmet Yılmaz",
    telefon: "0532 111 22 33",
    islemler: [
      {
        tarih: "2026-04-01",
        yapilanIs: "Marş motoru tamiri",
        ucret: 900,
        garantiBitis: "2026-10-01",
        sonrakiBakim: "2026-10-01",
      },
      {
        tarih: "2026-08-12",
        yapilanIs: "Akü değişimi",
        ucret: 1500,
        garantiBitis: "2027-08-12",
        sonrakiBakim: "2026-10-01",
      },
    ],
  },
  {
    plaka: "06 XYZ 456",
    musteri: "Mehmet Kaya",
    telefon: "0533 222 33 44",
    islemler: [
      {
        tarih: "2026-09-01",
        yapilanIs: "Alternatör tamiri",
        ucret: 2200,
        garantiBitis: "2027-03-01",
        sonrakiBakim: "2026-11-10",
      },
    ],
  },
  {
    plaka: "35 DEF 789",
    musteri: "Ayşe Demir",
    telefon: "0534 333 44 55",
    islemler: [
      {
        tarih: "2026-08-01",
        yapilanIs: "Far sensörü",
        ucret: 650,
        garantiBitis: "2027-08-01",
        sonrakiBakim: "2027-02-01",
      },
    ],
  },
];
