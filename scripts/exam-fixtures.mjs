#!/usr/bin/env node
/**
 * exam-fixtures.mjs —— 书架压力考试的测试数据生成/清理
 *
 *   node scripts/exam-fixtures.mjs --make 200   生成 books/_test-001…N 本测试书
 *   node scripts/exam-fixtures.mjs --clean      删除全部 _test 开头的书
 *
 * 测试书特征：标题 "测试书 NNN Test Book NNN"（可被中英搜索命中），
 * 类型按 series/short/picture-book 轮转，单章一页占位图（锐利小体积）。
 * gitignore 已忽略 books/_test-*，不会进仓库。
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(process.cwd(), 'books');
const TYPES = ['series', 'short', 'picture-book'];
const COLORS = ['#3d5a80', '#98c1d9', '#e07a5f', '#81b29a', '#f2cc8f', '#c3272b'];

const arg = process.argv[2] ?? '';
const nArg = parseInt(process.argv[3] ?? '', 10);

function rmdir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

if (arg === '--clean') {
  for (const d of fs.readdirSync(ROOT)) {
    if (d.startsWith('_test-')) rmdir(path.join(ROOT, d));
  }
  console.log('✓ 测试书已清理');
  process.exit(0);
}

const count = Number.isFinite(nArg) && nArg > 0 ? nArg : 200;

// 占位封面：色块 + 编号
async function makeCover(outPath, n, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800">
    <rect width="600" height="800" fill="${color}"/>
    <rect x="24" y="24" width="552" height="752" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="3" rx="12"/>
    <text x="300" y="380" font-size="120" text-anchor="middle" fill="#ffffff" font-family="sans-serif">${n}</text>
    <text x="300" y="470" font-size="36" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-family="sans-serif">TEST BOOK</text>
  </svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 70 }).toFile(outPath);
}

for (let i = 1; i <= count; i++) {
  const nn = String(i).padStart(3, '0');
  const slug = `_test-${nn}`;
  const dir = path.join(ROOT, slug);
  const chapter = path.join(dir, '01');
  const pages = path.join(chapter, 'pages');
  fs.mkdirSync(pages, { recursive: true });

  const color = COLORS[i % COLORS.length];
  const type = TYPES[i % TYPES.length];
  const yml = [
    `title: "测试书 ${nn} Test Book ${nn}"`,
    `title_en: "Test Book ${nn}"`,
    `type: ${type}`,
    'status: completed',
    'language: zh',
    `description: "压力测试生成的虚拟书第 ${i} 本，用于验证搜索、过滤与分页。"`,
    'cover: cover.webp',
    `tags: ["测试"]`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'book.yml'), yml);

  fs.writeFileSync(
    path.join(chapter, 'chapter.yml'),
    `title: "全本"\nnumber: 1\ndate: 2026-09-30\nwidth: 600\nheight: 800\n\n`
  );

  await makeCover(path.join(dir, 'cover.webp'), i, color);
  await sharp(path.join(dir, 'cover.webp')).toFile(path.join(pages, '001.webp'));
  // 封面副本供 fallback
  await sharp(path.join(dir, 'cover.webp')).jpeg({ quality: 82 }).toFile(path.join(dir, 'cover.jpg'));
  await sharp(path.join(dir, 'cover.webp')).jpeg({ quality: 82 }).toFile(path.join(pages, '001.jpg'));
}

console.log(`✓ 已生成 ${count} 本测试书（books/_test-001 …）`);
