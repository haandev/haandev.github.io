#!/usr/bin/env node
// Yeni yazı iskeleti oluşturur:  npm run new -- "Yazının Başlığı"

import { writeFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";

const ROOT = import.meta.dirname;
const title = process.argv.slice(2).join(" ").trim();

if (!title) {
  console.error('Kullanım: node new-post.mjs "Yazının Başlığı"');
  process.exit(1);
}

const TR = { ı: "i", İ: "i", ğ: "g", Ğ: "g", ü: "u", Ü: "u", ş: "s", Ş: "s", ö: "o", Ö: "o", ç: "c", Ç: "c" };

const slug = title
  .replace(/[ıİğĞüÜşŞöÖçÇ]/g, (c) => TR[c])
  .toLowerCase()
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

const date = new Date().toISOString().slice(0, 10);
// Her yazı kendi klasörü: index.mdx metin, yanındaki .mdx dosyaları figür ve
// tablo bileşenleri, style.css yazıya özel stil.
const dir = join(ROOT, "src/content/posts", slug);
const rel = `src/content/posts/${slug}/index.mdx`;
const file = join(dir, "index.mdx");

if (await access(dir).then(() => true, () => false)) {
  console.error(`src/content/posts/${slug}/ zaten var.`);
  process.exit(1);
}

// Frontmatter alanları src/content.config.ts'teki şemayla doğrulanıyor.
// Gövde markdown. Figür ya da tablo gerekirse klasöre <Ad>.mdx olarak koy,
// buradan import edip <Ad /> diye çağır.
const template = `---
title: ${JSON.stringify(title)}
date: "${date}"
description: ""
dek: ""
tags: []
draft: true
---

Buraya yaz.
`;

await mkdir(dir, { recursive: true });
await writeFile(file, template);

console.log(`${rel} oluşturuldu.`);
console.log(`URL: /posts/${slug}.html  —  yayına almak için draft: true satırını sil.`);
