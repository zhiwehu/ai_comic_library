import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getShelf } from '../lib/books';
import { SITE } from '../site.config';

export async function GET(context: APIContext) {
  const shelf = await getShelf();
  const items = shelf
    .flatMap((b) =>
      b.chapters.map((ch) => ({
        title: `${b.title} · ${ch.title}`,
        link: `/read/${b.slug}/${ch.slug}/`,
        pubDate: ch.date,
        description: b.description || b.title,
        categories: [b.title, ...b.tags],
      }))
    )
    .sort((a, b) => +b.pubDate - +a.pubDate);

  return rss({
    title: SITE.name,
    description: SITE.tagline,
    site: context.site ?? 'https://comics.getaiti.com',
    items,
    customData: '<language>zh-CN</language>',
  });
}
