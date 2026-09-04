// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import site from "./site.json" with { type: "json" };

export default defineConfig({
  site: site.url,
  // Posts used to live at /posts/slug.html; the 'file' format keeps those
  // URLs intact. Changing it would break RSS guids and GoatCounter history.
  build: { format: "file" },
  // The posts were originally published under Turkish slugs. The site is now
  // in English, but those URLs are still out there — keep them redirecting.
  redirects: {
    "/posts/ekibimi-nasil-motive-ediyorum":
      "/posts/how-i-motivate-my-team.html",
    "/posts/qr-kod-ornegi-uzerinde-bilim-ve-teknolojinin-kumulatif-yonu-uzerine":
      "/posts/on-the-cumulative-nature-of-science-and-technology-through-qr-codes.html",
    "/posts/spec-driven-development-in-cozmedigi-sey-organizasyon":
      "/posts/what-spec-driven-development-does-not-solve-organization.html",
    "/posts/veri-dillerinin-anatomisi-bayt-isim-ve-spektrum":
      "/posts/anatomy-of-data-languages-bytes-names-and-spectrum.html",
  },
  integrations: [mdx()],
  markdown: {
    // Off: posts use the straight apostrophe (') and converting it to a
    // curly quote would alter the text. Typographic quotes are written by hand.
    smartypants: false,
    shikiConfig: { theme: "github-dark", wrap: true },
  },
});
