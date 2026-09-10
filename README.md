# 酷创易德 KUCHUANG YIDE — 高性能无刷电机外贸官网

> High-Performance BLDC Motors · AI Product Explorer · Virtual Factory Tour

面向海外 B 端采购商的轻量级外贸网站。**不做商城、会员、资讯，死磕两大核心**：AI 交互式产品导购 + 低码率远程工厂云参观。适配东南亚/中东/南美/非洲等弱网地区。

## 两大核心功能

### 🤖 Explore Product — AI 对话式产品导购
客户像聊天一样提问，系统一层一层带出参数、材料、工序、应用案例。不是通用聊天机器人，是**基于酷创易德自有知识库的受控问答**：

```
用户提问
   │
   ▼
Router 调度器（总闸门）
   ├─ 硬参数/物料/工序/清单查询 ──► Harness（强约束 RAG，只转述不新增）
   ├─ 组合工况/对比/看图选型/假设推演 ──► 受控 Agent（基于库内素材做推演，禁止联网）
   └─ 边界模糊 ──► 保守降级 Harness（宁严勿松）
   │
   ▼
后置校验（拦截编造型号/参数/材料牌号 → 转询盘兜底）
```

### 🏭 Virtual Factory Tour — 低带宽云参观
预录分段视频（来料仓库/绕线车间/CCD 视觉检测/老化房/打包区），一键点播。360–720p、350–900kbps、12–15fps，专为弱网调优。可选升级：WebRTC 实时流、人工预约连线。

## 页面（共 4 个，极简）

| 页面 | 文件 | 内容 |
|------|------|------|
| 首页 | `index.html` | 两大入口卡片 + 页脚联系方式，无其他导航 |
| 产品导览 | `product-explorer.html` | 顶部静音自动播放概览视频 + 聊天窗口 + 询盘按钮 |
| 云参观 | `virtual-tour.html` | 场景按钮 + 低码视频 + 预约人工连线引导 |
| 感谢页 | `thank-you.html` | 提交询盘后跳转 |

## 文档导航

- [需求规格](docs/requirements.md)
- [Router / Harness / Agent 架构（防幻觉核心）](docs/architecture-router-harness-agent.md)
- [视频编码规范（弱网调优）](docs/video-encoding-guide.md)
- [部署方案（Cloudflare Pages + R2）](docs/deployment.md)
- [系统提示词（英文，可直接配置）](prompts/)

## 落地三阶段

1. **阶段一**：纯 Harness 上线，全部材料入库，零幻觉风险；收集高频复杂问题
2. **阶段二**：加 Router + 受控 Agent（关闭联网），复杂场景问题放行
3. **阶段三**：高频复杂问题固化回知识库，从 Agent 领地迁回 Harness 领地（闭环迭代）

## 技术栈

纯静态 HTML/CSS/JS（无框架、无构建）+ Cloudflare Pages 零服务器部署 + RAG 知识库 API（火山方舟 / OpenAI 兼容接口）+ Cloudflare R2 海外对象存储。

## License

私有项目，酷创易德所有。
