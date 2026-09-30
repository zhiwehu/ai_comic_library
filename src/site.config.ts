/** 站点级配置：部署后由作者补全 giscus（需要 public GitHub 仓库，见 kickoff §9）。 */
export const SITE = {
  name: '漫画图书馆',
  latinName: 'The Comic Library',
  tagline: '本馆作品由 AI 辅助创作，流程可复现',
  domain: 'comics.getaiti.com',
} as const;

export const GISCUS = {
  repo: (import.meta.env.PUBLIC_GISCUS_REPO as string | undefined) ?? '',
  repoId: (import.meta.env.PUBLIC_GISCUS_REPO_ID as string | undefined) ?? '',
  category: (import.meta.env.PUBLIC_GISCUS_CATEGORY as string | undefined) ?? 'Announcements',
  categoryId: (import.meta.env.PUBLIC_GISCUS_CATEGORY_ID as string | undefined) ?? '',
} as const;
