import Link from "next/link";
import { yedekDurumunuOku } from "@/lib/yedekle";
import { Menu } from "./Menu";
import { TemaDugmesi } from "./TemaDugmesi";

export function UstBar() {
  const yedekDurumu = yedekDurumunuOku();
  const sonYedekBasarisiz = yedekDurumu !== null && !yedekDurumu.basarili;

  return (
    <header className="ust-bar">
      <Link className="marka" href="/">
        <svg className="marka-isaret" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13.5 2 4 13.5h6.5L9.5 22 20 10h-6.5L13.5 2Z" />
        </svg>
        Servis Takip
      </Link>
      <nav className="menu" aria-label="Ana menü">
        <Menu />
        <a
          href="/api/yedek"
          download
          title={
            sonYedekBasarisiz
              ? `Son otomatik yedek başarısız oldu: ${yedekDurumu.hata ?? "bilinmeyen hata"}`
              : undefined
          }
        >
          Yedek Al
          {sonYedekBasarisiz && (
            <span className="yedek-uyari">son yedek alınamadı</span>
          )}
        </a>
        <TemaDugmesi />
      </nav>
    </header>
  );
}
