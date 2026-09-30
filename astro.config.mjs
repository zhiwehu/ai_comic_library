import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BOOKS_DIR = 'books';
const MIME = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.yml': 'text/yaml; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
};

/**
 * books/ 是唯一内容目录，但它在 src/ 之外、public/ 之外。
 * - dev：Vite 中间件直接从 books/ 磁盘读文件
 * - build：astro:build:done 时整目录拷入 dist/books
 */
function booksSync() {
  console.log('[books-sync] integration registered');
  return {
    name: 'books-sync',
    hooks: {
      'astro:build:done'({ dir, logger }) {
        const dest = path.resolve(fileURLToPath(dir), BOOKS_DIR);
        fs.cpSync(path.resolve(BOOKS_DIR), dest, { recursive: true });
        logger.info(`copied ${BOOKS_DIR}/ -> dist/${BOOKS_DIR}/`);
      },
    },
  };
}

export default defineConfig({
  site: 'https://comics.getaiti.com',
  integrations: [sitemap(), booksSync()],
});
