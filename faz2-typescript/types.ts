export interface Islem {
  tarih: string; // ISO tarih, örn. "2026-08-12"
  yapilanIs: string;
  ucret: number;
  garantiBitis: string; // ISO tarih
  sonrakiBakim: string; // ISO tarih
}

export interface Arac {
  plaka: string;
  musteri: string;
  telefon: string;
  islemler: Islem[];
}
