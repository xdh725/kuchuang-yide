# AI 导购技术实现方案（MVP 版，可直接开发）

日期：2026-09-10 ｜ 依据：tech-plan-v2 §2 架构 ｜ 前提：MVP 不依赖域名，跑在 `*.workers.dev` 或本地 `wrangler dev`

## 0. 一图看懂

```
【一次性：素材入库】                          【运行时：每条消息】
knowledge-base/*.md（双语条目）                浏览器 chat.js
        │                                          │ POST /api/chat {message, lang}
        ▼                                          ▼
scripts/build-kb.mjs                        workers/api/chat.js（入口）
  解析 frontmatter → 分块                    ① embed(text)  ← 智谱 embedding-3
  OpenAI embedding 预计算                     ② Vectorize query top-5
        │                                    ③ score < THRESHOLD？──是──▶ 兜底 {fallback:true}
        ▼                                    ④ Harness: system prompt(harness) +
  wrangler vectorize insert                    检索片段 → Workers AI 生成（转述+来源）
  （vectorId=KB条目ID, metadata=标签/来源）    ⑤ 后置校验：正则预检 → LLM 校验（高置信跳过）
                                             ⑥ {reply, source, fallback:false}
                                             
本地测试：wrangler dev + tests/golden-set.json 跑命中率
```

## 1. 代码结构（全部新增文件）

```
kuchuang-yide/
├── workers/                        # Cloudflare Workers 项目（后端）
│   ├── wrangler.toml               # 绑定：AI / VECTORIZE / KV / RATE_LIMIT / secrets
│   ├── package.json                # 依赖：wrangler（devDep），无运行时依赖
│   ├── src/
│   │   ├── index.js                # 路由：/api/chat /api/inquiry /api/health
│   │   ├── chat.js                 # 聊天管线（本方案核心，§4）
│   │   ├── harness.js              # Harness 提示词组装 + Workers AI 调用
│   │   ├── postfilter.js           # 后置校验（正则预检 + LLM 校验）
│   │   ├── embed.js                # OpenAI embedding 调用（查询时）
│   │   ├── ratelimit.js            # IP 限流（RL binding）+ 日上限（KV）
│   │   └── fallback.js             # 兜底话术（双语，按 lang 返回）
│   └── tests/
│       └── chat.test.js            # 管线单元测试（vitest + miniflare）
├── scripts/
│   ├── build-kb.mjs                # 知识库 → 向量入库（§2）
│   └── run-golden-set.mjs          # 黄金集命中率测试（§6）
├── knowledge-base/
│   ├── models/kc-4215.md           # 素材条目示例（§2 格式）
│   └── ...
├── tests/
│   └── golden-set.json             # 50 题 [{q, expected_kb_id}]（工程师独立写）
└── prompts/                        # 已有 4 个提示词，harness 被直接引用
```

前端零改动（chat.js 已按 `{reply, source, fallback}` 契约写好，`/api/chat` 相对路径在 workers.dev 下天然可用）。

## 2. 知识库素材格式与入库

### 2.1 素材条目（Markdown + frontmatter）

```markdown
---
id: KB-MD-001
title: KC-4215 电机规格
tags: [model, kc-4215, drone]
type: spec-sheet
lang: bilingual
verified: true
verified_by: 工程部-王工
verified_at: 2026-09-10
---
EN: The KC-4215 outrunner BLDC motor: KV 340, rated voltage 48V (12S LiPo),
max continuous current 32A, stator 42mm×15mm, N35SH magnets, IP54,
weight 285g. Applicable to agricultural drones 15–25kg class.
ZH: KC-4215 外转子无刷电机：KV 340，额定电压 48V（12S 锂电），
最大持续电流 32A，定子 42×15mm，N35SH 磁钢，IP54，重量 285g。
适用于 15–25kg 级植保无人机。
```

规则（沿用 knowledge-base/README.md）：
- 一条素材讲一件事；EN/ZH 同条目（embedding 时拼接双语，一次入库）
- `id` 即溯源标签（前端渲染 `Source: KB-MD-001 KC-4215 spec`）
- 型号白名单 = `models/` 目录扫描结果，后置校验用它

### 2.2 入库脚本 `scripts/build-kb.mjs`

```
输入：knowledge-base/**/*.md
步骤：
 1. 解析 frontmatter（gray-matter 或手写 YAML 子集解析，避免依赖）
 2. 校验：verified=true 才入库；id 唯一性检查；EN/ZH 字段存在
 3. embedText = title + "\n" + EN段 + "\n" + ZH段   ← 双语同向量，中英提问都能命中
 4. 调智谱 embeddings API（embedding-3, 2048维, batch≤64条/次）
 5. 生成 vectors.json（wrangler vectorize insert 命令格式）
 6. 同时导出 kb-manifest.json：[{id, title, tags, source_label}]
    → 后置校验的型号/牌号白名单也从这里生成
运行：
  source ~/.claude/credentials.env && ZHIPU_API_KEY=$ZHIPU_API_KEY node scripts/build-kb.mjs
  wrangler vectorize insert kcyd-kb --file=vectors.json --binding=KB
成本：40 条 ≈ 3万 token ≈ $0.001（一次性）
```

### 2.3 Vectorize 配置

```toml
# wrangler.toml 片段
[vectorize]
binding = "KB"
index_name = "kcyd-kb"
dimensions = 1536          # text-embedding-3-small 原生维度
metric = "cosine"
```

## 3. 依赖与绑定（wrangler.toml 全貌）

```toml
name = "kuchuang-yide"
compatibility_date = "2026-09-01"
main = "src/index.js"

# （无 [ai] binding——生成走智谱 API，见 src/llm.js 封装）

[[vectorize_indexes]]
binding = "KB"
index_name = "kcyd-kb"
dimensions = 2048          # 智谱 embedding-3 输出维度
metric = "cosine"

[[kv_namespaces]]
binding = "COUNTERS"                        # 日上限计数、询盘去重
id = "<wrangler kv create 填回>"

[[unsafe.bindings]]                         # 原子 IP 限流
name = "CHAT_RL"
type = "ratelimit"
[unsafe.bindings.options]
  namespace_id = "1001"
  simple = { limit = 20, period = 3600 }    # 20 次/小时/IP

[vars]
ZHIPU_BASE = "https://open.bigmodel.cn/api/paas/v4"
CHAT_MODEL = "glm-4.6"          # Harness 转述主力
FILTER_MODEL = "glm-4.5-air"    # 后置校验（便宜快）
EMBED_MODEL = "embedding-3"     # 多语 embedding，2048 维
KB_THRESHOLD = "0.42"           # ⚠️ 初值，黄金集校准后覆盖（见§6）
TOP_K = "5"

# secrets（wrangler secret put，不入库）：
# ZHIPU_API_KEY / FEISHU_WEBHOOK / TURNSTILE_SECRET
```

LLM 选型（已定：全栈智谱 GLM，2026-09-10 用户决策）：
- **生成**：`glm-4.6`——转述主力，中文理解强于 llama-70b（双语站加分）
- **校验**：`glm-4.5-air`——后置校验专用，便宜且快
- **embedding**：`embedding-3`——智谱多语模型（2048 维），中英双语检索原生支持，双语拼一条向量的策略不变
- **统一封装**：`src/llm.js` 一个 fetch 封装管 chat/embedding 两类调用（OpenAI 兼容协议），换模型只改 env 变量
- **延迟注记**：GLM 无边缘推理，Workers（海外 PoP）→ 北京往返约 +300-800ms。管线总延迟预算仍按 E2E ≤8s 设计（弱网 3G 实测为准）
- **前置条件**：智谱账户需充值（2026-09-10 实测余额为 0，全部模型报 1113）

## 4. 聊天管线 `workers/src/chat.js`（核心，逐环节实现）

```js
// 伪代码级真码，开发照此写
export async function handleChat(request, env, ctx) {
  // ── 0. 限流（先于一切花钱操作）────────────────
  const ip = request.headers.get('cf-connecting-ip');
  const { success } = await env.CHAT_RL.limit({ key: ip });
  if (!success) return json({ fallback: true, reply: t('rate_limited'), source: null }, 429);
  const day = await bumpDaily(env);               // COUNTERS:chat:<YYYY-MM-DD> +1
  if (day > 5000) return json({ fallback: true, ... });  // 日全局上限

  // ── 1. 输入校验 ────────────────────────────────
  const { message, lang, image } = await request.json();
  if (typeof message !== 'string' || !message.trim() || message.length > 500)
    return json({ error: 'invalid' }, 400);
  const L = lang === 'zh' ? 'zh' : 'en';
  if (image) return fallback(env, L);            // 阶段一无视觉：带图直接兜底
                                                  //（提示语:工程师会看图回复，请留联系方式）

  // ── 2. 查询 embedding（外部调用 1/2）──────────
  const qvec = await embedQuery(env, message);    // 智谱 embedding-3, ~200ms

  // ── 3. 检索 ───────────────────────────────────
  const hits = await env.KB.query(qvec, { topK: 5, returnMetadata: 'all' });
  const top = hits.matches?.[0];

  // ── 4. 阈值判断 → 兜底 ────────────────────────
  if (!top || top.score < Number(env.KB_THRESHOLD))
    return fallback(env, L);                      // 记埋点: {event:'fallback', score}

  // ── 5. Harness 生成 ───────────────────────────
  const ctx5 = hits.matches.slice(0, 5)           // 全部命中片段进上下文
    .map(m => `[${m.id}] ${m.metadata.text}`).join('\n---\n');
  const reply = await runHarness(env, ctx5, message, L, top);   // 生成调用

  // ── 6. 后置校验 ───────────────────────────────
  const verdict = top.score > 0.75 && reply.length < 600
    ? 'PASS'                                       // 高置信跳过（tech-plan-v2 差异#3）
    : await postFilter(env, reply, ctx5);          // 正则预检 → FILTER_MODEL
  if (verdict !== 'PASS')
    return fallback(env, L);                       // 拦截=兜底（记埋点: filter_blocked）

  // ── 7. 返回（前端契约）─────────────────────────
  return json({ reply, source: sourceLabel(top.metadata), fallback: false });
}
```

各环节要点：

| 环节 | 实现 | 失败路径 |
|------|------|----------|
| embedQuery | fetch 智谱 embeddings，10s AbortController 超时 | 失败→兜底（记 error 埋点），绝不 500 |
| KB.query | Vectorize 绑定调用，<50ms | 异常→兜底 |
| runHarness | prompts/harness-system-prompt.md 作 system；片段+问题作 user；`src/llm.js` 调智谱 chat/completions（CHAT_MODEL）；**temperature 0.2**；输出追加来源由后端拼（不靠模型自觉） | 超时 15s→兜底；空回复→兜底 |
| postFilter | ①正则预检（post-filter-prompt.md 的 4 条，引用原文豁免：strip `[KB-xx]` 标记后再匹配）②FILTER_MODEL 按 post-filter-prompt.md 输出 JSON {verdict, violations} ③解析失败按 FAIL（宁严勿松） | 任何异常→FAIL→兜底 |
| fallback | 双语固定话术（i18n 键已有 chat.fallback），带询盘 CTA；前端已渲染 | — |
| 埋点 | 全部异步 `ctx.waitUntil(insertD1(...))`，只存：{ts, lang, score, top_id, fallback:bool, filter:pass/blocked, duration_ms}——**不存消息全文** | 埋点失败不影响主流程 |

### 多轮对话（MVP 处理方式）

阶段一**无服务端会话**（无 KV 会话存储）。Harness 提示词是"单问单答"设计——检索基于当前问题，与上文无关。这是有意的：
- 80% 的 B2B 提问是独立事实查询，单轮足够
- 追问（"那它的重量呢？"）检索命中率下降 → 落兜底 → 工程师接——符合"宁严勿松"
- 阶段二再引入会话窗口（把最近 2 轮拼进检索 query），代码已预留 `message` 数组化的可能

## 5. 兜底与限流细节

```js
// workers/src/fallback.js —— 双语兜底（话术已在前端 i18n，后端也回，双保险）
const T = {
  en: "This specific information is not available in our product database. Please leave your WhatsApp or email; our engineer will send you verified data within one working day.",
  zh: "该信息暂未收录于产品数据库。请留下您的 WhatsApp 或邮箱，工程师将在一个工作日内为您提供经核实的资料。"
};
```

限流两层：
- **CHAT_RL binding**：20 次/时/IP，原子操作，挡单点脚本
- **日上限**：KV `COUNTERS:chat:<date>`，>5000 次/日全站兜底——挡被绕过 RL 的分布式刷量（无成本上限决策下的唯一硬闸）

## 6. 黄金集测试与阈值校准（上线 gate）

```json
// tests/golden-set.json —— 工程师独立写（不看书库转写稿）
[
  { "q": "What magnet grade do you use for drone motors?",
    "expected_kb_id": "KB-RM-002", "lang": "en" },
  { "q": "KC-4215 的额定电流是多少？",
    "expected_kb_id": "KB-MD-001", "lang": "zh" },
  ...50 题
]
```

```bash
# scripts/run-golden-set.mjs
# 对每题：embed→query→断言 expected_kb_id 出现在 top-5 且 top-1 score≥阈值
node scripts/run-golden-set.mjs --threshold-sweep 0.30,0.35,0.40,0.45,0.50
# 输出：
#   threshold=0.40 → hit_rate=84% (42/50)  ← 选满足 ≥80% 的最低阈值（保召回）
#   threshold=0.45 → hit_rate=72% ✗
#   → KB_THRESHOLD=0.40 写回 wrangler.toml
```

gate 规则（v2 已定）：**命中率 ≥80% 才放行 AI 入口**；未达标期间 `/api/chat` 直接返回 fallback，前端 AI 照常显示但实质走询盘——这就是"宽松 gate + 阈值校准"的合并实现，不需要改前端。

## 7. 本地开发与部署路径（无域名 MVP）

```bash
# 一次性
cd workers && npm install
npx wrangler login
npx wrangler vectorize create kcyd-kb --dimensions=2048 --metric=cosine
npx wrangler kv namespace create COUNTERS
npx wrangler secret put ZHIPU_API_KEY

# 素材入库
source ~/.claude/credentials.env && node ../scripts/build-kb.mjs
npx wrangler vectorize insert kcyd-kb --file=vectors.json

# 本地开发（miniflare 模拟 Vectorize/KV，LLM+embedding 走真实智谱 API）
npx wrangler dev          # http://localhost:8787
# 前端联调：python3 -m http.server 8765 + chat.js 的 RAG_ENDPOINT
#   改为绝对 http://localhost:8787/api/chat（加 CORS）

# MVP 部署（不用域名）
npx wrangler deploy       # https://kuchuang-yide.<你的子域>.workers.dev
# 前端仍可留在 GitHub Pages，chat.js RAG_ENDPOINT 指向 workers.dev 绝对地址（CORS 白名单）
```

CORS（index.js 统一处理）：`Access-Control-Allow-Origin` 只回 GitHub Pages 域和 localhost——workers.dev 部署即生效。

## 8. 测试清单（T2/T7/T8 的验收）

| 测试 | 类型 | 验证 |
|------|------|------|
| build-kb 解析/校验 | 单元 | 素材 verified=false 被拒；id 重复报错 |
| 管线各环节 | 单元 | mock llm.js/KB/RL，断言 fallback 分支、超时分支 |
| 正则预检 | 单元 | "efficiency of 91%" 拦截；"[KB-MD-001] ... 91% ..."（引用）豁免 |
| 黄金集 | 集成 | 真实 embedding+Vectorize，命中率报告 |
| 后置校验 FP | 集成 | 黄金集答案过校验，误拦 <5% |
| E2E 弱网 | 手动 | Chrome DevTools 3G 节流：提问→回答 ≤8s |
| 限流 | 集成 | 21 次/时触 429；日上限触全站兜底 |

## 9. 已知取舍（写明白，不藏着）

1. **无会话**：单轮问答。追问体验靠"递进引导"话术补偿（Harness 提示词已含）
2. **模型可换**：全栈智谱（glm-4.6 主力），llm.js 封装隔离——质量/成本不达标时只改 env 变量即可切任何 OpenAI 兼容模型
3. **阈值是数据驱动**：初值 0.42 是经验值，以黄金集 sweep 结果为准
4. **图片=兜底**：阶段一无视觉模型，带图提问引导询盘（工程师人肉看图回复，反而最可信）
5. **workers.dev 免费域**：MVP 够用；正式推广前按 tech-plan-v2 第 0 批迁自有域
