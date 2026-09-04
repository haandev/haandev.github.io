import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({ base: "./src/content/posts", pattern: "**/index.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
    description: z.string().default(""),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    // For when the list and OG need a separate, shorter summary.
    ogDescription: z.string().optional(),
    // The standfirst under the title; rendered as raw HTML because it may
    // contain markup such as <span class="g">.
    dek: z.string().optional(),
    // Post-specific decoration injected into the header (e.g. the overprint
    // in the QR post).
    headerExtra: z.string().optional(),
    // Class added to <body>. The rule defining the post's own colour
    // variables hangs off it, so without it figure colours are undefined.
    bodyClass: z.string().optional(),
  }),
});

export const collections = { posts };
