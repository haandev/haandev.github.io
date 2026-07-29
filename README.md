# haandev.github.io

Her yazının kendi HTML sayfası olduğu, anasayfası otomatik üretilen blog.

## Yeni yazı

```bash
npm run new "Yazının Başlığı"
```

`posts/<slug>.html` oluşur. İçini doldur — istediğin `<style>`, `<script>`, SVG,
canvas ne varsa serbest. Sadece `<head>` içindeki şu metaları güncelle:

| Meta | Zorunlu | Not |
| --- | --- | --- |
| `date` | evet | `YYYY-MM-DD`. Yoksa build hata verir. |
| `description` | hayır | Anasayfa listesinde ve RSS'te görünür. |
| `tags` | hayır | Virgülle ayrılmış. |
| `draft` | hayır | `true` ise hiçbir yerde listelenmez. |

Başlık `<h1>`'den okunur.

## Önizleme

```bash
npm run preview
```

`http://localhost:4000` — build alır ve yerel sunucu açar.

## Yayına alma

`main` dalına push yeter. GitHub Actions `build.mjs`'i çalıştırıp Pages'e
deploy eder.

## Üretilen dosyalar

`index.html`, `index.json`, `rss.xml`, `sitemap.xml`, `robots.txt` — hepsi
`build.mjs` çıktısı, git'e girmez. Elle düzenleme; anasayfa şablonu
`templates/index.html`.
