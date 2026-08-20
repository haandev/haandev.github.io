import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({ base: "./src/content/posts", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date YYYY-MM-DD olmalı"),
    description: z.string().default(""),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    // Liste ve OG için ayrı, daha kısa bir özet gerekirse.
    ogDescription: z.string().optional(),
    // Başlık altındaki spot yazısı; içinde <span class="g"> gibi markup
    // olabildiği için ham HTML olarak basılıyor.
    dek: z.string().optional(),
    // Header'a giren yazıya özel dekorasyon (ör. QR yazısındaki overprint).
    headerExtra: z.string().optional(),
    // <body>'ye eklenen sınıf. Yazıya özel renk değişkenlerini tanımlayan
    // kural buna bağlı olduğu için düşerse figür renkleri tanımsız kalır.
    bodyClass: z.string().optional(),
  }),
});

export const collections = { posts };
