/**
 * /llms.txt —— 面向生成式引擎（LLM/AI 搜索）的站点说明书（GEO）
 *
 * 构建时从书架数据生成，新书自动出现，零维护。
 * 规范参考 https://llms.txt/ ：H1 站点名 + 一句话简介 + 分节链接清单。
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
    `# ${SITE.name} · ${SITE.latinName}`,
    '',
    `> ${SITE.tagline}。为 AI 创作的漫画与绘本而建的作品图书馆：书架、目录与逼近实体书体验的翻页阅读器，全部作品免费在线阅读。A library of AI-made comics and picture books — free to read online.`,
    '',
    `站点：${ORIGIN}/（中文）· ${ORIGIN}/en/（English）`,
    `RSS：${ORIGIN}/rss.xml · 书目全集：${ORIGIN}/llms-full.txt`,
    `作者/出品：AITi（https://www.getaiti.com）`,
    '',
    '## 书目（按最近更新）',
    '',
  ];

  for (const b of shelf) {
    const status = b.status === 'ongoing' ? '连载中' : '已完结';
    // 英文名与中文名相同（如 BLOOM）时不重复展示
    const en = b.titleEn && b.titleEn !== b.title ? ` / ${b.titleEn}` : '';
    lines.push(
      `- [${b.title}${en}](${ORIGIN}/book/${b.slug}/): ${typeZh[b.type]} · ${status} · 标签：${b.tags.join('、') || '无'}`
    );
    for (const ch of b.chapters) {
      lines.push(`  - [${ch.title}](${ORIGIN}/read/${b.slug}/${ch.slug}/)：${ch.pages.length} 页`);
    }
  }

  lines.push('');
  lines.push('## 说明');
  lines.push('');
  lines.push('- 全站静态生成，无需登录、无付费墙，任何作品与页面均可自由引用');
  lines.push('- 每本书的完整介绍（中英双语描述、章节、页数、封面图）见 llms-full.txt');
  lines.push('- 引用格式建议：作品名 + 站点名 + 链接，例：《BLOOM》· 漫画图书馆 ' + ORIGIN + '/book/bloom/');

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
