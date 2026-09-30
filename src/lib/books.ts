import fs from 'node:fs';
import path from 'node:path';
import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from './i18n';

export type BookEntry = CollectionEntry<'books'>;
export type ChapterEntry = CollectionEntry<'chapters'>;

export interface ChapterView {
  slug: string;
  bookSlug: string;
  title: string;
  number: number;
  date: Date;
  pages: string[];
  /** 页面宽高比（w/h），缺省 8:9；来自 chapter.yml 的 width/height */
  ratio: number;
}

export interface BookView {
  slug: string;
  title: string;
  titleEn: string | null;
  type: 'series' | 'short' | 'picture-book';
  status: 'ongoing' | 'completed';
  language: string;
  description: string;
  descriptionEn: string | null;
  tags: string[];
  coverUrl: string | null;
  chapters: ChapterView[];
  latest: ChapterView;
  lastUpdated: Date;
  isSingle: boolean;
}

const PAGE_RE = /\.(webp|png|jpe?g)$/i;

/** 列出某章页面 URL（build 时读盘；URL 由 books-sync 伺服） */
export function listPageUrls(bookSlug: string, chapterSlug: string): string[] {
  const dir = path.join(process.cwd(), 'books', bookSlug, chapterSlug, 'pages');
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => PAGE_RE.test(f))
      .sort()
      .map((f) => `/books/${bookSlug}/${chapterSlug}/pages/${f}`);
  } catch {
    return [];
  }
}

/** glob loader 的 id 是「相对 base 的路径去扩展名」：书 `ai-infra/book`、章 `ai-infra/ch1-xxx/chapter` */
const bookSlugOf = (id: string) => id.split('/').slice(0, -1).join('/');

function toChapterView(entry: ChapterEntry): ChapterView {
  const parts = entry.id.split('/');
  const bookSlug = parts[0];
  const slug = parts.slice(1, -1).join('/');
  const w = entry.data.width ?? 800;
  const h = entry.data.height ?? 900;
  return {
    slug,
    bookSlug,
    title: entry.data.title,
    number: entry.data.number,
    date: entry.data.date,
    pages: listPageUrls(bookSlug, slug),
    ratio: h > 0 ? w / h : 8 / 9,
  };
}

/** 全部书架：含章节、封面回退、按最近更新倒序（§14 修订：混排一面书架） */
export async function getShelf(): Promise<BookView[]> {
  const [bookEntries, chapterEntries] = await Promise.all([
    getCollection('books'),
    getCollection('chapters'),
  ]);

  const byBook = new Map<string, ChapterEntry[]>();
  for (const ch of chapterEntries) {
    const bookSlug = ch.id.split('/')[0];
    const list = byBook.get(bookSlug) ?? [];
    list.push(ch);
    byBook.set(bookSlug, list);
  }

  const shelf: BookView[] = [];
  for (const book of bookEntries) {
    const slug = bookSlugOf(book.id);
    const chapters = (byBook.get(slug) ?? [])
      .map(toChapterView)
      .filter((c) => c.pages.length > 0)
      .sort((a, b) => a.number - b.number);
    if (chapters.length === 0) continue;

    const coverUrl = book.data.cover
      ? `/books/${slug}/${book.data.cover}`
      : (chapters.find((c) => c.pages.length > 0)?.pages[0] ?? null);

    shelf.push({
      slug,
      title: book.data.title,
      titleEn: book.data.title_en ?? null,
      type: book.data.type,
      status: book.data.status,
      language: book.data.language,
      description: book.data.description,
      descriptionEn: book.data.description_en ?? null,
      tags: book.data.tags,
      coverUrl,
      chapters,
      latest: chapters[chapters.length - 1],
      lastUpdated: chapters.reduce((acc, c) => (c.date > acc ? c.date : acc), chapters[0].date),
      isSingle: chapters.length === 1,
    });
  }

  return shelf.sort((a, b) => +b.lastUpdated - +a.lastUpdated);
}

export function chapterNav(book: BookView, chapterSlug: string) {
  const idx = book.chapters.findIndex((c) => c.slug === chapterSlug);
  return {
    chapter: book.chapters[idx],
    prev: idx > 0 ? book.chapters[idx - 1] : null,
    next: idx < book.chapters.length - 1 ? book.chapters[idx + 1] : null,
    index: idx,
  };
}

export const TYPE_LABEL: Record<BookView['type'], string> = {
  series: '连载系列',
  short: '短篇漫画',
  'picture-book': '绘本',
};

/** 书名/简介：en 优先用 _en 字段，缺省回落中文 */
export function bookTitle(book: BookView, lang: Lang): string {
  return lang === 'en' && book.titleEn ? book.titleEn : book.title;
}
export function bookDesc(book: BookView, lang: Lang): string {
  return lang === 'en' && book.descriptionEn ? book.descriptionEn : book.description;
}
