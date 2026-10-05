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
    title_en: z.string().optional(),
    type: z.enum(['series', 'short', 'picture-book']).default('short'),
    status: z.enum(['ongoing', 'completed']).default('ongoing'),
    language: z.string().default('zh'),
    description: z.string().default(''),
    description_en: z.string().optional(),
    cover: z.string().optional(),
    tags: z.array(z.string()).default([]),
    /** 该书完整版（无水印 PDF）商品页；不填则详情页不显示购买按钮 */
    store_url: z.string().optional(),
  }),
});

const chapters = defineCollection({
  loader: glob({ pattern: '*/*/chapter.yml', base: './books' }),
  schema: z.object({
    title: z.string(),
    number: z.number(),
    date: z.coerce.date(),
    width: z.number().optional(),
    height: z.number().optional(),
  }),
});

export const collections = { books, chapters };
