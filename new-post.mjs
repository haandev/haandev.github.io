#!/usr/bin/env node
// Yeni yazı iskeleti oluşturur:  npm run new -- "Yazının Başlığı"

import { writeFile, access } from "node:fs/promises";
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
const rel = `src/content/posts/${slug}.mdx`;
const file = join(ROOT, rel);

if (await access(file).then(() => true, () => false)) {
  console.error(`${rel} zaten var.`);
  process.exit(1);
}

// Frontmatter alanları src/content.config.ts'teki şemayla doğrulanıyor.
// Gövde markdown; figür/tablo gerekirse araya doğrudan HTML yazılabilir.
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

await writeFile(file, template);

console.log(`${rel} oluşturuldu.`);
console.log(`URL: /posts/${slug}.html  —  yayına almak için draft: true satırını sil.`);
