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
 * 中英双轨：中文站走国内通路，英文站走海外通路（海外读者看不到微信/爱发电）。
 *
 * zh（国内）
 * - wechatReward  微信赞赏码：图片放 public/ 后填路径，如 /support-wechat.png
 * - afdian        爱发电主页（月度追更，抽 6%，次月结）
 * - commissions   定制漫画接单表单（Tally 链接；空则回落 contact）
 * - store/contact 国内向商品页 / 商务联系
 *
 * en（海外）
 * - kofi          Ko-fi 主页（打赏 0% / 会员 5%，钱直达你的 PayPal，即时到账）
 * - commissions   定制漫画接单表单（Tally 链接；空则回落 Ko-fi 主页）
 * - store         Lemon Squeezy 或 Gumroad 商品页（无水印 PDF；LS 为 MoR，代缴全球税）
 * - contact       商务合作：mailto:you@example.com 或说明页链接
 */
export const SUPPORT = {
  zh: {
    wechatReward: '',
    afdian: '',
    commissions: '',
    store: '',
    contact: '',
  },
  en: {
    kofi: 'https://ko-fi.com/zhiwehu',
    commissions: '',
    store: 'https://ko-fi.com/zhiwehu/shop',
    contact: '',
  },
} as const;
