import rss from "@astrojs/rss";
import site from "../../site.json" with { type: "json" };
import { baseUrl, getPosts } from "./posts";
import { postPath, rssPath, ui, type Lang } from "./i18n";

export async function feed(lang: Lang, siteUrl: URL) {
  const posts = await getPosts(lang);
  return rss({
    title: site.title,
    description: ui[lang].description,
    site: siteUrl,
    xmlns: { atom: "http://www.w3.org/2005/Atom" },
    customData:
      `<language>${lang}</language>` +
      `<atom:link href="${baseUrl}${rssPath(lang)}" rel="self" type="application/rss+xml"/>`,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      link: postPath(p.id, lang),
      pubDate: new Date(`${p.data.date}T00:00:00Z`),
    })),
  });
}
