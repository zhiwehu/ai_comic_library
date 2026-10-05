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
.wm-manifest.json             # 水印烧录清单（发布时排除，不对外）
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

## 版权防护（防下载 / 防剽窃）

网页图片没有绝对防下载（截屏、开发者工具总能拿到图），本站做的是**多层抬门槛**，
核心思路是「水印烧在图里，谁拿走都带标」：

| 层 | 手段 | 挡住什么 |
|---|---|---|
| 发布水印 | 上架/回填时把整页平铺斜纹水印（默认 `comic.getaiti.com`）烧进图片本体（webp + jpg 孪生图） | 下载、截屏、搬运后的每一张图都带站标，裁剪局部也躲不开——**防剽窃的根基** |
| 阅读器防护 | 阅读页禁右键菜单、禁拖图、禁 iOS/安卓长按存图；另有全屏隐形水印层（截屏/屏摄也带标） | 「右键另存为 / 拖到桌面」这类零成本下载路径 |
| 直链防索引 | `X-Robots-Tag: noindex, noimageindex`（`public/_headers` + `vercel.json`，主备站同规则） | 图片被收进 Google/Bing 图片搜索后被批量扒走 |

### 日常操作

- **新上架默认带水印**：`pnpm run publish …` 直接用。可调：`--no-wm` 关闭、`--wm <文字>` 自定义、
  `--wm-opacity <0~1>` 调淡、`--wm-cover` 封面也打（默认封面不打，保持 OG/宣传图干净）
- **存量补水印**：`pnpm run watermark`（`--cover` 含封面、`--dry` 预览、`--force` 无视清单重烧）。
  重复执行安全：`books/.wm-manifest.json` 记录每张图烧录前后哈希——烧过的跳过，干净版被重新上架会自动重烧
- **构建期兜底**：`pnpm build` 第一步自动跑 watermark——哪怕图片绕过 publish 脚本被直接拷进 `books/`
  （比如 AI 助手代发布时漏了脚本），构建/上线前也会补上水印，裸图上不了线
- ⚠ 仓库里只有压缩发布版（红线：原始大图不进 repo）：水印一旦烧入，想要干净版只能从导出源图重新上架

## 部署

**平台现状（2026-10-01）**：**Vercel 主 + Cloudflare Pages 备**（kickoff §9 的双接入，主备对调）。
主站已上线，备站已完整部署待命，切主备只需改一条 DNS。

| 项 | 值 |
|---|---|
| **正式域名** | **https://comic.getaiti.com** |
| 阿里云 DNS | `CNAME comic → 738733b24f153730.vercel-dns-017.com`（Vercel 专用 CNAME，非 `cname.vercel-dns.com`） |
| 主站（Vercel） | 项目 `ai_comic_library`（team `zhiwehus-projects`），已关 Deployment Protection，已连 Git（push 即自动部署） |
| 备站（Cloudflare Pages） | 项目 `comic-library` → **https://comic-library-du0.pages.dev**，`comic.getaiti.com` 已绑定（状态 pending，等 DNS） |
| 备站自动同步 | ✅ GitHub Actions（`.github/workflows/deploy-cloudflare.yml`）—— `git push` 即构建并上传，无需手工 |
| 切换备站 | 阿里云把 `comic` 的 CNAME 值改为 **`comic-library-du0.pages.dev`**（几分钟自动验证+签证书） |
| GitHub | `git@github.com:zhiwehu/ai_comic_library.git`，分支 `main`，**public** |
| 评论 | giscus 已接入并实测渲染（仓库 Discussions 已开、giscus App 已授权） |

> **不要用** `aicomiclibrary.vercel.app` 对外宣传：`*.vercel.app` 共享域在国内被阻断（实测 20s 超时），
> 只有自定义域可用。Cloudflare 备站的 `pages.dev` 域名国内可直连。

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
2. **故障切换策略未定**（三选一）：① 免费——加个监控告警，挂了手动改一条 CNAME；
   ② 只留一个源站，问题消失；③ 阿里云 GTM / Cloudflare Load Balancing 做健康检查自动切换（付费）。
   注：DNS 无法"按客户端能力"分流，一个主机名同一时刻只能指向一个目标。

**⚠️ 国内可访问性（实测结论）**：自定义域 `comic.getaiti.com` 走 Vercel 专用 IP，国内**可直连**
（首页 0.42–0.55s）；被阻断的是 Vercel 共享 IP 与 `*.vercel.app`（TLS RST / 超时）。
Cloudflare 备站国内也直连可用（0.68–0.93s），当前比 Vercel 慢，故主站仍用 Vercel。

**日常发布流程**：`pnpm run publish …`（水印自动烧录）→ `git commit && git push` → **两个平台各自自动构建上线**
（Vercel 走 Git 集成；Cloudflare 备站走 GitHub Actions，纯文档改动 `**/*.md` 会跳过以省构建；
云端构建同样先跑 watermark 兜底，裸图上不了线）。
Actions 里部署前有三步预检（secret 是否注入 / token 是否有效 / 是否具备 Pages 权限），失败时看步骤名即可定位。


