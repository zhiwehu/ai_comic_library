import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * books/ 目录扁平化（kickoff §14 修订）：
 *   books/<slug>/book.yml              —— 每本书一份元数据
 *   books/<slug>/<chapter>/chapter.yml —— 每章一份（短篇/绘本即单章书）
 * 页面图片不进 content collection，由 books-sync 在 dev/构建时伺服。
 */
const books = defineCollection({
  loader: glob({ pattern: '*/book.yml', base: './books' }),
  schema: z.object({
    title: z.string(),
    type: z.enum(['series', 'short', 'picture-book']).default('short'),
    status: z.enum(['ongoing', 'completed']).default('ongoing'),
    language: z.string().default('zh'),
    description: z.string().default(''),
    cover: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

const chapters = defineCollection({
  loader: glob({ pattern: '*/*/chapter.yml', base: './books' }),
  schema: z.object({
    title: z.string(),
    number: z.number(),
    date: z.coerce.date(),
  }),
});

export const collections = { books, chapters };
