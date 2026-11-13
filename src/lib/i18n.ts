// The site is bilingual. English lives at the root (/ and /posts/<slug>.html),
// Turkish under /tr (/tr/ and /tr/posts/<slug>.html). A Turkish post uses the
// same slug as its English counterpart, so switching language only toggles
// the /tr prefix.

export const langs = ["en", "tr"] as const;
export type Lang = (typeof langs)[number];

export const ui = {
  en: {
    description: "Notes on software, the web, and everything in between.",
    noPosts: "No posts yet.",
    allPosts: "all posts",
    switchLabel: "Türkçe",
    switchTitle: "Bu sayfanın Türkçesi",
  },
  tr: {
    description: "Yazılım, web ve aradaki her şey üzerine notlar.",
    noPosts: "Henüz yazı yok.",
    allPosts: "tüm yazılar",
    switchLabel: "English",
    switchTitle: "This page in English",
  },
} satisfies Record<Lang, Record<string, string>>;

const prefix = (lang: Lang) => (lang === "en" ? "" : `/${lang}`);

export const homePath = (lang: Lang) => `${prefix(lang)}/`;

/** URL shape the old build produced — the .html extension is preserved. */
export const postPath = (id: string, lang: Lang = "en") =>
  `${prefix(lang)}/posts/${id}.html`;

export const rssPath = (lang: Lang) => `${prefix(lang)}/rss.xml`;

export const other = (lang: Lang): Lang => (lang === "en" ? "tr" : "en");
