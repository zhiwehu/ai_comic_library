/**
 * wm.mjs —— 平铺斜纹水印（publish.mjs / watermark.mjs 共用）
 *
 * 设计：
 *  - 整页 45° 平铺重复站点文字，白字 + 暗影：深底、浅底页面都可见
 *  - 低透明度（默认 0.10）融入画面，不干扰阅读；裁掉任何局部都躲不开
 *  - 字号 / 平铺单元随图宽等比缩放，长条页与方页观感一致
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import sharp from 'sharp';

export const DEFAULT_WM_TEXT = 'comic.getaiti.com';
export const DEFAULT_WM_OPACITY = 0.1;
export const DEFAULT_WM_ANGLE = -24;
export const MANIFEST_PATH = 'books/.wm-manifest.json';

const escXml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * 生成与目标图同尺寸的整页平铺水印 SVG。
 * @param {number} width   目标图宽（px）
 * @param {number} height  目标图高（px）
 * @param {{text?: string, opacity?: number, angle?: number}} opts
 * @returns {Buffer}
 */
export function watermarkSvg(width, height, { text = DEFAULT_WM_TEXT, opacity = DEFAULT_WM_OPACITY, angle = DEFAULT_WM_ANGLE } = {}) {
  // 1600px 宽为基准：字号 22px、平铺单元 300×220；小图按比例缩，设下限防糊成一团
  const k = width / 1600;
  const font = Math.max(13, Math.round(22 * k));
  const tileW = Math.max(120, Math.round(300 * Math.min(k, 1.6)));
  const tileH = Math.max(88, Math.round(220 * Math.min(k, 1.6)));
  const cx = tileW / 2;
  const cy = tileH / 2;
  const t = escXml(text);
  const ls = (font * 0.14).toFixed(1); // letter-spacing，避免字挤成一坨
  const common =
    `text-anchor="middle" font-family="Helvetica, Arial, 'DejaVu Sans', sans-serif"` +
    ` font-size="${font}" letter-spacing="${ls}"`;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <pattern id="wm" width="${tileW}" height="${tileH}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})">
      <!-- 暗影：浅底页面上的可见度 -->
      <text x="${cx + Math.round(font * 0.08)}" y="${cy + Math.round(font * 0.38)}" ${common} fill="#000" fill-opacity="${(opacity * 0.75).toFixed(3)}">${t}</text>
      <!-- 白字：暗底页面上的可见度 -->
      <text x="${cx}" y="${cy + Math.round(font * 0.32)}" ${common} fill="#fff" fill-opacity="${opacity.toFixed(3)}">${t}</text>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#wm)"/>
</svg>`
  );
}

/**
 * 给一张图打水印并写出（不改动输入文件）。
 * @param {string} input   源图路径（已发布尺寸，不再缩放）
 * @param {string} outPath 输出路径（扩展名决定编码：.webp / .jpg）
 * @param {{text?: string, opacity?: number, angle?: number}} opts
 */
export async function stampFile(input, outPath, opts = {}) {
  const meta = await sharp(input).metadata();
  const overlay = watermarkSvg(meta.width ?? 0, meta.height ?? 0, opts);
  const pipe = sharp(input).composite([{ input: overlay, blend: 'over' }]);
  if (/\.jpe?g$/i.test(outPath)) await pipe.jpeg({ quality: 82, mozjpeg: true }).toFile(outPath);
  else await pipe.webp({ quality: 82 }).toFile(outPath);
  return { width: meta.width, height: meta.height };
}

/** sha256（清单里做“烧没烧过”判定用） */
export const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
