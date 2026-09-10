# 部署方案 — Cloudflare Pages + R2 + CDN

版本：v1.0 ｜ 原则：零服务器租金、全海外节点、弱网友好

## 架构总览

```
访客（海外弱网）
   │
   ▼ Cloudflare CDN（全球边缘节点，自动就近）
┌──────────────────────────────┐
│ Cloudflare Pages（纯静态站点）│  index.html / product-explorer.html / virtual-tour.html / thank-you.html
│   + assets/css, assets/js    │
├──────────────────────────────┤
│ Cloudflare R2（对象存储）     │  视频（HLS 分片）、图片、知识库附件
├──────────────────────────────┤
│ RAG 知识库 API（唯一动态依赖）│  火山方舟 / OpenAI 兼容 RAG 托管服务
│   Router → Harness / Agent   │  走自有海外函数或服务商边缘节点调用
└──────────────────────────────┘
询盘表单 → 邮件通知 + 飞书通知（可选 webhook）
```

## 红线（必须遵守）

1. **禁止**用国内云存储（阿里云 OSS 等）直接服务海外访客——国际出口延迟高、抖动大
2. **禁止**自建大模型推理服务器——只调用托管 RAG API
3. **禁止** Agent 联网搜索开放
4. 视频务必按 `video-encoding-guide.md` 转码后再上传

## 步骤 1：静态站点 → Cloudflare Pages

1. 把本仓库接入 Cloudflare Pages（Git 集成或 `wrangler pages deploy .`）
2. 构建命令：无（纯静态）；输出目录：`/`
3. 自定义域名绑定独立英文域名，开启全球加速
4. 缓存策略：HTML 短缓存，`assets/` 长缓存（文件名带 hash）

## 步骤 2：素材 → Cloudflare R2

```bash
# 安装 wrangler 后
wrangler r2 bucket create kcyd-media

# 上传视频/图片（按分类）
wrangler r2 object put kcyd-media/videos/overview.mp4 --file output.mp4
wrangler r2 object put kcyd-media/tour/winding.mp4 --file winding.mp4
```

- 对 R2 bucket 开启**公开读**或通过自定义域名 + CDN 暴露
- R2 出口流量免费，正适合视频点播
- 上传后验证：`curl -sL -o /dev/null -w "%{http_code} %{size_download}" "<文件URL>"`

## 步骤 3：RAG 知识库 API

- 选型：火山方舟知识库 / OpenAI Files+Retrieval / 自部署轻量 RAG（均需海外可达端点）
- 上传 `knowledge-base/` 中全部素材并打标签（原材料/工序/场景/效果）
- 配置检索阈值 ≥ 0.75（低于阈值走询盘兜底）
- 四个系统提示词（`prompts/`）配置到对应环节：
  - `router-system-prompt.md` → 调度分类
  - `harness-system-prompt.md` → 事实问答
  - `agent-system-prompt.md` → 受控推演
  - `post-filter-prompt.md` → 输出后置校验
- API Key 只放服务端（Cloudflare Pages Functions / Worker），**绝不写进前端 JS**

## 步骤 4：询盘表单

- 用 Cloudflare Pages Function 写一个 `/api/inquiry` 端点
- 收到三栏表单（名字/公司/邮箱或 WhatsApp）→ 发邮件 + 飞书 webhook
- 成功后跳 `thank-you.html`

## 步骤 5：上线验证

```bash
# 全站可达性
for p in index.html product-explorer.html virtual-tour.html thank-you.html; do
  curl -sL -o /dev/null -w "$p: %{http_code} %{time_total}s\n" "https://<域名>/$p"
done

# 视频首字节与下载速度（弱网模拟）
curl -sL -o /dev/null -w "TTFB: %{time_starttransfer}s  Speed: %{speed_download} B/s\n" \
  "https://<R2域名>/videos/overview.mp4"
```

判定：页面全部 200；视频 TTFB < 1s（海外节点）；按 600kbps 码率计算，下载速度应 ≥ 75KB/s 才能流畅播放。

## 成本估算（月）

| 项目 | 方案 | 成本 |
|------|------|------|
| 静态托管 | Cloudflare Pages | $0 |
| 视频/图片存储 | R2（10GB 内） | ~$0.15 存储，出口免费 |
| RAG API | 按问答量 | 弹性 |
| 实时流（阶段2可选） | Cloudflare Stream / Ant Media | 按需 |

## 上线顺序（对应阶段 1）

1. 静态首页部署 → 验证 200
2. 概览+素材视频转码上传 R2 → 验证 TTFB
3. 知识库导入 + 四提示词配置 → 抽测硬参数问答（应 100% 命中库内）
4. 云参观 5 机位视频上线 → 弱网设备实测
