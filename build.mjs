#!/usr/bin/env node
// posts/*.html dosyalarını tarar; index.json, index.html, rss.xml, sitemap.xml üretir.
// Bağımlılığı yok — `node build.mjs` ile çalışır.

import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, basename } from "node:path";

const ROOT = import.meta.dirname;
const POSTS_DIR = join(ROOT, "posts");

const site = JSON.parse(await readFile(join(ROOT, "site.json"), "utf8"));
const baseUrl = site.url.replace(/\/$/, "");

// content'in tırnağını yakalayıp aynısıyla kapatıyoruz — yoksa Türkçedeki
// kesme işareti ("1994'te") tek tırnaklı sanılıp metni ortadan kesiyor.
const meta = (html, name) => {
  const re = new RegExp(
    `<meta\\s+name=["']${name}["']\\s+content=(["'])([\\s\\S]*?)\\1`,
    "i",
  );
  return html.match(re)?.[2]?.trim() ?? "";
};

const stripTags = (s) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

const decode = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

const escapeHtml = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const readPost = async (file) => {
  const html = await readFile(join(POSTS_DIR, file), "utf8");
  const slug = basename(file, ".html");

  if (meta(html, "draft") === "true") return null;

  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const rawTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? slug;
  const title = decode(
    stripTags(h1 ?? rawTitle.replace(new RegExp(`\\s*·\\s*${site.title}$`), "")),
  );

  const date = meta(html, "date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(
      `posts/${file}: geçerli bir <meta name="date" content="YYYY-MM-DD"> yok.`,
    );
  }

  const tags = meta(html, "tags")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return {
    title,
    slug,
    date,
    description: decode(meta(html, "description")),
    tags,
    path: `posts/${file}`,
    url: `${baseUrl}/posts/${file}`,
  };
};

const files = (await readdir(POSTS_DIR)).filter((f) => f.endsWith(".html"));
const posts = (await Promise.all(files.map(readPost)))
  .filter(Boolean)
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug < b.slug ? -1 : 1));

const dateFmt = new Intl.DateTimeFormat(site.lang, {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const humanDate = (d) => dateFmt.format(new Date(`${d}T00:00:00Z`));

/* ---------- index.html ---------- */

const listHtml = posts.length
  ? posts
      .map(
        (p) => `        <li class="post-item">
          <a class="post-link" href="${p.path}">
            <time datetime="${p.date}">${humanDate(p.date)}</time>
            <h2>${escapeHtml(p.title)}</h2>
            ${p.description ? `<p>${escapeHtml(p.description)}</p>` : ""}
            ${p.tags.length ? `<ul class="tags">${p.tags.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>` : ""}
          </a>
        </li>`,
      )
      .join("\n")
  : `        <li class="empty">Henüz yazı yok.</li>`;

const indexTemplate = await readFile(join(ROOT, "templates/index.html"), "utf8");
const indexHtml = indexTemplate
  .replaceAll("{{lang}}", site.lang)
  .replaceAll("{{site.title}}", escapeHtml(site.title))
  .replaceAll("{{site.description}}", escapeHtml(site.description))
  .replaceAll("{{site.url}}", baseUrl)
  .replace("<!--POST_LIST-->", listHtml);

await writeFile(join(ROOT, "index.html"), indexHtml);

/* ---------- index.json ---------- */

await writeFile(
  join(ROOT, "index.json"),
  JSON.stringify({ site: { ...site, url: baseUrl }, posts }, null, 2) + "\n",
);

/* ---------- rss.xml ---------- */

const rssDate = (d) => new Date(`${d}T00:00:00Z`).toUTCString();
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeHtml(site.title)}</title>
    <link>${baseUrl}/</link>
    <description>${escapeHtml(site.description)}</description>
    <language>${site.lang}</language>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
${posts
  .map(
    (p) => `    <item>
      <title>${escapeHtml(p.title)}</title>
      <link>${p.url}</link>
      <guid isPermaLink="true">${p.url}</guid>
      <pubDate>${rssDate(p.date)}</pubDate>
      <description>${escapeHtml(p.description)}</description>
    </item>`,
  )
  .join("\n")}
  </channel>
</rss>
`;
await writeFile(join(ROOT, "rss.xml"), rss);

/* ---------- sitemap.xml ---------- */

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc></url>
${posts.map((p) => `  <url><loc>${p.url}</loc><lastmod>${p.date}</lastmod></url>`).join("\n")}
</urlset>
`;
await writeFile(join(ROOT, "sitemap.xml"), sitemap);

/* ---------- robots.txt ---------- */

await writeFile(
  join(ROOT, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`,
);

console.log(`${posts.length} yazı işlendi → index.html, index.json, rss.xml, sitemap.xml, robots.txt`);
