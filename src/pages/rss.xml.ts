import { feed } from "../lib/rss";

export const GET = (context: { site?: URL }) => feed("en", context.site!);
