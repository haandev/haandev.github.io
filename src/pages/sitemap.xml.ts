import { baseUrl, getPosts } from "../lib/posts";
import { homePath, langs, postPath, type Lang } from "../lib/i18n";

// Each URL lists its translations (xhtml:link hreflang) so search engines
// pair the English and Turkish versions instead of treating them as dupes.
export async function GET() {
  const byLang = Object.fromEntries(
    await Promise.all(langs.map(async (l) => [l, await getPosts(l)] as const)),
  ) as Record<Lang, Awaited<ReturnType<typeof getPosts>>>;

  const alternates = (paths: Partial<Record<Lang, string>>) =>
    Object.entries(paths)
      .map(([l, p]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${baseUrl}${p}"/>`)
      .join("");

  const homes = Object.fromEntries(langs.map((l) => [l, homePath(l)]));
  const urls = langs.map((l) => `  <url><loc>${baseUrl}${homePath(l)}</loc>${alternates(homes)}</url>`);

  for (const l of langs) {
    for (const p of byLang[l]) {
      const paths: Partial<Record<Lang, string>> = {};
      for (const k of langs) if (byLang[k].some((q) => q.id === p.id)) paths[k] = postPath(p.id, k);
      urls.push(
        `  <url><loc>${baseUrl}${postPath(p.id, l)}</loc><lastmod>${p.data.date}</lastmod>${alternates(paths)}</url>`,
      );
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}
