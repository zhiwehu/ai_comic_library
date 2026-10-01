# 漫画图书馆（comic-library）

为 AI 创作的漫画与绘本而建的**作品图书馆**：书架、目录、逼近实体书体验的翻页阅读器。中英双语，深浅色主题可切换。
公众号连载的完整阅读入口与永久存档。规格见 [kickoff.md](./kickoff.md)（含 §14 修订记录）。

- 线上：`comic.getaiti.com`（Cloudflare Pages 主 + Vercel 备，见 kickoff §9）
- 技术栈：Astro 5（纯静态）· TypeScript · pnpm · page-flip · sharp · giscus / RSS / sitemap
- 无后端：全部页面构建时生成，进度/偏好存 localStorage

## 常用命令

```bash
pnpm dev            # 本地开发（books/ 图片由 books-sync 中间件伺服）
pnpm build          # 产出 dist/（books/ 自动拷入 dist/books）
pnpm preview        # 预览构建产物
pnpm run publish --from <导出images目录> --book <slug> [--chapter <slug>] [--title ...] [--number N] [--type series|short|picture-book]
```

> 注意是 `pnpm run publish`；`pnpm publish` 是 pnpm 内置的 npm 发包命令。

## 上架一本书

```bash
# 连载的一章
pnpm run publish --from /path/to/ch06_x/images --book ai-infra \
  --chapter ch06-xxx --number 6 --type series \
  --book-title "系列名（首次会写进 book.yml）"

# 短篇 / 绘本（整本 = 单章书，可不传 --chapter，默认 01）
pnpm run publish --from /path/to/book_export --book some-picture-book --type picture-book
```

脚本行为（详见 `scripts/publish.mjs` 头注释）：

- 按文件名排序；同名多格式（png/jpg/webp 并存）只取 webp > jpg > png 其一
- `*-cover` / `*-charsheet` 自动排除出正文页，封面自动转码为 `books/<slug>/cover.webp`
- sharp 转 WebP q80，宽 > 1600px 才缩
- `book.yml` / `chapter.yml` 不存在时生成骨架，并提示补 description/tags
- `--dry` 预览；**红线：原始大图永不进本 repo**

## 目录结构

```
books/<slug>/                 # ★ 唯一内容目录，全部由发布脚本写入（扁平，无类别子目录）
  book.yml                    # 元数据（可带 title_en / description_en 供英文站使用）
  cover.webp                  # 可选，缺省回退第一章第一页
  <chapter>/chapter.yml       # 章元数据（短篇/绘本即单章 01）
  <chapter>/pages/001.webp…   # 页图，文件名字典序 = 阅读顺序
src/
  content.config.ts           # books / chapters 两个 collection
  lib/books.ts                # 书架/章节视图模型
  lib/i18n.ts                 # 中英字典 + href() 链接助手
  pages/                      # 中文路由：/（首页）/book/… /read/…
  pages/en/                   # 英文路由：/en/…（同一套组件，lang="en"）
  components/pages/           # HomePage / BookDetail / Reader（按 lang 出文案）
  components/                 # BookCard / ChapterList / Giscus
scripts/publish.mjs           # 上架脚本
scripts/exam-fixtures.mjs     # 书架压力考试：--make 200 生成 books/_test-* 测试书，--clean 清理
```

## 双语

- 中文 `/`、英文 `/en/`，顶栏一键互切；`book.yml` 里可选补 `title_en` / `description_en`
- 章节标题目前只有中文（来自 `chapter.yml` 的 `title`）；给某章补英文时加 `title_en` 字段即可在英文站显示
- 阅读进度与语言无关：中文页读一半，英文页打开接着读

## SEO / GEO

上架新书无需任何额外操作，以下全部构建时自动生成：

- **SEO**：每页 canonical / OG 全套（og:url、og:locale、og:image 走 jpg）/ Twitter Card / hreflang（zh、en、x-default）；JSON-LD 结构化数据 —— 首页 WebSite+Organization、连载 ComicSeries（hasPart: ComicIssue）、单本 Book、书目与阅读页 BreadcrumbList（`src/lib/schema.ts`）
- **GEO（生成式引擎优化）**：`/llms.txt` 与 `/llms-full.txt`（站点说明 + 完整书目，从书架数据生成）；robots.txt 明确欢迎 GPTBot / ClaudeBot / PerplexityBot 等 AI 爬虫；阅读页带 `.sr-only` 文本上下文（书名 · 章题 · 页数 · 简介）
- RSS `/rss.xml`、sitemap `/sitemap-index.xml`、`robots.txt` 同为自动


## 阅读器

- 默认翻页模式（page-flip HTML 模式 + 自研 ±2 页懒加载）；窄屏自动单页，宽屏对开
- 滚动模式为后备通道，与翻页共用进度键，切换零损耗（`cl:mode`）
- 进度：`cl:progress:<book>:<chapter>`；书架/目录页显示「继续」
- 交互：手势滑动、点击翻页、`←` `→` `PageUp` `PageDown`、底部滑条、缩略图网格跳页、全屏

## 部署

**平台决策（2026-10-01 作者确认）**：先只上 **Vercel 单平台**；kickoff §9 的 Cloudflare 主 + Vercel 备双接入**暂缓**，将来需要时再按 §9 补 Cloudflare。

**已完成**

| 项 | 状态 |
|---|---|
| 线上地址 | **https://comic.getaiti.com**（阿里云 DNS `CNAME comic → cname.vercel-dns.com`） |
| GitHub | `git@github.com:zhiwehu/ai_comic_library.git`，分支 `main`，**public** |
| Vercel | 项目 `ai_comic_library`（team `zhiwehus-projects`），已关闭 Deployment Protection，已连 Git（push 即自动部署） |
| 评论 | giscus 已接入并实测渲染（仓库 Discussions 已开、giscus App 已授权） |
| 备用地址 | https://aicomiclibrary.vercel.app（Vercel 默认域，canonical 指向正式域名） |

**giscus 配置值**（已在 Vercel 项目环境变量里，Production + Preview）：

| 变量 | 值 |
|---|---|
| `PUBLIC_GISCUS_REPO` | `zhiwehu/ai_comic_library` |
| `PUBLIC_GISCUS_REPO_ID` | `R_kgDOU2F8wg` |
| `PUBLIC_GISCUS_CATEGORY` | `Announcements` |
| `PUBLIC_GISCUS_CATEGORY_ID` | `DIC_kwDOU2F8ws4DGx5n` |

> 分类必须选 **Announcements** 类型（giscus 只能在该类型下创建讨论）。
> 自查命令：`curl "https://giscus.app/api/discussions/categories?repo=<owner>/<repo>&repoId=<repo-id>&query=&first=100"`

**剩余步骤**

1. **微信内置浏览器真机验收**（kickoff §6：iOS + Android 各一台，测翻页手势/预加载/进度记忆）
2. **国内可访问性**（见下）——需要作者决策走 Cloudflare Pages 还是阿里云 OSS + CDN

**⚠️ 国内可访问性**：Vercel 的 IP 段在中国大陆网络被 TLS 层阻断（TCP 通、ClientHello 即被 RST，
换自定义域作 SNI 也一样），国内直连需要代理。若要国内读者直接访问，按 kickoff §9 补 Cloudflare Pages，
或把 `dist/` 托管到阿里云 OSS + CDN（域名已备案，国内最快）。

**日常发布流程**：`pnpm run publish …` → `git commit && git push` → Vercel 自动构建上线。


