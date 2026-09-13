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

## 开发流程（用户规定，2026-09-10）

后续所有网站/页面开发按固定顺序执行，不得跳步：
1. **需求分析** → `docs/ux/ux-analysis.md`（画像/旅程/验收标准）
2. **原型设计** → `prototypes/`（低保真线框，浏览器可交互）+ `docs/ux/wireframes.md`
3. **页面设计** → 按原型细化视觉稿（如需图片素材，用 Seedream 生成）
4. **制定设计规范** → `docs/design-system.md`（Token 唯一来源，改设计先改文档再改 CSS）
5. **开发** → 实现落地 + 浏览器实测 + 部署验证

## 图标与图片（全局规则）

- 所有图标/图片**用 AI 生成**：火山方舟 Seedream 5.0，`bash ~/scripts/seedream-generate.sh "<prompt>" <out.png>`（凭证 `~/.claude/credentials.env`）
- **禁止用 emoji 当图标**
- prompt 模板与生成管线见 `docs/design-system.md` §4.6

## 知识库规模

**不设条数上限**——素材越多 AI 越准。上线唯一标准：黄金集命中率 ≥80%（后台一键验收）。
持续录入：新素材 → 勾核实 → 重建索引 → 跑黄金集回归。检索是向量级 O(1)，千条规模零压力。

## 知识库后台管理（/admin）

- `workers/public-admin/admin.html`：单页后台（登录→素材CRUD→媒体上传R2→重建索引→黄金集管理/命中测试）
- API：`workers/src/admin.js`（D1 `entries`/`golden` 表）+ `auth.js`（单管理员密码，ADMIN_PASSWORD secret）
- 部署后访问 `https://<workers域名>/admin`；素材存 D1，媒体存 R2，重建索引=embedding→Vectorize
- **已部署**：https://kuchuang-yide.xdh725-kcyd.workers.dev （/admin 后台，ADMIN_PASSWORD 见 wrangler secret）
- 资源已建：D1 kcyd-kb（e5fe283d）/ KV COUNTERS（fbe64aca）/ Vectorize kcyd-kb（1536维，智谱MRL截断）/ R2 kcyd-media（待控制台开通后加回 wrangler.toml 注释的 MEDIA 绑定）
- **媒体存储：阿里云 OSS**（不是 R2）：桶 `kuchuang-yide` @ oss-ap-southeast-1（新加坡，海外友好），桶公共读；Workers `src/oss.js` 签发 PostObject 直传凭证，浏览器直传不经 Workers；凭证 OSS_ACCESS_KEY_ID/SECRET 走 wrangler secrets（源在 ~/.claude/credentials.env）
- 生产调试要点：GLM 调用必须 thinking disabled（思考链会耗尽 max_tokens 致 content 空）；CF 边缘→智谱北京往返慢，超时 30s；curl 测试要带浏览器 UA（CF bot 防护挡默认 UA）
- D1/R2/KV 的 PLACEHOLDER ID 创建资源后填回 wrangler.toml

## 多语言（i18n）

- 零依赖实现：`assets/js/i18n.js`（语言包字典 + localStorage 持久化 + 浏览器语言自动检测）
- 页面文案用 `data-i18n` / `data-i18n-html` / `data-i18n-placeholder` 标记；JS 动态文案用 `I18N.t('key')`
- 当前支持 EN（默认）/ 中文；**新增语言**：在 `i18n.js` 的 `DICT` 加语言块 + 四个页面 `<select id="lang-select">` 加 `<option>`
- 切换后 dispatch `langchange` 事件；chat 请求自动携带 `lang` 字段（后端按语言返回）

## 阿里云轻量服务器部署（独立版，2026-09-12）

- **服务器**：轻量应用服务器 us-west-1（ID 2ac77f8768834d629b761f1c6502b0f5，宝塔面板，1.8G 内存）
- **站点**：http://47.254.25.245 （Nginx 80 → Node :8090，systemd 服务 kcyd 自启）
- **代码**：`standalone-server/`（SQLite 替代 D1 / 内存向量检索替代 Vectorize / 智谱 GLM 不变）
- **运维**：`systemctl restart kcyd`；日志 `journalctl -u kcyd -f`；数据 `kcyd.db` + `vectors.json`
- **远程操作**：workbench CLI 不支持轻量服务器——用 SWAS RunCommand API（封装在 /tmp/swas-exec.py 模式，凭证 ALIYUN_AK/SK=workbench-deploy 子账号）
- 更新部署：git push → 服务器 `cd /www/wwwroot/kuchuang-yide && git pull && systemctl restart kcyd`
- **注意**：与 workers.dev 版并行（两套独立数据）；Workers 版数据以远程 D1 为准

## 部署（2026-09-12 起：唯一线上站点 = 阿里云轻量服务器）

- **正式域名（HTTPS）**：https://maomaochong.fun （www 同效；http 301 跳 https；IP 47.254.25.245 仍可访问）
  - 证书：Let's Encrypt，certbot 自动续期（systemd timer）
  - DNS：阿里云 DNS（hichina），A 记录 @/www → 47.254.25.245
- Workers 版代码（workers/）保留在仓库作 CF 参考实现；CF 账号资源（D1/Vectorize/KV）未删，可随时 `cd workers && wrangler deploy` 恢复
- workers/ 下的源码改动不再自动上线；线上以 standalone-server/ + workers/public/（服务器 git pull）为准


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
