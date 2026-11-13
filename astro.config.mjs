// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import { copyFile } from "node:fs/promises";
import site from "./site.json" with { type: "json" };

// With build.format "file", src/pages/tr/index.astro is written to /tr.html,
// so /tr/ would 404 on GitHub Pages. Give it a tr/index.html as well.
const trHome = {
  name: "tr-home",
  hooks: {
    "astro:build:done": async ({ dir }) => {
      await copyFile(new URL("tr.html", dir), new URL("tr/index.html", dir));
    },
  },
};

export default defineConfig({
  site: site.url,
  // Posts used to live at /posts/slug.html; the 'file' format keeps those
  // URLs intact. Changing it would break RSS guids and GoatCounter history.
  build: { format: "file" },
  // The posts were originally published in Turkish under Turkish slugs.
  // Those URLs are still out there; they now lead to the Turkish versions,
  // which live under /tr with the English slug.
  redirects: {
    "/posts/ekibimi-nasil-motive-ediyorum":
      "/tr/posts/how-i-motivate-my-team.html",
    "/posts/qr-kod-ornegi-uzerinde-bilim-ve-teknolojinin-kumulatif-yonu-uzerine":
      "/tr/posts/on-the-cumulative-nature-of-science-and-technology-through-qr-codes.html",
    "/posts/spec-driven-development-in-cozmedigi-sey-organizasyon":
      "/tr/posts/what-spec-driven-development-does-not-solve-organization.html",
    "/posts/veri-dillerinin-anatomisi-bayt-isim-ve-spektrum":
      "/tr/posts/anatomy-of-data-languages-bytes-names-and-spectrum.html",
  },
  integrations: [mdx(), trHome],
  markdown: {
    // Off: posts use the straight apostrophe (') and converting it to a
    // curly quote would alter the text. Typographic quotes are written by hand.
    smartypants: false,
    shikiConfig: { theme: "github-dark", wrap: true },
  },
});
