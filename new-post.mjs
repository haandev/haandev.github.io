#!/usr/bin/env node
// Scaffolds a new post:  npm run new -- "Title Of The Post"

import { writeFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";

const ROOT = import.meta.dirname;
const title = process.argv.slice(2).join(" ").trim();

if (!title) {
  console.error('Usage: node new-post.mjs "Title Of The Post"');
  process.exit(1);
}

const slug = title
  .toLowerCase()
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

const date = new Date().toISOString().slice(0, 10);
// Every post gets its own folder: index.mdx is the prose, the .mdx files next
// to it are figure and table components, style.css is post-specific styling.
const dir = join(ROOT, "src/content/posts", slug);
const rel = `src/content/posts/${slug}/index.mdx`;
const file = join(dir, "index.mdx");

if (await access(dir).then(() => true, () => false)) {
  console.error(`src/content/posts/${slug}/ already exists.`);
  process.exit(1);
}

// Frontmatter fields are validated against the schema in src/content.config.ts.
// The body is markdown. If you need a figure or a table, drop it in the folder
// as <Name>.mdx, import it here and call it as <Name />.
const template = `---
title: ${JSON.stringify(title)}
date: "${date}"
description: ""
dek: ""
tags: []
draft: true
---

Write here.
`;

await mkdir(dir, { recursive: true });
await writeFile(file, template);

console.log(`Created ${rel}.`);
console.log(`URL: /posts/${slug}.html  —  delete the draft: true line to publish.`);
