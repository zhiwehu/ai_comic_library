/** 站点级配置：部署后由作者补全 giscus（需要 public GitHub 仓库，见 kickoff §9）。 */
export const SITE = {
  name: '漫画图书馆',
  latinName: 'The Comic Library',
  tagline: '本馆作品由 AI 辅助创作',
  domain: 'comic.getaiti.com',
} as const;

export const GISCUS = {
  repo: (import.meta.env.PUBLIC_GISCUS_REPO as string | undefined) ?? '',
  repoId: (import.meta.env.PUBLIC_GISCUS_REPO_ID as string | undefined) ?? '',
  category: (import.meta.env.PUBLIC_GISCUS_CATEGORY as string | undefined) ?? 'Announcements',
  categoryId: (import.meta.env.PUBLIC_GISCUS_CATEGORY_ID as string | undefined) ?? '',
} as const;

/**
 * 支持与变现渠道：**填了才在站上显示**（顶栏「支持」、读完页卡片、/support 页）。
 * - afdian        爱发电主页链接（月度赞助），如 https://afdian.com/a/xxxx
 * - wechatReward  微信赞赏码图片：把图片放进 public/ 后填路径，如 /support-wechat.png
 * - store         完整版商品链接（无水印 PDF / 合订本 / 壁纸包，爱发电商品页或 Gumroad）
 * - contact       商务合作（定制漫画）：mailto:you@example.com 或说明页链接
 */
export const SUPPORT = {
  afdian: '',
  wechatReward: '',
  store: '',
  contact: '',
} as const;
