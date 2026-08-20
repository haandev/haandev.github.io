import rss from "@astrojs/rss";
import site from "../../site.json" with { type: "json" };
import { baseUrl, getPosts, postPath } from "../lib/posts";

export async function GET(context: { site?: URL }) {
  const posts = await getPosts();
  return rss({
    title: site.title,
    description: site.description,
    site: context.site!,
    xmlns: { atom: "http://www.w3.org/2005/Atom" },
    customData:
      `<language>${site.lang}</language>` +
      `<atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>`,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      link: postPath(p.id),
      pubDate: new Date(`${p.data.date}T00:00:00Z`),
    })),
  });
}
