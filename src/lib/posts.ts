import { getCollection, type CollectionEntry } from "astro:content";
import site from "../../site.json" with { type: "json" };

export type Post = CollectionEntry<"posts">;

export const baseUrl = site.url.replace(/\/$/, "");

/** Published posts, newest first. Drafts show up only in dev. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection("posts", ({ data }) =>
    import.meta.env.PROD ? !data.draft : true,
  );
  return posts.sort((a, b) =>
    a.data.date < b.data.date ? 1
    : a.data.date > b.data.date ? -1
    : a.id < b.id ? -1
    : 1,
  );
}

/** URL shape the old build produced — the .html extension is preserved. */
export const postPath = (id: string) => `/posts/${id}.html`;

const dateFmt = new Intl.DateTimeFormat(site.lang, {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
export const humanDate = (d: string) => dateFmt.format(new Date(`${d}T00:00:00Z`));
