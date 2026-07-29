#!/usr/bin/env node
// Yeni yazı iskeleti oluşturur:  node new-post.mjs "Yazının Başlığı"

import { readFile, writeFile, access } from "node:fs/promises";
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
const file = join(ROOT, "posts", `${slug}.html`);

if (await access(file).then(() => true, () => false)) {
  console.error(`posts/${slug}.html zaten var.`);
  process.exit(1);
}

const template = await readFile(join(ROOT, "templates/post.html"), "utf8");
await writeFile(
  file,
  template.replaceAll("{{title}}", title).replaceAll("{{date}}", date).replaceAll("{{slug}}", slug),
);

console.log(`posts/${slug}.html oluşturuldu.`);
