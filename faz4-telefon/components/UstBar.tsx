import Link from "next/link";
import { Menu } from "./Menu";
import { TemaDugmesi } from "./TemaDugmesi";

export function UstBar() {
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
        {/* Backup button: added in the next piece */}
        <TemaDugmesi />
      </nav>
    </header>
  );
}
