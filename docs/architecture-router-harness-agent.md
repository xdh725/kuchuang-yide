# Router / Harness / 受控 Agent 架构 — AI 导购防幻觉核心设计

版本：v1.0 ｜ 日期：2026-09-10 ｜ 状态：架构定稿，可直接交付开发

## 0. 前置共识

幻觉的根源不是模型"笨"，而是**权限越界**：
- 把本该走 Harness 强约束的问题，交给了 Agent 自主推理；或
- 把适合 Agent 的组合、联想、场景推演，强行卡死在知识库静态文本里

二者不是二选一，是**分层调度、条件路由**。

---

## 1. 术语定义

### 🧱 Harness（约束范式，"被缰绳拴住的 AI"）

**Harness = 检索优先 + 零新增生成 + 回答必须可溯源**（即强 RAG）

核心规则：
1. 用户提问后第一步：向量检索知识库
2. 相似度 ≥ 阈值（建议 0.75）才允许模型复述、润色、串联
3. 检索不到 / 相似度低 → 禁止自由补全、禁止猜测，固定兜底话术：
   > "This specific information is not available in our product database. Please leave your WhatsApp or email; our engineer will send you verified data."
4. **输出必须可溯源**：每条事实对应已上传素材，回答末尾附来源标签
   （如 `Source: Stator-winding spec sheet / Drone field-test footage`）
5. 无自主工具调用权限：唯一工作是转述库内材料 + 逐层引导下一个合理问题

> 一句话：**Harness 负责"陈述事实"。事实不能编。**

### 🚀 Agent（智能体范式，"带自主决策能力的 AI"）

**Agent = 给定工具白名单，AI 有权自己决定调用顺序、组合素材、多模态推理、模拟推演、场景适配。**

- 知识库是**素材库**，不是牢笼
- 可做：跨素材组合推演（磁钢资料 + 温升测试 + 工况描述 → 推演表现）、视觉识别客户上传图片 → 匹配近似型号、what-if 条件推演
- **不能**：编造不存在的电机参数。允许在真实素材之上做逻辑延伸、情景推演、类比、组合推理
- 约束是**工具白名单**，不是"只能抄原文"

> 一句话：**Agent 负责"基于事实做推理、做组合、做推演"。推演可以新，但推演用到的基础素材必须全部来自可信库。**

## 2. 核心区别对照表

| 维度 | Harness（缰绳约束） | Agent（自主智能体） |
|------|---------------------|---------------------|
| 首要目标 | 杜绝幻觉、100% 事实准确 | 增强交互深度、解决复合问题 |
| 触发前提 | 单条/少数知识库条目可答 | 复合型、条件式、带图、场景化、权衡类 |
| 素材来源 | 检索片段，严格忠于原文 | 多条素材重组、交叉引用、逻辑推演 |
| 生成权限 | 只转述、润色；禁止新增事实 | 允许逻辑延伸/情景模拟，基础参数禁止创造 |
| 幻觉风险 | 极低（库干净即可） | 中高；边界一松就滑向编造 |
| 能做什么 | 参数/材料/防护等级/测试/标准应用 | 工况匹配、负载变化推演、A/B 对比、高海拔取舍 |
| 不能做什么 | 多条件组合、开放推演、看图选型 | 凭空捏造新牌号磁钢、没测过的效率、不存在的型号 |
| 算力成本 | 低（向量检索 + 简短补全） | 高（多轮规划、多模态、多次检索） |

**关键**：Agent ≠ 没有约束；Harness ≠ 没有对话。约束是一条连续光谱。
- 开了 Agent 放飞 → 编造
- 全锁 Harness → 复杂问题全跳兜底，客户聊两句就走

---

## 3. 业务边界（路由规则，写进调度器）

### ✅ 强制路由至 Harness（防幻觉主防线，一条不能妥协）

1. **所有硬事实、硬参数查询**
   - "What's the rated current of model KC-4215?" / "What grade of silicon steel?" / "IP rating?" / "Temperature-class wire?"
   - 规则：有标准答案、唯一数值、固定物料牌号的问题一律 Harness。**不能估算、不能"大约/一般来说/通常是"。** 找不到 → 直接引导询盘
2. **工序、检测流程、标准定义查询**
   - "What tests before shipment?" / "How do you perform CCD visual inspection?" / "Dynamic balance tolerance?"
3. **直接索取规格书、证书、应用列表**
   - "Send me your datasheet for drone motors." / "List all your motors for AGV."
   - 只能调取已上传清单，**禁止 AI 自己"生成一份新清单"**（最高发幻觉：编造型号）

Harness 对话依然可以自然递进（合规示例）：
> "We use N35SH high-temperature resistant neodymium magnets. They can continuously work up to 150 °C. Would you like to view our short video showing magnet incoming inspection?"
> ——串起两条库内记录 + 给出下一个引导，零新增事实。

### ✅ 满足条件才放行受控 Agent（两个前提同时满足）

- **前提 1**：问题不是在查询单一固定参数
- **前提 2**：涉及【多条件组合、工况权衡、用户上传图片、跨素材对比、假设性场景推演】五类之一

典型放行样例（外贸客户高频）：

1. **组合工况**："My drone flies above 4000 m altitude. Will your 2808 motor work? What trade-offs?"
   - Agent：检索【2808 参数】【高海拔测试片段】【空气密度-效率备注】→ 推演趋势
   - ⚠️红线：不能编"在 4000 米效率 91%"这种没测过的精确数字；只能说 "Based on our ground test data, efficiency tends to drop at lower air density; exact figures require field validation."
2. **看图选型**（多模态）：客户上传现有电机/设备照片
   - Agent：视觉识别提取外形尺寸、轴径 → 检索最接近型号 → "suggestive match, not guaranteed. Final validation requires engineering review."
   - ⚠️重点：可提建议，不能下结论"完美匹配可直接替换"——幻觉高危区
3. **跨型号对比**："Compare motor A and B for robotic lawn-mowers."
   - Agent：拉取 A、B 完整记录，自主选择对割草机最重要的指标（持续扭矩、温升、防水）组织对比。每条数据必须来自知识库
4. **what-if 假设**："If I run this at 55V instead of 48V, what happens?"
   - Agent：基于库内电压-转速曲线推演趋势 + 提醒 "Outside rated specification, not covered by standard warranty. Lab testing is recommended."

### 🎯 划界口诀（给开发写注释）

```
查数字、查物料、查流程、查清单            → Harness
拼条件、做对比、猜工况、看图选型、做假设推演 → 受控 Agent
```

> Agent 是戴着镣铐跳舞：推理输入的原始事实必须全部来自知识库；输出只能是趋势、建议、权衡、可能性，**不能产出新的"权威参数"**。不受控的自由 Agent 对电机外贸是危险品，绝对不能上线。

---

## 4. 四层架构

```
┌─────────────────────────────────────────────────┐
│  顶层：Router 路由调度器（总闸门，规则+轻量分类模型） │
│   硬参数/物料/工序/清单 → Harness                  │
│   复合/对比/工况推演/带图 且不索要未知精确值 → Agent │
│   边界模糊、信心不足 → 保守降级 Harness（宁严勿松）  │
├──────────────────────────┬──────────────────────┤
│ 中层1：Harness 引擎       │ 中层2：受控 Agent 引擎 │
│ （强约束 RAG，默认通路）   │ （白名单工具+边界校验）│
│ 检索→匹配度校验→转述+递进  │ 规划→批量检索→推演     │
│ 匹配不足 → 询盘兜底        │ 结论带免责措辞         │
├──────────────────────────┴──────────────────────┤
│ 底层：统一知识库 + 多模态素材库                      │
│ （文字、参数表、图片、视频索引、CCD 检测实拍、老化记录）│
└─────────────────────────────────────────────────┘
                              │
              输出后置校验（后过滤器，最后保险）
              抓到库外型号/数值/材料牌号 → 拦截 → 转询盘
```

### 运行流程

1. 用户发送提问（可附带图片）
2. Router 第一道分类（规则 + 轻量分类模型）：
   - 命中【硬参数/物料/工序/清单】→ Harness
   - 命中【复合条件/对比/工况推演/带图】且未索要精确未知数值 → 受控 Agent
   - 边界模糊、识别信心不足 → **保守降级 Harness**
3. Harness 运行：检索 → 匹配度校验 → 转述 + 递进引导；匹配不足返回询盘兜底
4. Agent 运行（**三道关卡**）：
   - ① 规划："回答这个问题需要调取知识库哪几条素材？"
   - ② 批量检索收集基础事实；**禁止素材之外引入外部知识（禁止联网搜索！）**
   - ③ 推理、组合、推演、给出建议，每条推演结论后带免责措辞：
     > "This estimate is derived from existing test data. Actual performance depends on your exact installation and operating environment."
5. **后置校验**：Harness 和 Agent 的输出都跑幻觉校验规则——出现库中不存在的型号、数值、材料牌号 → 拦截输出，转询盘提示

## 5. Agent 禁语清单（写死在 Prompt，出现即判定幻觉风险拦截）

- "It reaches an efficiency of …%"（未入库的精确效率）
- "This motor will definitely work for your application."（打包票）
- "We also have model XXX…"（编造型号）
- "It is commonly known that BLDC motors…"（通用科普脱离产品）

允许句式：
- "Based on our test records, it tends to…"
- "One trade-off you may see is…"
- "We recommend consulting our engineers for confirmation."

## 6. 业务演进路线（三阶段）

**阶段一（当前基线）**：纯 Harness 上线
- 全部交互走强约束 RAG，核心材料、工序、应用场景、测试视频全录入
- 实现逐层递进对话；零幻觉风险
- 上线跑一段时间，**收集高频复杂问题清单** → 以后开放 Agent 的素材

**阶段二（升级核心）**：Router + 有限受控 Agent
- 基于真实客户提问定义放行条件；严格遵守边界；默认保守降级
- 简单事实 → Harness；复杂场景/对比/带图 → Agent
- **关闭 Agent 联网搜索**，素材只能来自私有库（开启全网搜索幻觉指数级上升）

**阶段三（长期闭环）**：持续迭代
- Agent 高质量推演中的高频"工况组合"→ 固化回知识库
- 下次同问题 Router 直接路由 Harness
- **凡是反复出现的复杂问题，慢慢"硬化"成知识库条目，从 Agent 领地迁回 Harness 领地**
- 健康闭环：Agent 做探索，Harness 沉淀成果。越跑越准，幻觉越少

## 7. 总结（给团队讲的一句话）

> **Harness 是安全底盘、导购基础骨架；Agent 是长出来的灵活触角。**
> 凡是"是什么"，交给 Harness 锁死；凡是"如果、假如、对比、在某某条件下可能会怎样"，才交给受控 Agent 推演。
> **缰绳不能解开，但触角可以伸展。**

与工厂数字化思路一脉相承：机器先严格按标准运行（Harness）；给定明确边界、给定参考数据后，才允许做高级智能判断（Agent）。

## 8. 实施配置清单（开发对照表）

| 组件 | 实现 | 提示词文件 |
|------|------|-----------|
| Router | 规则引擎 + 轻量分类（结构化输出 JSON） | `prompts/router-system-prompt.md` |
| Harness | RAG（阈值 ≥0.75）+ 转述 + 递进引导 | `prompts/harness-system-prompt.md` |
| 受控 Agent | 工具白名单（kb_search / image_analyze）+ 禁联网 | `prompts/agent-system-prompt.md` |
| 后置校验 | 库外实体检测（型号/参数/材料牌号正则 + LLM 校验） | `prompts/post-filter-prompt.md` |
