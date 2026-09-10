# 设计规范（Design System）— KUCHUANG YIDE

版本：v1.0 ｜ 日期：2026-09-10 ｜ 阶段：页面设计 → 开发之间的契约文档
上一环：`docs/ux/wireframes.md`（结构）｜下一环：`assets/css/style.css`（实现）

> 定位：**精密工业（Precision-Industrial）**。深色工程界面语言，传递"制造能力与可验证性"，
> 对标 Siemens / Bosch Rexroth 工业线的克制专业，而非消费品牌的活泼。
> 硬约束：系统字体、零 webfont、零装饰图片、CSS 生成纹理，弱网 3G 首屏可用。

## 1. 色彩（Color）

### 表面（分层深色，像机加工钢材的层次）
| Token | 值 | 用途 |
|-------|-----|------|
| `--bg` | `#070b14` | 页面底色 |
| `--bg-2` | `#0b1220` | 输入框/嵌套面 |
| `--card` | `#0f1729` | 卡片底 |
| `--card-2` | `#131d33` | 卡片渐变上端 |

### 品牌与功能色
| Token | 值 | 对比度(于 --card) | 用途 |
|-------|-----|------|------|
| `--brand` | `#2f6df6` | 4.6:1 | 主品牌蓝：链接、CTA、选中态 |
| `--brand-deep` | `#0b1f4b` | — | 深层背景 |
| `--accent` | `#ff8a1e` | — | 能量橙：**仅**兜底消息、snapshot 提示、警示点缀。每屏 ≤ 1 处 |
| `--ok` | `#34d399` | — | 成功（thank-you） |

### 文字
| Token | 值 | 对比度 | 用途 |
|-------|-----|--------|------|
| `--ink` | `#eaf0fb` | 13.9:1 AA✓ | 正文/标题 |
| `--muted` | `#8ea0c0` | 6.9:1 AA✓ | 次要文字 |
| `--faint` | `#5a6a88` | 3.6:1 | 仅辅助小字（≥12px 非关键信息） |

### 线与阴影
- `--line` = `rgba(148,172,214,.14)`（默认描边）
- `--line-strong` = `rgba(148,172,214,.28)`（交互元素描边）
- 卡片阴影固定配方：`inset 顶部 1px 白 4% + 大范围深投影`（见 `--shadow-card`）
- 禁止纯黑 `#000` 阴影叠加超过 2 层

## 2. 字体排印（Typography）

- 字族：`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`（唯一，禁 webfont）
- 等宽字体仅用于数值/来源标签场景：`ui-monospace, SFMono-Regular, Menlo`

| 级别 | size | weight | letter-spacing | 用途 |
|------|------|--------|----------------|------|
| H1 hero | clamp(30–52px) | 800 | -0.015em | 首页主标 |
| H1 page | clamp(24–34px) | 800 | -0.01em | 各页标题 |
| H2 | 23px | 700 | -0.01em | 卡片标题 |
| H3 | 20px | 700 | -0.01em | 弹窗标题 |
| Body | 15px | 400 | 0.01em | 正文/聊天气泡 |
| Small | 13px | 400 | — | 辅助 |
| Label/Caps | 12px | 700 | 0.10–0.22em（全大写） | eyebrow、表单标签、header-note |

行高：正文 1.65；标题 1.14。来源标签 11px + letter-spacing 0.03em。

## 3. 间距与栅格（Spacing & Layout）

- 4px 基数：`4 / 8 / 12 / 16 / 24 / 32 / 40 / 64(88 尾部)`
- 容器：max-width **1020px**，左右 padding 24px
- 卡片内边距：桌面 36–40px，移动 24px
- 圆角：卡片 `--radius-lg: 20px`；按钮/输入 `12px`；气泡 `14px`（发送角 4px）；chip `999px`
- 页面节奏：hero 上 88px → 内容区 → footer 前 88px

## 4. 组件规范（Components）

### 4.1 按钮
| 变体 | 样式 | 使用 |
|------|------|------|
| Primary | 品牌蓝渐变(135deg) + 蓝色投影 | 每屏 ≤ 2 个主行动 |
| Ghost | 透明 + line-strong 描边 | 次级行动（Cancel、📎） |
| Accent | 橙渐变 | 仅预约 Live Tour |
尺寸：padding 12×20；radius 12；hover 抬升 1px + brightness 1.08；active 复位。

### 4.2 卡片（双入口/聊天壳/播放器）
- 背景：`linear-gradient(180deg, --card-2, --card)` + 1px `--line`
- hover：translateY(-4px) + 描边变 strong + 品牌光晕扩散（径向 200px 顶部角落，透明度 0→1）
- "machined 顶边"：hover 时顶部出现 1px 品牌蓝渐隐线（left 36px → right 36px）

### 4.3 聊天气泡
- bot：`--card` 85% 透明背景 + 普通描边，左下角 4px
- user：品牌蓝渐变 + 蓝投影，右下角 4px
- fallback（兜底）：左侧 3px 橙色实线 = 唯一允许的警示样式；必带内嵌「Leave contact」Ghost 按钮
- 来源标签：顶部虚线分隔 + 11px faint + "Source:" 前缀
- 入场动画 0.3s 上移 6px 淡入

### 4.4 表单（询盘弹窗）
- 遮罩：`rgba(4,7,14,.72)` + blur 6px；弹窗入场 0.3s（上移 14px + scale .98）
- 输入：`--bg-2` 底 + `--line-strong` 描边；聚焦品牌蓝描边 + 3px 18% 蓝色光环
- 标签：全大写 12px/700，letter-spacing 0.1em
- **固定 3 栏**（姓名/公司/联系方式）——不许加字段

### 4.5 语言切换器
- 胶囊形（999px）+ 🌐 + select；focus-within 时描边变品牌蓝

### 4.6 图标
- 仅系统 emoji（🤖🏭📦🧵🔍🔥📞📶✅），置于带描边的圆角方块容器（52px 卡片 / 30px logo）
- 禁图标库、禁 SVG sprite 外链（弱网零额外请求原则）

## 5. 动效（Motion）

| 动效 | 时长 | 缓动 | 触发 |
|------|------|------|------|
| 入场 rise | 0.55s | cubic-bezier(.22,1,.36,1) | 首屏元素，第二卡片延迟 0.08s |
| 卡片 hover | 0.35s | 同上 | 抬升 4px |
| 气泡 msg-in | 0.3s | 同上 | 每条消息 |
| 按钮反馈 | 0.2s | 同上 | hover/active |
| 弹窗 | 0.2–0.3s | ease | open |

铁律：**全部包裹在 `@media (prefers-reduced-motion: no-preference)`**；动画只做透明度+位移，禁旋转/缩放弹跳；单页同时运动的元素 ≤ 2。

## 6. 背景（工程纹理）

1. 双径向渐变光（右上品牌蓝 14%、左上橙 5%）固定附着
2. 56px 工程微网格：1px `rgba(148,172,214,.045)` 双向线条 + 顶部径向 mask 渐隐
3. 全部 CSS 生成，零图片请求

## 7. 无障碍（Accessibility）

- 对比度全部 AA（见色彩表；`--faint` 仅限非关键辅助字）
- 全局 `:focus-visible { outline: 2px solid --brand; offset 2px }`
- 选区色 `rgba(47,109,246,.35)`
- `<html lang>` 随语言切换同步；表单 label 显式关联

## 8. 响应式断点

| 断点 | 变化 |
|------|------|
| ≤560px | 卡片单列；header-note 隐藏；气泡 92% 宽；FAB 内缩 16px |
| 561–1020px | 自适应单列堆叠，栅格 auto-fit |
| >1020px | 标准桌面 |

## 9. 反模式（禁止清单）

- ❌ webfont / 图标字体 / 装饰图片 / 视频 poster 大图
- ❌ 每屏多于 1 处橙色
- ❌ 消费品式的多彩渐变、圆角 >20px、阴影彩虹
- ❌ 自动轮播 carousel、hero 视频带声音
- ❌ 增加导航项或页面（4 页锁定）
- ❌ 询盘表单加字段
- ❌ 无障碍外的纯装饰动画

## 10. 与实现的映射

`assets/css/style.css` 的 `:root` 即本规范 Token 的唯一实现源。改设计 = 先改本文档，再改 CSS Token，组件样式引用 Token 不写裸值。
