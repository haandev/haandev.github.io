# haandev.github.io

Astro + MDX ile kurulmuş, anasayfası ve beslemeleri otomatik üretilen blog.

## Yeni yazı

```bash
npm run new -- "Yazının Başlığı"
```

`src/content/posts/<slug>.mdx` oluşur ve `draft: true` ile başlar.

Kural: **düz metin markdown yazılır.** Başlık `##`, vurgu `**`, bağlantı
`[metin](url)`, liste `-`, alıntı `>`. HTML yalnızca markdown'ın karşılığı
olmayan yerlerde kullanılır — `class` taşıyan bölümler, `<figure>` + SVG
figürler, biçimli tablolar. Yazıya özel CSS `<style>` bloğu değil,
`src/styles/posts/<slug>.css` dosyasıdır; MDX'in en üstünden `import` edilir.

HTML kalan tek inline durum, markdown'da karşılığı olmayan biçimlendirmedir:
inline renk taşıyan `<b style="color:…">` gibi. Etiketi doğrudan hedefleyen
CSS kuralları (`figcaption b`, `.cap .legend i`) markdown'ın ürettiği
`<strong>`/`<em>` karşılıklarını da kapsayacak şekilde yazılmıştır — yeni
böyle bir kural eklerken aynısını yap.

Frontmatter alanları `src/content.config.ts`'teki şemayla doğrulanır — hatalı
alan build'i durdurur:

| Alan | Zorunlu | Not |
| --- | --- | --- |
| `title` | evet | Sayfa başlığı ve `<h1>`. |
| `date` | evet | `YYYY-MM-DD`. |
| `description` | hayır | Anasayfa listesinde ve RSS'te görünür. |
| `ogDescription` | hayır | OG etiketi için ayrı, daha kısa özet. |
| `dek` | hayır | Başlık altındaki spot. Ham HTML basılır. |
| `headerExtra` | hayır | Header'a giren yazıya özel dekorasyon. Ham HTML. |
| `tags` | hayır | YAML listesi. |
| `draft` | hayır | `true` ise sadece `npm run dev`'de görünür. |

## Geliştirme

```bash
npm run dev
```

`http://localhost:4321` — hot reload'lu. Üretim çıktısını denemek için
`npm run build && npm run preview`.

## Yayına alma

`main` dalına push yeter. GitHub Actions `npm run build` çalıştırıp `dist/`
klasörünü Pages'e deploy eder.

## Stil

Üç katman var, sırayla dene:

1. **`public/assets/style.css`** — tasarım dilinin kendisi. Tipografi, renk
   değişkenleri, ve birden fazla yazının paylaştığı bileşenler: `.oz` (özet
   kutusu), `.not` (uyarı kutusu), `.tbl` (kayan tablo sarmalayıcı), `.refs`
   (kaynakça), `.fig-narrow`, `.wide.flush`, `.fig-frame.tight`, `.g`/`.a`
   (konu kolu renkleri).
2. **`src/styles/posts/<slug>.css`** — yalnızca o yazıya has olan: renk
   değişkenlerini tanımlayan `bodyClass` bloğu, hangi bölümün hangi rengi
   aldığı, ve o yazıya özgü bileşenler.
3. **Inline `style`** — sadece *veri* için. Grafikteki bir çubuğun oranı
   (`style="flex:13"`) veridir; renk, ölçü, boşluk değildir. Bir görünüm
   kararını inline yazıyorsan yeri 1. ya da 2. katmandır.

Yazıya özel CSS'te bir kural ikinci kez karşına çıkıyorsa `style.css`'e taşı.
Sınıf adı seçerken ortak isimlerle çakışmamaya dikkat et — `.oz` özet kutusu
demek, bu yüzden ekibimi yazısının "özerklik" listesi `.liste.n-oz` oldu.

`figure svg text { font-family }` bilerek ortak değil: CSS, SVG'nin
`font-family` niteliğini her zaman ezer, dolayısıyla global bir kural kendi
tipografisini taşıyan figürleri bozar. İhtiyacı olan yazı kendi dosyasına
koyar.

## MDX'te dikkat

MDX gövdeyi JSX olarak ayrıştırır, tarayıcı kadar affedici değildir:

- Etiketler dengeli kapanmalı, void elementler self-close olmalı (`<br />`).
- Çok satıra yayılan bir elementin açılış etiketi kendi satırında durmalı —
  `<blockquote><p>…` diye başlayıp alt satırda kapanan blok hata verir.
- Boşluğu anlamlı `<pre>` içeriğini template literal'a al:
  ``<pre><code>{`…`}</code></pre>``
- Metindeki `~` ve `{` kaçışlanmalı (`\~`, `\{`) — yoksa üstü çizili / JSX
  ifadesi sanılır.

Tipografi ayarları `astro.config.mjs`'te: smartypants kapalı, kesme işaretleri
yazıldığı gibi kalır.

## Üretilen dosyalar

`dist/` altındaki her şey — `index.html`, `posts/*.html`, `index.json`,
`rss.xml`, `sitemap.xml`. Git'e girmez, Actions her push'ta yeniden üretir.
Yazı URL'leri `.html` uzantılı kalsın diye `build.format: "file"` kullanılıyor;
bunu değiştirmek eski bağlantıları ve RSS guid'lerini kırar.
