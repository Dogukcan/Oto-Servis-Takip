# Güvenlik

## Anahtarlar nerede durur

Gerçek API anahtarları `.env.local` dosyasında durur. Bu dosya `.gitignore` ile dışlanmıştır, hiçbir zaman commit edilmez. Repoda yalnızca `.env.example` bulunur; o dosyada değişken adları ve açıklayıcı yorumlar vardır, gerçek değer yoktur.

## Kim erişir

Anahtarlara yalnızca backend kodu (sunucu tarafı, `process.env` / `os.environ` üzerinden) erişir. Frontend veya agent kodu hiçbir zaman anahtarı doğrudan görmez, dış API'ye doğrudan istek atmaz. İstekler backend'deki proxy endpoint'i üzerinden geçer.

## Rotate (anahtar değiştirme) süreci

1. Sağlayıcının panelinden yeni bir anahtar oluştur.
2. `.env.local` dosyasındaki eski değeri yeni anahtarla değiştir (bu dosya elle düzenlenir, repoya girmez).
3. Uygulamayı yeniden başlat, proxy endpoint'inin yeni anahtarla çalıştığını doğrula.
4. Sağlayıcı panelinden eski anahtarı iptal et.

## Sızıntı olursa

1. Sızan anahtarı sağlayıcı panelinden hemen iptal et (rotate değil, doğrudan iptal).
2. Yeni anahtar oluştur, yukarıdaki rotate sürecini uygula.
3. Sağlayıcının kullanım/log geçmişinden anahtarın yetkisiz kullanılıp kullanılmadığını kontrol et.
4. Sızıntının nereden geldiğini bul (commit geçmişi, log dosyası, ekran görüntüsü vb.) ve o kaynağı kapat.

## API eklendiğinde uygulanacak mimari kural

Şu an projede somut bir dış API yok. İleride bir API eklendiğinde şu kurallar geçerli olacak:

- Backend, anahtarı sadece `process.env` / `os.environ` üzerinden okur. Anahtar yoksa net bir hata verir, sessizce geçmez.
- Anahtar yoksa geliştirme ortamında mock/sandbox yanıt dönülür; agent veya geliştirici gerçek anahtar olmadan test edebilir.
- Frontend veya agent kodu sadece kendi backend endpoint'ine istek atar, dış API'ye doğrudan istek atmaz.
- Backend yalnızca allowlist'teki endpoint'lere isteği iletir.
- Anahtar hiçbir log satırına veya yanıt gövdesine girmez.
- Hata yakalamada `error.config.headers` veya ham HTTP request/response nesneleri loglanmaz.

Bu kural, Faz 3/4'te Next.js backend kurulduğunda `lib/api-proxy.ts` deseniyle uygulanacaktır.
