# haandev.github.io

A blog built with Astro + MDX, whose homepage and feeds are generated automatically.

## A new post

```bash
npm run new -- "Title Of The Post"
```

This creates `src/content/posts/<slug>/index.mdx`, starting with `draft: true`.
Every post gets its own folder:

```
src/content/posts/<slug>/
  index.mdx           the prose
  style.css           post-specific style (if any)
  ThreeBasicNeeds.mdx figure component
  TableFiveQuestions.mdx table component
```

Figures and tables live in separate `.mdx` files, imported from `index.mdx` and
called as `<ThreeBasicNeeds />`. Because the components are MDX too, markdown
inside a figcaption (`**bold**`, links) keeps working — as `.astro` files they
would come out as plain text. The collection counts only `index.mdx` files as
posts; the components beside them don't appear in the list.

The rule: **write plain markdown.** Headings `##`, emphasis `**`, links
`[text](url)`, lists `-`, quotes `>`. HTML is used only where markdown has no
equivalent — sections carrying a `class`, `<figure>` + SVG figures, formatted
tables. Post-specific CSS is not a `<style>` block but the `style.css` file
beside the post; it is `import`ed from the top of the MDX.

The one place inline HTML remains is formatting markdown has no equivalent for:
things like a `<b style="color:…">` carrying an inline colour. CSS rules that
target the tag directly (`figcaption b`, `.cap .legend i`) are written to cover
the `<strong>`/`<em>` markdown produces as well — do the same when adding a new
rule of that kind.

Frontmatter fields are validated against the schema in `src/content.config.ts` —
a bad field stops the build:

| Field | Required | Note |
| --- | --- | --- |
| `title` | yes | The page title and the `<h1>`. |
| `date` | yes | `YYYY-MM-DD`. |
| `description` | no | Shown in the homepage list and in the RSS feed. |
| `ogDescription` | no | A separate, shorter summary for the OG tag. |
| `dek` | no | The standfirst under the title. Rendered as raw HTML. |
| `headerExtra` | no | Post-specific decoration in the header. Raw HTML. |
| `tags` | no | A YAML list. |
| `draft` | no | If `true`, only visible under `npm run dev`. |

## Development

```bash
npm run dev
```

`http://localhost:4321` — with hot reload. To try the production output,
`npm run build && npm run preview`.

## Publishing

A push to `main` is enough. GitHub Actions runs `npm run build` and deploys the
`dist/` folder to Pages.

## Style

There are three layers; try them in order:

1. **`public/assets/style.css`** — the design language itself. Typography,
   colour variables, and the components shared by more than one post: `.abst`
   (abstract box), `.note` (caveat box), `.tbl` (scrolling table wrapper),
   `.refs` (references), `.fig-narrow`, `.wide.flush`, `.fig-frame.tight`,
   `.g`/`.a` (thematic strand colours).
2. **`src/content/posts/<slug>/style.css`** — only what is particular to that
   post: the `bodyClass` block defining its colour variables, which section
   takes which colour, and components specific to that post.
3. **Inline `style`** — for *data* only. The proportion of a bar in a chart
   (`style="flex:13"`) is data; colour, size and spacing are not. If you are
   writing an appearance decision inline, it belongs in layer 1 or 2.

If a rule in post-specific CSS comes up a second time, move it to `style.css`.
When picking a class name, watch out for collisions with the shared ones —
`.abst` means the abstract box, which is why the "autonomy" list in the
motivation post became `.list.n-aut`.

`figure svg text { font-family }` is deliberately not shared: CSS always
overrides an SVG's `font-family` attribute, so a global rule would break figures
that carry their own typography. A post that needs it puts it in its own file.

## Watch out for in MDX

MDX parses the body as JSX and is less forgiving than a browser:

- Tags must be balanced, and void elements self-closed (`<br />`).
- The opening tag of an element spanning several lines must stand on its own
  line — a block that starts `<blockquote><p>…` and closes on the next line
  errors out.
- Put whitespace-significant `<pre>` content in a template literal:
  ``<pre><code>{`…`}</code></pre>``
- `~` and `{` in prose must be escaped (`\~`, `\{`) — otherwise they are taken
  for strikethrough / a JSX expression.

Typography settings live in `astro.config.mjs`: smartypants is off, so
apostrophes stay as written.

## Generated files

Everything under `dist/` — `index.html`, `posts/*.html`, `index.json`,
`rss.xml`, `sitemap.xml`. It isn't committed; Actions regenerates it on every
push. `build.format: "file"` is used so that post URLs keep their `.html`
extension; changing it would break old links and RSS guids. The posts were
originally published under Turkish slugs, and `redirects` in `astro.config.mjs`
keeps those old URLs pointing at the current English ones.
