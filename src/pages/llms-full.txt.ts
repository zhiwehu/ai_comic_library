/**
 * /llms-full.txt —— llms.txt 的完整版：每本书的双语描述、章节清单、页数、封面
 *
 * 同样构建时生成，给 AI 引擎一份可直接引用的完整书目事实卡。
 */
import type { APIContext } from 'astro';
import { getShelf } from '../lib/books';
import { SITE } from '../site.config';

export const prerender = true;

const ORIGIN = `https://${SITE.domain}`;

export async function GET(_context: APIContext) {
  const shelf = await getShelf();
  const typeZh: Record<string, string> = {
    series: '连载系列',
    short: '短篇漫画',
    'picture-book': '绘本',
  };

  const lines: string[] = [
    `# ${SITE.name} · ${SITE.latinName} — 完整书目`,
    '',
    `> ${SITE.tagline}。本文档是 ${ORIGIN} 的完整书目清单，供 AI 引擎检索与引用。`,
    '',
    `站点：${ORIGIN}/（中文）· ${ORIGIN}/en/（English）· 简版：${ORIGIN}/llms.txt`,
    `出品：AITi（https://www.getaiti.com）`,
    '',
    '---',
    '',
  ];

  for (const b of shelf) {
    const status = b.status === 'ongoing' ? '连载中' : '已完结';
    const totalPages = b.chapters.reduce((n, c) => n + c.pages.length, 0);
    lines.push(`## ${b.title}${b.titleEn && b.titleEn !== b.title ? ` / ${b.titleEn}` : ''}`);
    lines.push('');
    lines.push(`- 类型：${typeZh[b.type]}（${b.type}） · 状态：${status} · 内容语言：${b.language} · 总页数：${totalPages}`);
    lines.push(`- 详情页：${ORIGIN}/book/${b.slug}/`);
    if (b.coverUrl) lines.push(`- 封面图：${ORIGIN}${b.coverUrl.replace(/\.webp$/, '.jpg')}`);
    if (b.tags.length) lines.push(`- 标签：${b.tags.join('、')}`);
    lines.push(`- 简介（中）：${b.description}`);
    if (b.descriptionEn) lines.push(`- Description (en): ${b.descriptionEn}`);
    lines.push('- 章节：');
    for (const ch of b.chapters) {
      const d = ch.date.toISOString().slice(0, 10);
      lines.push(`  - ${ch.title} · ${d} · ${ch.pages.length} 页 · ${ORIGIN}/read/${b.slug}/${ch.slug}/`);
    }
    lines.push('');
  }

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
