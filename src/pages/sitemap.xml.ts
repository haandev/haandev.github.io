import { baseUrl, getPosts, postPath } from "../lib/posts";

export async function GET() {
  const posts = await getPosts();
  const urls = [
    `  <url><loc>${baseUrl}/</loc></url>`,
    ...posts.map(
      (p) =>
        `  <url><loc>${baseUrl}${postPath(p.id)}</loc><lastmod>${p.data.date}</lastmod></url>`,
    ),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}
