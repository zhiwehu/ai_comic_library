#!/usr/bin/env node
/**
 * publish.mjs —— 上架脚本（kickoff §7）
 *
 *   pnpm publish --from <导出images目录> --book <slug> [--chapter <slug>]
 *               [--title "..."] [--number N] [--type series|short|picture-book]
 *               [--cover <图片路径>] [--dry]
 *               [--no-wm] [--wm <文字>] [--wm-opacity <0~1>] [--wm-cover]
 *
 * 行为：
 *   1. 读取 --from 目录，按文件名字典序；同名多格式只取 webp > jpg > png 其一
 *   2. sharp 转码 WebP q80；宽 > 1600px 才缩，高度等比
 *   3. 正文页默认烧录整页平铺水印（--wm 自定义文字，--no-wm 关闭；
 *      封面默认不打 --wm-cover 才打——封面用于 OG/宣传，保持干净）
 *   4. 写入 books/<book>/<chapter>/pages/001.webp...（§14 修订：books/ 扁平，短篇/绘本为单章书）
 *   5. chapter.yml 不存在则生成骨架（title 取 --title 或源目录 chapter.yaml/index.md 头部）
 *   6. book.yml 不存在则生成骨架并提示补 description/tags
 *   7. 打印汇总与建议 commit message
 * 红线：原始大图永不进本 repo，只进压缩后的发布版。
 * 注意：必须用 `pnpm run publish`（`pnpm publish` 是 pnpm 内置的 npm 发布命令）。
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { DEFAULT_WM_OPACITY, DEFAULT_WM_TEXT, watermarkSvg } from './lib/wm.mjs';

const ROOT = path.resolve(process.cwd(), 'books');
const MAX_WIDTH = 1600;
const ORDER = { '.webp': 0, '.jpg': 1, '.jpeg': 2, '.png': 3 };

const die = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };
const quote = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) args[key] = true;
      else { args[key] = next; i++; }
    } else args._.push(a);
  }
  return args;
}

/** 解析源目录（或其父目录）里 chapter.yaml / index.md 头部 frontmatter */
function parseSourceMeta(fromDir) {
  const candidates = [
    path.join(fromDir, 'chapter.yaml'),
    path.join(fromDir, 'index.md'),
    path.join(fromDir, '..', 'chapter.yaml'),
    path.join(fromDir, '..', 'index.md'),
  ];
  const file = candidates.find((f) => fs.existsSync(f));
  if (!file) return {};
  const text = fs.readFileSync(file, 'utf-8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const meta = {};
  let inTags = false;
  for (const line of m[1].split(/\r?\n/)) {
    if (/^tags:\s*$/.test(line)) { inTags = true; meta.tags = []; continue; }
    if (inTags) {
      const t = line.match(/^\s*-\s*(.+)$/);
      if (t) { meta.tags.push(t[1].trim()); continue; }
      inTags = false;
    }
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (kv && kv[2] !== '') meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return meta;
}

const SKIP_STEM_RE = /(^|[-_])(cover|charsheet|character[-_ ]?sheet)$/i;

function pickImages(fromDir) {
  const byStem = new Map();
  let coverFile = null;
  let coverRank = 99;
  for (const f of fs.readdirSync(fromDir)) {
    const ext = path.extname(f).toLowerCase();
    if (!(ext in ORDER)) continue;
    const stem = path.basename(f, ext);
    if (SKIP_STEM_RE.test(stem)) {
      if (/(^|[-_])cover$/i.test(stem) && ORDER[ext] < coverRank) {
        coverFile = path.join(fromDir, f);
        coverRank = ORDER[ext];
      }
      continue;
    }
    const cur = byStem.get(stem);
    if (!cur || ORDER[ext] < ORDER[cur.ext]) byStem.set(stem, { file: f, ext });
  }
  const images = [...byStem.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'zh-Hans-CN', { numeric: true }))
    .map(([, v]) => path.join(fromDir, v.file));
  return { images, coverFile };
}

async function transcodeTo(input, outPath, { dry, jpgFallback = false, wm = null }) {
  const img = sharp(input);
  const meta = await img.metadata();
  const needsResize = (meta.width ?? 0) > MAX_WIDTH;
  let pipe = needsResize ? sharp(input).resize({ width: MAX_WIDTH }) : img;
  if (dry) return { width: meta.width, height: meta.height };
  if (wm) {
    // 水印按**输出尺寸**铺满整页（缩放后的真实宽高），保证平铺密度观感一致
    const outW = needsResize ? MAX_WIDTH : (meta.width ?? 0);
    const outH = needsResize
      ? Math.round((meta.height ?? 0) * (MAX_WIDTH / (meta.width ?? 1)))
      : (meta.height ?? 0);
    pipe = pipe.composite([{ input: watermarkSvg(outW, outH, wm), blend: 'over' }]);
  }
  await pipe.webp({ quality: 80 }).toFile(outPath);
  if (jpgFallback) {
    // Safari ≤13 / 老 WebView / 部分 OG 平台不支持 WebP，产出同名 JPEG 副本（水印一致）
    let jpg = needsResize ? sharp(input).resize({ width: MAX_WIDTH }) : sharp(input);
    if (wm) {
      const outW = needsResize ? MAX_WIDTH : (meta.width ?? 0);
      const outH = needsResize
        ? Math.round((meta.height ?? 0) * (MAX_WIDTH / (meta.width ?? 1)))
        : (meta.height ?? 0);
      jpg = jpg.composite([{ input: watermarkSvg(outW, outH, wm), blend: 'over' }]);
    }
    await jpg.jpeg({ quality: 82 }).toFile(outPath.replace(/\.webp$/, '.jpg'));
  }
  const out = await sharp(outPath).metadata();
  return { width: out.width, height: out.height };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dry = !!args.dry;
  const from = args.from ? path.resolve(String(args.from)) : die('缺少 --from <目录>');
  const bookSlug = args.book ? String(args.book) : die('缺少 --book <slug>');
  if (!fs.statSync(from, { throwIfNoEntry: false })?.isDirectory()) die(`--from 不存在或不是目录: ${from}`);
  if (!/^[a-z0-9][a-z0-9/_-]*$/i.test(bookSlug)) die(`--book 只允许字母数字 - _ / : ${bookSlug}`);

  const chapterSlug = args.chapter
    ? String(args.chapter).replace(/[^a-zA-Z0-9_-]/g, '-')
    : '01';
  // ---- 水印（默认开启：防下载/防剽窃，见 README「版权防护」）----
  const wmOpacity = Math.min(1, Math.max(0, Number(args['wm-opacity']) || DEFAULT_WM_OPACITY));
  const wm = args['no-wm']
    ? null
    : {
        text: typeof args.wm === 'string' ? args.wm : DEFAULT_WM_TEXT,
        opacity: wmOpacity,
      };
  const meta = parseSourceMeta(from);
  const title = args.title ? String(args.title) : (meta.title ?? chapterSlug);
  const number = args.number ? Number(args.number) : (meta.chapter ? Number(meta.chapter) : 1);
  const date = new Date().toISOString().slice(0, 10);

  const { images, coverFile } = pickImages(from);
  if (images.length === 0) die(`--from 目录里没有图片: ${from}`);
  const coverInput = args.cover ? path.resolve(String(args.cover)) : coverFile;

  const bookDir = path.join(ROOT, bookSlug);
  const chapterDir = path.join(bookDir, chapterSlug);
  const pagesDir = path.join(chapterDir, 'pages');
  console.log(`上架 ${bookSlug}/${chapterSlug} ·《${title}》 · ${images.length} 页${dry ? '（dry 预览）' : ''}`);
  console.log(wm ? `• 水印：平铺「${wm.text}」· 透明度 ${wm.opacity}${dry ? '' : '（正文页）'}` : '• 水印：已关闭（--no-wm）');

  // ---- 转码页面 ----
  if (!dry) fs.mkdirSync(pagesDir, { recursive: true });
  let totalBytes = 0;
  const written = [];
  for (let i = 0; i < images.length; i++) {
    const outPath = path.join(pagesDir, `${String(i + 1).padStart(3, '0')}.webp`);
    await transcodeTo(images[i], outPath, { dry, jpgFallback: true, wm });
    if (!dry) totalBytes += fs.statSync(outPath).size;
    written.push(outPath);
  }

  // ---- chapter.yml ----
  const chapterYml = path.join(chapterDir, 'chapter.yml');
  const firstPageMeta = dry ? null : await sharp(written[0]).metadata();
  if (!fs.existsSync(chapterYml)) {
    const body = [
      `title: ${quote(title)}`,
      `number: ${Number.isFinite(number) ? number : 1}`,
      `date: ${date}`,
      ...(firstPageMeta?.width ? [`width: ${firstPageMeta.width}`, `height: ${firstPageMeta.height}`] : []),
      '',
    ].join('\n');
    if (dry) console.log(`[dry] 将生成 ${chapterYml}\n${body}`);
    else { fs.mkdirSync(chapterDir, { recursive: true }); fs.writeFileSync(chapterYml, body); }
  } else if (firstPageMeta?.width) {
    // 已有 yml：回填真实页宽高（阅读器按真实比例渲染，避免裁切）
    const text = fs.readFileSync(chapterYml, 'utf-8');
    let updated = text;
    for (const [k, v] of [['width', firstPageMeta.width], ['height', firstPageMeta.height]]) {
      updated = /^width:/m.test(updated) && k === 'width'
        ? updated.replace(/^width:.*$/m, `width: ${v}`)
        : /^height:/m.test(updated) && k === 'height'
          ? updated.replace(/^height:.*$/m, `height: ${v}`)
          : k === 'width' && !/^width:/m.test(updated)
            ? updated.replace(/\n*$/, '\n') + `width: ${v}\n`
            : k === 'height' && !/^height:/m.test(updated)
              ? updated.replace(/\n*$/, '\n') + `height: ${v}\n`
              : updated;
    }
    if (!dry) fs.writeFileSync(chapterYml, updated);
  } else {
    console.log(`• chapter.yml 已存在，保持不动：${path.relative(process.cwd(), chapterYml)}`);
  }

  // ---- book.yml ----
  const bookYml = path.join(bookDir, 'book.yml');
  if (!fs.existsSync(bookYml)) {
    const type = ['series', 'short', 'picture-book'].includes(String(args.type)) ? args.type
      : number > 1 || args.chapter ? 'series' : 'short';
    const bookTitle = args['book-title'] ? String(args['book-title']) : (meta.series ?? title);
    const body = [
      `title: ${quote(bookTitle)}`,
      `type: ${type}`,
      'status: ongoing',
      'language: zh',
      `description: ${quote(meta.description ?? '')}`,
      ...(coverInput ? ['cover: cover.webp'] : []),
      `tags: [${(meta.tags ?? []).map(quote).join(', ')}]`,
      '',
    ].join('\n');
    if (dry) console.log(`[dry] 将生成 ${bookYml}\n${body}`);
    else fs.writeFileSync(bookYml, body);
    console.log('⚠ 记得补 book.yml 的 description / tags（先把书架子做对，再谈别的）');
  } else if (coverInput) {
    const text = fs.readFileSync(bookYml, 'utf-8');
    const updated = /^cover:/m.test(text)
      ? text.replace(/^cover:.*$/m, 'cover: cover.webp')
      : text.replace(/\n*$/, '\n') + 'cover: cover.webp\n';
    if (!dry) fs.writeFileSync(bookYml, updated);
  }

  // ---- 封面 ----
  if (coverInput) {
    const coverOut = path.join(bookDir, 'cover.webp');
    // 封面默认不打水印（OG/宣传图保持干净）；--wm-cover 才打
    await transcodeTo(coverInput, coverOut, { dry, jpgFallback: true, wm: args['wm-cover'] ? wm : null });
    console.log(`• 封面 → ${path.relative(process.cwd(), coverOut)}${!args.cover && coverFile ? '（自动识别 *-cover）' : ''}${args['wm-cover'] && wm ? '（含水印）' : ''}`);
  }

  // ---- 汇总 ----
  const mb = (totalBytes / 1024 / 1024).toFixed(2);
  const avgKb = totalBytes ? Math.round(totalBytes / written.length / 1024) : 0;
  console.log(`\n✓ 完成：${written.length} 页 · 共 ${dry ? '~' : ''}${mb} MB · 平均 ${avgKb} KB/页`);
  if (!dry && fs.existsSync(written[0]) && fs.statSync(written[0]).size > 1.5 * 1024 * 1024)
    console.warn('⚠ 有单页超过 1.5MB，检查源图尺寸是否异常');
  console.log(`建议 commit message：\n  publish: ${bookSlug}/${chapterSlug} (${written.length} pages, ${mb} MB)`);
}

main().catch(die);
