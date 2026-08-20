import site from "../../site.json" with { type: "json" };
import { baseUrl, getPosts, postPath } from "../lib/posts";

export async function GET() {
  const posts = await getPosts();
  const body = {
    site: { ...site, url: baseUrl },
    posts: posts.map((p) => ({
      title: p.data.title,
      slug: p.id,
      date: p.data.date,
      description: p.data.description,
      tags: p.data.tags,
      path: `posts/${p.id}.html`,
      url: `${baseUrl}${postPath(p.id)}`,
    })),
  };
  return new Response(JSON.stringify(body, null, 2) + "\n", {
    headers: { "Content-Type": "application/json" },
  });
}
