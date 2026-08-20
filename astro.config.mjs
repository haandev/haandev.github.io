// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import site from "./site.json" with { type: "json" };

export default defineConfig({
  site: site.url,
  // Yazılar eskiden /posts/slug.html idi; 'file' formatı bu URL'leri
  // aynen koruyor. Değiştirirsek RSS guid'leri ve GoatCounter geçmişi kırılır.
  build: { format: "file" },
  integrations: [mdx()],
  markdown: {
    // Kapalı: yazılarda kesme işareti düz (') yazılıyor ve Türkçe ekler
    // (SDT'nin, 1948'de) kıvrık tırnağa çevrilince metin değişiyor.
    // Tipografik tırnaklar zaten elle yazılıyor.
    smartypants: false,
    shikiConfig: { theme: "github-dark", wrap: true },
  },
});
