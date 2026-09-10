# 视频编码规范 — 弱网调优（给视频剪辑/上传人员照做）

版本：v1.0 ｜ 适用：全站所有视频（概览视频、知识库片段、云参观、Today's snapshot）

## 铁律

> **海外弱网地区：流畅 > 清晰。**
> 只要不卡，客户会原谅画面有点模糊；但只要一直转圈缓冲，再高清都没用。

## 通用最佳参数表

| 参数 | 设置值 | 理由 |
|------|--------|------|
| 编码 | H.264 (AVC) | 兼容性全球最好，老旧手机也能播 |
| 分辨率 | 最多 720p；实时流优先 360p | 弱网下 720p 已经很吃力 |
| 码率 | 400–900 kbps（**不超过 1200**） | 高清是陷阱 |
| 帧率 | 12–15 fps | 工业场景不需要丝滑 60 帧，帧率减半带宽几乎砍半 |
| 格式 | MP4，分片 HLS | CDN 边下边播，无需全部加载完 |
| 音频 | AAC 64kbps，默认静音 | 需要再点开声音 |

## 分场景参数

### 1. 产品概览视频（product-explorer 首屏）
- 时长 45–90 秒，讲清：产品是什么、核心流程、关键性能
- 720p / 800–1200kbps / H.264 / **静音自动播放**
- 前端禁用进度条拖拽（防客户跳片段）

### 2. 知识库素材短视频
- 5–30 秒单点素材：磁钢来料检验、动平衡工序、CCD 检测实拍、老化房…
- 720p / 500–700kbps / 12–15fps / 无音轨（省码率）

### 3. 云参观预录视频（方案 A）
- 每机位一段：📦 来料仓库 ｜ 🧵 绕线车间 ｜ 🔍 视觉检测 ｜ 🔥 老化房 ｜ 📦 打包区
- 720p / 500–700kbps / H.264
- 每日更新 1–2 条实拍短视频进 "Today's workshop snapshot"

### 4. WebRTC 实时流（方案 B，可选上线）
| 参数 | 值 |
|------|-----|
| 分辨率 | 固定 640×360，最高不超 720p |
| 编码 | H.264（**不要 H.265**，海外旧浏览器硬解差） |
| 目标码率 | **350–550 kbps**（核心！） |
| 帧率 | 15 fps |
| 自适应 | 开启动态码率，差时自动降至 200kbps——宁糊不断流 |
| 音频 | 默认关闭，给 "Turn audio on" 按钮（车间噪音大 + 省带宽） |

**部署链路**：车间摄像头 → 边缘主机（WebRTC 推流）→ 海外边缘节点 → 浏览器。
**禁止**从国内服务器直接往外推（国际出口抖动丢包严重）。推荐 Cloudflare Stream / Ant Media Server。
**禁止** RTMP 直播（延迟高、带宽要求高）。

## 转码命令参考（ffmpeg）

```bash
# 预录视频转码（720p 低码弱网版）
ffmpeg -i input.mp4 -c:v libx264 -profile:v main -preset slow \
  -b:v 600k -maxrate 700k -bufsize 1400k -vf "scale=-2:720" \
  -r 15 -an -movflags +faststart output.mp4

# 更弱网兜底（360p 极低码）
ffmpeg -i input.mp4 -c:v libx264 -profile:v baseline -preset slow \
  -b:v 350k -maxrate 450k -bufsize 900k -vf "scale=-2:360" \
  -r 12 -an -movflags +faststart output-360p.mp4

# 带 64kbps 音轨版本（云参观可选）
ffmpeg -i input.mp4 -c:v libx264 -b:v 600k -maxrate 700k -bufsize 1400k \
  -vf "scale=-2:720" -r 15 -c:a aac -b:a 64k -movflags +faststart output-audio.mp4

# 切 HLS 分片（CDN 边下边播）
ffmpeg -i output.mp4 -c copy -start_number 0 -hls_time 10 \
  -hls_list_size 0 -f hls output.m3u8
```

## 上传检查清单

- [ ] 码率 ≤ 900kbps（实时流 ≤550）
- [ ] 分辨率 ≤ 720p
- [ ] 帧率 ≤ 15fps
- [ ] faststart 已开启（MP4 头部前置，秒开）
- [ ] 默认静音播放
- [ ] 已切 HLS 分片或走支持自适应的托管（Cloudflare Stream）
- [ ] 画面内容已审核（无人员隐私、半成品、无关杂物）
