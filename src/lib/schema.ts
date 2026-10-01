/**
 * JSON-LD 结构化数据（SEO + GEO）
 *
 * - WebSite / Organization：全站身份，首页输出
 * - ComicSeries（连载）/ Book（单本）：书目页输出；连载挂 hasPart: ComicIssue
 * - BreadcrumbList：书目页与阅读页输出
 *
 * URL 一律绝对化到 https://comic.getaiti.com（Astro.site 已配置）。
 */
import { SITE } from '../site.config';
import { bookDesc, bookTitle, type BookView, type ChapterView } from './books';
import type { Lang } from './i18n';

const ORIGIN = `https://${SITE.domain}`;
const abs = (p: string) => new URL(p, ORIGIN).href;
const langBase = (lang: Lang) => (lang === 'en' ? '/en' : '');
const htmlLang = (lang: Lang) => (lang === 'en' ? 'en-US' : 'zh-CN');

const siteName = (lang: Lang) => (lang === 'en' ? 'The Comic Library' : SITE.name);
const siteDesc = (lang: Lang) =>
  lang === 'en'
    ? 'A library for AI-made comics and picture books: shelves, contents and a page-flip reader.'
    : '为 AI 创作的漫画与绘本而建的作品图书馆：书架、目录与翻页阅读器。';

export function orgSchema(lang: Lang) {
  return {
    '@type': 'Organization',
    '@id': `${ORIGIN}/#org`,
    name: siteName(lang),
    alternateName: siteName(lang === 'en' ? 'zh' : 'en'),
    url: abs('/'),
    logo: abs('/mark.svg'),
    description: siteDesc(lang),
    sameAs: ['https://www.getaiti.com'],
  };
}

export function webSiteSchema(lang: Lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${ORIGIN}/#website`,
    name: siteName(lang),
    alternateName: siteName(lang === 'en' ? 'zh' : 'en'),
    url: abs(langBase(lang) + '/'),
    description: siteDesc(lang),
    inLanguage: htmlLang(lang),
    publisher: { '@id': `${ORIGIN}/#org` },
  };
}

/** 连载 → ComicSeries（hasPart: ComicIssue）；短篇/绘本 → Book */
export function bookSchema(book: BookView, lang: Lang) {
  const base = langBase(lang);
  const cover = book.coverUrl ? abs(book.coverUrl.replace(/\.webp$/, '.jpg')) : undefined;
  const common = {
    name: bookTitle(book, lang),
    description: bookDesc(book, lang),
    inLanguage: htmlLang(lang),
    url: abs(`${base}/book/${book.slug}/`),
    ...(cover ? { image: cover } : {}),
    ...(book.tags.length ? { genre: book.tags } : {}),
    isAccessibleForFree: true,
    author: { '@id': `${ORIGIN}/#org` },
    publisher: { '@id': `${ORIGIN}/#org` },
  };

  if (book.type === 'series') {
    return {
      '@context': 'https://schema.org',
      '@type': 'ComicSeries',
      ...common,
      hasPart: book.chapters.map((ch) => issueSchema(book, ch, lang)),
    };
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'Book',
    ...common,
    bookFormat: 'GraphicNovel',
    numberOfPages: book.chapters.reduce((n, c) => n + c.pages.length, 0),
    datePublished: book.chapters[0].date.toISOString(),
    dateModified: book.lastUpdated.toISOString(),
  };
}

/** 连载的一话（阅读页的 mainEntity，也挂在 ComicSeries.hasPart 里） */
export function issueSchema(book: BookView, chapter: ChapterView, lang: Lang) {
  const base = langBase(lang);
  return {
    '@type': 'ComicIssue',
    issueNumber: chapter.number,
    name: chapter.title,
    url: abs(`${base}/read/${book.slug}/${chapter.slug}/`),
    datePublished: chapter.date.toISOString(),
    isPartOf: abs(`${base}/book/${book.slug}/`),
    isAccessibleForFree: true,
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[], lang: Lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: abs(langBase(lang) + it.path),
    })),
  };
}
