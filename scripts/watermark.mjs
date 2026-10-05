#!/usr/bin/env node
/**
 * watermark.mjs —— 存量书页回填水印（publish.mjs 只管新上架，这里管已上架的）
 *
 *   pnpm run watermark [--text <文字>] [--opacity <0~1>] [--cover] [--dry] [--force]
 *
 * 行为：
 *   1. 遍历 books/<book>/<chapter>/pages/*.{webp,jpg}（含 characters 这类“章节”目录）
 *   2. 逐张烧录整页平铺斜纹水印（scripts/lib/wm.mjs），原地覆盖
 *   3. books/.wm-manifest.json 记录每张图烧录前后的 sha256：
 *      · 当前哈希 = 清单里的 out  → 已烧过，跳过（重复执行安全）
 *      · 当前哈希 = 清单里的 in   → 干净版被重新上架 → 重烧
 *      · 都不匹配                → 新图/被替换过 → 烧
 *   4. 封面默认不动（OG/宣传图保持干净），--cover 才烧
 *   5. --dry 预览；--force 无视清单全部重烧
 *
 * ⚠ 仓库里只有压缩发布版（无原始大图）：覆盖后想回干净版只能从导出源图重新上架。
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_WM_ANGLE,
  DEFAULT_WM_OPACITY,
  DEFAULT_WM_TEXT,
  MANIFEST_PATH,
  sha256,
  stampFile,
} from './lib/wm.mjs';

const ROOT = process.cwd();
const BOOKS = path.join(ROOT, 'books');

const die = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };

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

/** 收集 books/ 下全部页图（+可选封面），返回 [{ rel, abs }] */
function collect({ cover }) {
  const out = [];
  if (!fs.existsSync(BOOKS)) return out;
  for (const book of fs.readdirSync(BOOKS, { withFileTypes: true })) {
    if (!book.isDirectory() || book.name.startsWith('_')) continue; // _test-* 压力测试书跳过
    const bookDir = path.join(BOOKS, book.name);
    const pagesRoot = path.join(bookDir, 'pages'); // 短篇/绘本旧结构兜底
    for (const chapter of fs.readdirSync(bookDir, { withFileTypes: true })) {
      if (!chapter.isDirectory()) continue;
      const pagesDir = path.join(bookDir, chapter.name, 'pages');
      if (!fs.existsSync(pagesDir)) continue;
      for (const f of fs.readdirSync(pagesDir)) {
        if (/\.(webp|jpe?g)$/i.test(f)) {
          const abs = path.join(pagesDir, f);
          out.push({ rel: path.relative(ROOT, abs), abs });
        }
      }
    }
    if (pagesRoot && fs.existsSync(pagesRoot)) {
      for (const f of fs.readdirSync(pagesRoot)) {
        if (/\.(webp|jpe?g)$/i.test(f)) {
          const abs = path.join(pagesRoot, f);
          out.push({ rel: path.relative(ROOT, abs), abs });
        }
      }
    }
    if (cover) {
      for (const f of fs.readdirSync(bookDir)) {
        if (/^cover\.(webp|jpe?g)$/i.test(f)) {
          const abs = path.join(bookDir, f);
          out.push({ rel: path.relative(ROOT, abs), abs });
        }
      }
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dry = !!args.dry;
  const force = !!args.force;
  const opts = {
    text: typeof args.text === 'string' ? args.text : DEFAULT_WM_TEXT,
    opacity: Math.min(1, Math.max(0, Number(args.opacity) || DEFAULT_WM_OPACITY)),
    angle: Number.isFinite(Number(args.angle)) ? Number(args.angle) : DEFAULT_WM_ANGLE,
  };
  const manifestFile = path.join(ROOT, MANIFEST_PATH);
  const manifest = fs.existsSync(manifestFile)
    ? JSON.parse(fs.readFileSync(manifestFile, 'utf-8'))
    : { version: 1, ...opts, files: {} };
  manifest.version = 1;
  Object.assign(manifest, { text: opts.text, opacity: opts.opacity, angle: opts.angle });

  const targets = collect({ cover: !!args.cover });
  if (targets.length === 0) die(`books/ 下没有页图: ${BOOKS}`);
  console.log(
    `回填水印 ·「${opts.text}」· 透明度 ${opts.opacity} · ${targets.length} 张${args.cover ? '（含封面）' : '（不含封面）'}${dry ? '（dry 预览）' : ''}${force ? '（--force 重烧）' : ''}`
  );

  let stamped = 0, skipped = 0, bytes = 0;
  const t0 = Date.now();
  for (const { rel, abs } of targets) {
    const h = sha256(abs);
    const entry = manifest.files[rel];
    if (!force && entry && h === entry.out) { skipped++; continue; }
    const restamp = entry && h === entry.in;
    if (dry) {
      console.log(`[dry] ${restamp ? '重烧（干净版已还原）' : '烧录'} ${rel}`);
      stamped++;
      continue;
    }
    const tmp = `${abs}.wm-tmp`;
    await stampFile(abs, tmp, opts);
    fs.renameSync(tmp, abs); // 原地覆盖（同盘 rename 原子）
    const outSize = fs.statSync(abs).size;
    bytes += outSize;
    manifest.files[rel] = { in: h, out: sha256(abs) };
    stamped++;
    if (stamped % 50 === 0) console.log(`  … ${stamped} 张`);
  }

  if (!dry) {
    manifest.stampedAt = new Date().toISOString();
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  }
  const mb = (bytes / 1024 / 1024).toFixed(1);
  console.log(
    `\n✓ 完成：烧录 ${stamped} 张${dry ? '（dry）' : ` · ${mb} MB`}，跳过已烧 ${skipped} 张 · ${((Date.now() - t0) / 1000).toFixed(1)}s`
  );
  if (!dry) console.log(`清单：${MANIFEST_PATH}（重复执行安全；commit 时一并提交）`);
  console.log(`建议 commit message：\n  watermark: bake tiled watermark into ${stamped} published pages`);
}

main().catch(die);
