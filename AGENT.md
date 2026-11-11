# Not

Bu dosyada (`AGENT.md`) yapılan her değişiklik `CLAUDE.md` dosyasına da aynen uygulanmalı.

# Yarım iş takibi

- Bir iş yarım kalırsa (faz ortasında kesilirse, bir fonksiyon eksik kalırsa, bir karar bekliyorsa) `backlog.md`'ye not düşülür: ne yapıldı, ne eksik kaldı, nereden devam edilecek. İş tamamlanınca ilgili madde silinir.
- `backlog-log.md`, çalışma sırasındaki ilerleme notlarını tutar. İş bittikçe o işe ait log temizlenir; dosya biriken geçmiş değil, o anki açık işlerin günlüğü olarak kalır.
- Bu iki dosya her projede varsayılan olarak oluşturulur ve güncel tutulur.

# API anahtarı güvenliği

- Gerçek API anahtarı asla istenmez, okunmaz, yazılmaz, ekrana basılmaz. Anahtar yerine placeholder kullanılır.
- `.env` dosyası oluşturulmaz. Sadece `.env.example` oluşturulur, değerler boş bırakılır.
- Frontend veya agent kodu dış API'ye doğrudan istek atmaz; kendi backend endpoint'ine istek atar. Backend anahtarı sadece `process.env` / `os.environ` üzerinden okur, anahtar yoksa net bir hata verir, anahtar log'a veya yanıta hiç girmez. Sadece allowlist'teki endpoint'ler iletilir.
- Bu kurallardan biri çelişirse durulur, kullanıcıya sorulur.
- Silme, push, paket kurma gibi geri alınamaz işlemlerden önce kullanıcıya sorulur.
