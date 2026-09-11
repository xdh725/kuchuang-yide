# 视频素材占位目录

所有文件按 `docs/video-encoding-guide.md` 转码后放入（或直接传 R2 并替换为 CDN URL）：

| 文件 | 用途 | 规格 |
|------|------|------|
| `product-overview.mp4` | Product Explorer 首屏概览（45–90s，静音自动播放） | 720p / 800–1200kbps / H.264 / faststart |
| `tour-warehouse.mp4` | 📦 来料仓库 | 720p / 500–700kbps / 15fps / 无音轨 |
| `tour-winding.mp4` | 🧵 绕线车间 | 同上 |
| `tour-inspection.mp4` | 🔍 CCD 视觉检测工位 | 同上 |
| `tour-burnin.mp4` | 🔥 老化房 | 同上 |
| `tour-packing.mp4` | 📦 打包区 | 同上 |

上传后如改用 R2/CDN 绝对地址，同步更新 `product-explorer.html` 与 `assets/js/tour.js` 中的路径。
知识库短视频片段不入本目录，直接上传 R2 并在 `knowledge-base/` 条目的 media 字段挂链。
