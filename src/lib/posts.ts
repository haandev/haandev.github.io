import { getCollection, type CollectionEntry } from "astro:content";
import site from "../../site.json" with { type: "json" };
import type { Lang } from "./i18n";

export { postPath } from "./i18n";

export type Post = CollectionEntry<"posts"> | CollectionEntry<"postsTr">;

export const baseUrl = site.url.replace(/\/$/, "");

const collectionOf = { en: "posts", tr: "postsTr" } as const;

/** Published posts in one language, newest first. Drafts show up only in dev. */
export async function getPosts(lang: Lang = "en"): Promise<Post[]> {
  const posts: Post[] = await getCollection(collectionOf[lang], ({ data }) =>
    import.meta.env.PROD ? !data.draft : true,
  );
  return posts.sort((a, b) =>
    a.data.date < b.data.date ? 1
    : a.data.date > b.data.date ? -1
    : a.id < b.id ? -1
    : 1,
  );
}

/** Slugs that have a published post in the given language. */
export async function slugsIn(lang: Lang): Promise<Set<string>> {
  return new Set((await getPosts(lang)).map((p) => p.id));
}

const dateFmt = Object.fromEntries(
  (["en", "tr"] as const).map((l) => [
    l,
    new Intl.DateTimeFormat(l, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
  ]),
) as Record<Lang, Intl.DateTimeFormat>;

export const humanDate = (d: string, lang: Lang = "en") =>
  dateFmt[lang].format(new Date(`${d}T00:00:00Z`));
