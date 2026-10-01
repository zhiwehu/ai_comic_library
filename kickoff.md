# comic-library 启动文档 —— AI 漫画/绘本阅读站

> **给新工作区 AI 的指令**：本文档是完整需求规格，已由作者与上一个会话充分讨论定稿。
> 请按「§13 实施顺序」执行；文档未覆盖的决策，先询问作者再动手，不要自行发挥。
>
> **给作者的用法**：把本文件复制到新工作区根目录，然后对 AI 说：
> 「阅读 comic-library-kickoff.md，这是完整需求规格，按实施顺序开始搭建。」

---

## 1. 项目定位（一句话）

为作者用 AI 创作的漫画与绘本建一个**作品图书馆**：书架 + 目录 + 逼近实体书体验的翻页阅读器。
它是公众号连载的"完整阅读入口"和永久存档，是可分享的作品集；**不是流量引擎**，不做复杂运营功能。

## 2. 已确定的决策（不要重新讨论）

| 决策项 | 结论 |
|---|---|
| 项目形态 | **独立新 repo**（`comic-library`），与创作 repo `ai_infra_comic` 分离 |
| 域名 | 子域名 `comics.getaiti.com` |
| 读者 | 国内外都要 |
| 部署 | **Cloudflare Pages 主 + Vercel 备**，同一仓库双接入，故障时改一条 DNS 切换 |
| 阅读形态 | **翻页效果优先**（page-flip），保留纵向滚动作为后备模式（可切换） |
| 首发内容 | 存量全上架：AI infra 系列 6 章 + 角色介绍 + 若干短篇漫画/绘本 |
| 成本 | 全程零费用（免费托管 + 免费评论组件），无后端 |
| 语言 | v1 中文界面；数据模型预留 `language` 字段，双语切换是 v2 的事 |

## 3. 技术栈

- **框架**：Astro 5（静态输出），TypeScript，包管理用 pnpm，Node ≥ 20
- **内容驱动**：Astro Content Collections（glob loader），书架/目录/RSS/sitemap 全部由 `books/` 下的数据文件生成
- **翻页阅读器**：npm 包 **`page-flip`（StPageFlip）**——canvas 拟真卷页、原生 JS、MIT、支持双页/单页响应式与滑动手势。不用 turn.js（年久失修）
- **图片**：发布脚本用 **sharp** 预压成 WebP，站点直接引用成品图（不在构建时做图片处理，保持部署快）
- **无后端三件套**：评论用 giscus（GitHub Discussions）、RSS 用 `@astrojs/rss`、sitemap 用 `@astrojs/sitemap`
- **进度/偏好**：localStorage，不用任何账号系统

## 4. 仓库结构

```
comic-library/
├── astro.config.mjs
├── package.json
├── books/                          # ★ 唯一的内容目录，全部由发布脚本写入
│   ├── ai-infra/                   # 连载系列
│   │   ├── book.yml
│   │   ├── character-introduction/ # 序章（number: 0）
│   │   │   ├── chapter.yml
│   │   │   └── pages/001.webp ...
│   │   └── ch01-downloaded-but-cannot-run/
│   ├── shorts/                     # 短篇漫画，每本一个目录
│   │   └── <slug>/book.yml + pages/
│   └── picture-books/              # 绘本，每本一个目录
│       └── <slug>/book.yml + pages/
├── scripts/
│   └── publish.mjs                 # 发布脚本（sharp），见 §7
├── src/
│   ├── content.config.ts           # book / chapter 两个 collection
│   ├── layouts/Base.astro
│   ├── pages/
│   │   ├── index.astro             # 书架首页（三板块）
│   │   ├── book/[slug].astro       # 系列目录页 / 单本详情页（复用）
│   │   └── read/[book]/[chapter].astro  # 阅读页（唯一重交互页面）
│   ├── components/
│   │   ├── ReaderFlip.astro        # page-flip 封装
│   │   ├── ReaderScroll.astro      # 滚动后备
│   │   ├── BookCard.astro          # 封面卡
│   │   └── ChapterList.astro
│   └── styles/global.css
├── public/
│   └── favicon.svg
└── .gitignore                      # node_modules / dist / .astro
```

## 5. 数据模型

**`book.yml`**（每本书/每个系列一份）：

```yaml
title: AI 基础设施漫画            # 系列名以作者定稿为准，可后改
type: series                      # series | short | picture-book
status: ongoing                   # ongoing | completed
language: zh                      # zh | en | bilingual（v2 用）
description: 一部讲 GPU / 显存 / 推理优化的技术漫画
cover: cover.webp                 # 不存在时回退到第一章第一页
tags: [AI, GPU, 推理]
```

**`chapter.yml`**（仅 `type: series` 需要；短篇/绘本整本就是一个 reader 实例）：

```yaml
title: 模型都下载好了，为什么不能跑？
number: 1                         # 排序与"下一章"依据；序章为 0
date: 2025-09-29                  # 发布日期，RSS 用
```

规则：
- `pages/` 内按文件名字典序即阅读顺序，发布脚本统一产出 `001.webp`、`002.webp`…
- 短篇/绘本的 `book.yml` 同样有 `number` 语义不需要，书架内按 `date` 倒序排列
- 面向数据的页面全部 build 时生成，运行时零请求后端

## 6. 阅读器规格（本项目的心脏）

### 翻页模式（默认）
- 视口宽 **≥ 900px 且横屏 → 双页对开**；否则**单页**（`page-flip` 的 `usePortrait` 自适应，页面比例 8:9，源图 1600×1800）
- 交互：左右滑动手势、点击页面左右边缘翻页、键盘 `←` `→` / `PageUp` `PageDown`、底部页码滑条、**缩略图网格点选跳页**
- **懒加载：只加载当前页 ±2**（每章约 16 页、压缩后 3–5MB，不允许一次全载进 canvas）
- 顶部悬浮条（半透明、阅读时自动隐藏）：返回目录 · 上一章/下一章 · 翻页/滚动切换 · 全屏
- **进度记忆**：localStorage 键 `cl:progress:<bookSlug>:<chapterSlug>` = 页码；目录页显示「读到第 x 页 · 继续」
- 章末：翻过最后一页出现「下一章 →」引导卡；系列结束则显示「返回书架」

### 滚动模式（后备，必须保留）
- CSS `scroll-snap` 垂直整页停顿，键盘/触摸可用
- **与翻页模式共用同一进度键**，切换模式进度不丢；用户偏好存 `cl:mode`，下次进入沿用
- 存在意义：低端安卓与微信内置浏览器里 canvas 翻页偶发卡顿/手势冲突时的自救通道

### 兼容性验收
- 必须在**微信内置浏览器（iOS + Android 各一台）**实测：翻页手势、预加载、进度记忆
- 弱网模拟（Slow 3G）下打开阅读页：首屏两页可见，其余后台懒加载

## 7. 发布脚本 `scripts/publish.mjs`

创作流程不改，上架 = 对展示 repo 跑一条命令：

```bash
# 系列（一章一条）
pnpm publish --from /Users/huzhiwei/ai/ai_infra_comic/output/web/ch07_xxx/images \
             --book ai-infra --chapter ch07-xxx \
             --title "第七章标题" --number 7

# 单本（短篇/绘本整本）
pnpm publish --from <绘本导出目录>/images --book picture-books/<slug> --title "绘本名"
```

行为规格：
1. 读取 `--from` 目录，按文件名排序（`pgNNN.*`）；同名多格式（png/jpg/webp 并存）只取 webp > jpg > png 一个
2. sharp 转码：WebP 质量 80；**宽 > 1600px 才缩**（源图即 1600×1800，通常只转格式），高度等比
3. 写入 `books/<book>/<chapter>/pages/001.webp...`；`--book` 含 `/` 时支持 `shorts/xxx`、`picture-books/xxx` 嵌套
4. `chapter.yml` 不存在则生成骨架：`title` 取 `--title`，否则解析源目录 `chapter.yaml` 前几行的 `title:` 字段（创作 repo 的 chapter.yaml 头部就是 `id:` + `title:`）；`number` 取 `--number`；`date` 取当天
5. `book.yml` 不存在则生成骨架并**提示作者补 description/tags**
6. 结束打印汇总：页数、总体积、平均单页体积
7. 提供 `--dry` 预览模式；commit message 固定格式 `publish: <book>/<chapter> (N pages, X MB)`

**红线：原始大图（`output/web` 每章约 38–42MB）永远不进本 repo，只进压缩后的发布版。**

## 8. 首批内容导入清单

源仓库：`/Users/huzhiwei/ai/ai_infra_comic`（只读，不做任何修改）

| 导入顺序 | 内容 | 源目录 | 编号 |
|---|---|---|---|
| 1 | 角色介绍（序章） | `output/web/character_introduction/images` | number: 0 |
| 2–7 | 第 1–6 章 | `output/web/ch01_downloaded_but_cannot_run/images` 等 6 个目录 | 1–6 |
| 8+ | 短篇漫画、绘本 | **TODO：作者补充各导出目录路径** | — |

导入后验证：系列目录页按 0→6 排列、"最新更新"徽标指向 number 最大章。

## 9. 部署

1. GitHub 新建 **public** 仓库 `comic-library`（public 是 giscus 的硬性要求；内容本来就是公开的）
2. **Cloudflare Pages（主）**：连接仓库 → 框架预设 Astro → 构建 `pnpm build` → 输出 `dist` → 绑定自定义域 `comics.getaiti.com`
3. **Vercel（备）**：同一仓库接入，配置同一个自定义域但 **DNS 不解析到它**；Cloudflare 故障时改一条 DNS 记录即可切换
4. 注意：一个主机名同一时刻只能解析到一家，这是主备不是负载均衡，不要做流量分流
5. DNS：在 getaiti.com 当前 DNS 服务商处加 `comics` 的 CNAME 指向 Cloudflare Pages 分配的域名

## 10. 页面清单与 MVP 验收标准

| 页面 | 验收标准 |
|---|---|
| 书架首页 `/` | 三个板块（连载系列/短篇漫画/绘本）由 `books/` 自动生成；连载卡显示「更新至第 X 章」；无书板块自动隐藏或显示占位 |
| 目录/详情页 `/book/[slug]` | 系列：章节列表 + 封面 + 简介 + 进度标记 + 最新章徽标；单本：直接给「开始阅读/继续阅读」 |
| 阅读页 `/read/[book]/[chapter]` | §6 全部条款 |
| 全站 | RSS `/rss.xml`、sitemap、每本书独立 OG 分享卡（封面 + 标题）、giscus 评论挂在每本书详情页 |

流程验收：`git push` → 两平台自动构建 → `comics.getaiti.com` 可访问；跑一次发布脚本上架一个新章节全程 ≤ 2 分钟。

## 11. v1 明确不做（防止范围蔓延）

双语切换（仅预留字段）、翻书特效增强（StPageFlip 默认效果已够）、站内搜索、用户系统、付费/打赏、统计后台、条漫连续长图模式。

## 12. 设计方向

- 气质：**深色书房/图书馆**，克制、安静、让画说话；阅读页近黑背景（如 `#0b0b0f`），页面居中带轻投影，UI chrome 最少化
- 书架：封面墙，卡片统一比例（源图 8:9，可 `object-fit: cover` 裁到 3:4 统一视觉），hover 轻浮起
- 移动优先；中文无衬线系统字体栈即可，不引 webfont
- **避免"AI 味"**：不要紫色渐变、不要玻璃拟态堆砌、不要圆角大卡片阵列的模板脸
- 书架页脚放一句：「本馆作品由 AI 辅助创作，流程可复现」——把 AI 生成当特色亮出来

## 13. 实施顺序

1. 脚手架：Astro 5 + TS + pnpm，两个 content collection 定义与 zod schema
2. 数据先行：手工放 1 本测试书（几页占位图）打通 `books/` → 书架 → 目录 → 阅读页全链路
3. 阅读器：先翻页模式（page-flip + 懒加载 + 进度），再滚动后备 + 模式切换
4. 发布脚本 `publish.mjs` + 从 `ai_infra_comic` 真实导入首批 7 个章节（§8）
5. 书架/目录页补全三板块 + OG 卡 + RSS + sitemap + giscus
6. GitHub 仓库 + Cloudflare Pages + Vercel 双接入，绑定域名
7. 移动端 + 微信内置浏览器实测（§6 兼容性验收），修完再交付

---

**2026-09-30 · 阅读器沉浸化（覆盖 §6 工具栏条款）**

- 工具栏默认**完全隐藏**（内容优先）：桌面鼠标移动呼出、2.2s 无操作自动隐藏；
  触屏轻点屏幕中央呼出/隐藏，点上下边缘也可呼出；首次进入有操作提示；
- 翻页模式：屏幕左右 1/3 轻点翻页、中央轻点切换工具栏（滑动翻页不受影响），桌面同理；
- **进度条按视图数刻度**：对开模式指示器显示区间（如 5–6 / 6），滑条拉到最右=真正读完最后一页
  （修复双页模式下进度条永远无法到满的问题）。

**2026-09-30 · 品牌与主题**

- 站名定为「漫画图书馆 / The Comic Library」，不再使用「深夜书房」作为站名
  （该词降级为氛围描述）；首页主标题、页脚、i18n 文案同步更名；
- 新增**深色 / 浅色主题切换**：跟随系统 `prefers-color-scheme`，顶栏与阅读器工具栏可手动切换，
  选择存 localStorage（`cl:theme`），内联脚本先于渲染执行避免闪屏；
  全站颜色收敛为语义变量（global.css `[data-theme='light']` 块）。

**2026-09-30 · 双语落地（提前完成 §2 预留的 v2 项）**

- 静态双语路由：中文 `/`，英文 `/en/…`，构建期生成两份页面（当前 60 页），运行时零开销；
- 顶栏「中文 / EN」互切（同路径切换），`<html lang>`、OG、`hreflang` 均按语言输出；
- `book.yml` 新增可选 `title_en` / `description_en`，缺省回落中文；RSS/sitemap 不变；
- 阅读进度键与语言无关，中英页面共享「继续阅读」。

**2025-09-30 · 作者修订（本工作区确立）**

1. **`books/` 目录扁平化**（覆盖 §4 仓库结构）：
   - 不设 `ai-infra`、`shorts`、`picture-books` 类别子目录，所有书一律 `books/<slug>/` 平铺；
   - 「系列 / 短篇 / 绘本」只是 `book.yml` 的 `type` 元数据，不影响目录结构；
   - 数据模型统一：**每本书都由章节组成**，短篇/绘本即「单章书」（发布脚本自动建单章），
     阅读路由统一为 `/read/<book>/<chapter>`；目录页上单章书仍按 §10 呈现为「开始阅读/继续阅读」。
2. **首页信息架构**（覆盖 §10 首行验收）：
   - 不按三板块分区，**所有书按最近更新时间混排成一面书架**；
   - 类型仅作小标签展示，连载卡额外显示「更新至第 X 章」，无书板块问题随之消失。
3. **主页创意概念：深夜书房**（细化 §12）：
   - 首屏为「开卷」——摊开在深色桌面上的最新一话跨页，台灯光晕，可直接进入阅读；
   - 其下为木质书架封面墙：封面如实体书立在架上，hover 书头微微前倾；
   - 基调仍守 §12：深色、克制、无紫色渐变、无玻璃拟态、不引 webfont（标题用宋体系统栈做书房气质）。

> 事实修正：源仓库实际为 **ch01–ch05 共 5 章** + `characters` 角色介绍（6 页），§8 中「6 章」以实际为准。
> 另：`07_chapters` 中已有 ch06–ch08 稿件，但 `output/web` 尚未导出，导出后再上架。
>
> 命令拼写修正：发布命令是 **`pnpm run publish`**（`pnpm publish` 是 pnpm 内置的 npm 发包命令，会走错）。
> 脚本会自动解析源目录 `index.md`/`chapter.yaml` 头部的 title/description/tags/series 字段，
> 系列名用 `--book-title` 覆盖，单章书可不传 `--chapter`（默认 `01`）。

---

*本文档由 2025-09-30 的讨论定稿。决策依据：翻页体验优先级最高 → 选 page-flip；读者含国内 → Cloudflare Pages 主部署；创作管线已有 web 导出 → 发布脚本只做转码不做格式假设；要长期持续更新 → 一切设计服务于把"上架一本书"的边际成本压到一条命令。*
