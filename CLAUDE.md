# 酷创易德外贸官网（kuchuang-yide）

面向海外 B 端采购商的无刷电机（BLDC）外贸网站。**只有两大核心功能**：
1. 🤖 **Explore Product** — AI 对话式产品导购（Router → Harness / 受控 Agent 分层调度，幻觉零容忍）
2. 🏭 **Virtual Factory Tour** — 低带宽云参观工厂（预录分段视频为主）

不做：商城、购物车、支付、注册登录、资讯、会员。**少即是多。**

## 目录结构

```
docs/       需求与架构文档（先读 requirements.md 和 architecture-router-harness-agent.md）
prompts/    Router / Harness / 受控 Agent / 后置校验 的英文系统提示词（可直接配置到大模型接口）
knowledge-base/  知识库素材目录（原材料/工序/场景/效果 四类标签）
assets/     前端静态资源（css / js / img / video）
*.html      网站四个页面：index / product-explorer / virtual-tour / thank-you
```

## 多语言（i18n）

- 零依赖实现：`assets/js/i18n.js`（语言包字典 + localStorage 持久化 + 浏览器语言自动检测）
- 页面文案用 `data-i18n` / `data-i18n-html` / `data-i18n-placeholder` 标记；JS 动态文案用 `I18N.t('key')`
- 当前支持 EN（默认）/ 中文；**新增语言**：在 `i18n.js` 的 `DICT` 加语言块 + 四个页面 `<select id="lang-select">` 加 `<option>`
- 切换后 dispatch `langchange` 事件；chat 请求自动携带 `lang` 字段（后端按语言返回）

## 预览部署

- **GitHub Pages**：https://xdh725.github.io/kuchuang-yide/ （仓库 xdh725/kuchuang-yide，master 分支即线上）
- **正式部署目标仍是 Cloudflare Pages + R2**（见 `docs/deployment.md`；GitHub Pages 仅预览用）
- 注意：GitHub Pages CDN 对 HTML/JS 缓存 max-age=600，部署新版本后浏览器最多延迟 10 分钟


## 核心原则（写代码前必读）

1. **幻觉零容忍**：AI 只能转述/串联知识库素材，禁止生成库中不存在的参数、型号、材料牌号。详见 `docs/architecture-router-harness-agent.md`。
2. **路由口诀**：查数字、查物料、查流程、查清单 → Harness；拼条件、做对比、猜工况、看图选型、做假设推演 → 受控 Agent；模糊 → 保守降级 Harness。
3. **弱网优先**：视频 ≤720p、码率 ≤900kbps、帧率 12–15fps、H.264、默认静音。流畅 > 清晰。详见 `docs/video-encoding-guide.md`。
4. **部署**：纯静态 → Cloudflare Pages（零服务器）；素材 → Cloudflare R2 + CDN。禁止国内节点直连海外访客。
5. **询盘闭环**：所有兜底都引导留 WhatsApp / Email（三栏极简表单）。

## 微信公众号发布

发布 Markdown 文章到微信公众号草稿箱：
```bash
bash ~/scripts/wechat-publish.sh <markdown文件路径>
```
凭证从 `~/.claude/credentials.env` 自动加载，无需额外配置。
