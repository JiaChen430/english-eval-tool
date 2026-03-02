# AI项目管理方法论：质量与成本兼顾的实践指南

作者：Claire & JamesBot  
日期：2026-02-26

---

## 目录

1. [背景与动机](#背景与动机)
2. [核心理念](#核心理念)
3. [方案框架](#方案框架)
4. [技术实现](#技术实现)
5. [工作流程](#工作流程)
6. [注意事项与常见陷阱](#注意事项与常见陷阱)
7. [案例演示](#案例演示)
8. [附录：模板与工具](#附录模板与工具)

---

## 背景与动机

### 我们要解决什么问题？

在使用AI助手进行多项目协作时，面临两个核心挑战：

1. **上下文混乱**：不同项目的讨论混在一起，AI容易窜台
2. **成本失控**：每次对话都加载全部历史记录，token消耗巨大

### 常见的错误方案

❌ **方案A：不做任何管理**
- 结果：AI经常搞混项目，需要反复澄清
- 成本：高（重复澄清浪费token）

❌ **方案B：极端压缩上下文**
- 结果：AI缺少必要信息，输出质量下降
- 成本：低，但失去了AI的价值

❌ **方案C：过度工程化**
- 结果：复杂的自动化系统，维护成本高，效果不一定好
- 成本：开发成本高，实际运行不稳定

### 我们的目标

✅ **在保证质量的前提下，优化成本**

- 质量优先：AI需要足够的上下文来产生价值
- 成本意识：不浪费token在无用信息上
- 可持续：方案简单、可维护、可扩展

---

## 核心理念

### 1. 分层记忆法

把项目信息分为三层：

```
┌─────────────────────────────────────┐
│  短期记忆（热数据）                    │
│  - 最近10-20轮对话                    │
│  - 当前正在讨论的细节                  │
└─────────────────────────────────────┘
           ↓ 提炼
┌─────────────────────────────────────┐
│  导航层（FACTS.md）                   │
│  - 核心决策、技术栈、当前状态           │
│  - 300-500 tokens                   │
│  - 每次对话都加载                      │
└─────────────────────────────────────┘
           ↓ 链接到
┌─────────────────────────────────────┐
│  长期记忆（冷数据）                    │
│  - docs/下的详细文档                   │
│  - 按需加载                           │
└─────────────────────────────────────┘
```

**类比：** 就像一本书
- **FACTS.md** = 目录（快速了解全书结构）
- **docs/** = 各章节（需要时翻到对应页）
- **短期记忆** = 你正在读的那一页

### 2. 导航页 vs 详细文档

**FACTS.md（导航页）的作用：**
- 告诉AI"这个项目是什么样的"
- 提供快速参考
- 链接到详细文档

**docs/（详细文档）的作用：**
- 完整记录设计细节
- 按需加载，不是每次都读

**关键差异：**
```
❌ 把所有信息都塞进FACTS.md
   → 结果：FACTS.md变得冗长，每次都要加载大量token

✅ FACTS.md只保留"骨架"，details放在docs/
   → 结果：FACTS.md简洁，details按需加载
```

### 3. 覆盖式更新 vs 追加式堆积

**错误方式（追加式）：**
```markdown
## 核心决策
- [2026-02-20] 使用Java
- [2026-02-25] 改用Python
- [2026-02-26] 最终确定用Python
```
→ 结果：冗余信息越来越多

**正确方式（覆盖式）：**
```markdown
## 核心决策
- [2026-02-26] 使用Python
  原因：团队更熟悉，生态更适合快速迭代
  
## 已淘汰的想法
- ~~Java~~ (2026-02-26) 团队不熟悉，学习成本高
```
→ 结果：当前状态清晰，历史可追溯但不占用日常空间

### 4. 质量与成本的真实关系

**常见误解：**
> "减少token = 降低成本"

**实际情况：**
> "低效的token使用 = 浪费成本"

**例子：**

场景A（看似省钱，实际浪费）：
```
Claire: "数据库用什么？"
AI: "抱歉，上下文不足，能再说一下项目背景吗？"
Claire: "我们在做XX项目，需要..."（100 tokens）
AI: "建议用PostgreSQL"（50 tokens）
总成本：150 tokens，且体验差
```

场景B（看似费钱，实际高效）：
```
AI自动加载FACTS.md（300 tokens）
Claire: "数据库用什么？"
AI: "根据项目需求（JSONB支持、事务一致性），建议PostgreSQL"（80 tokens）
总成本：380 tokens，但一次到位
```

**结论：** 不要为了省token而牺牲效率。该用的上下文必须用。

---

## 方案框架

### 整体架构

```
Telegram Group (开启Topics功能)
    │
    ├─ Topic: 生活管家系统
    │   └─ OpenClaw → projects/life-manager/
    │
    ├─ Topic: 英文评估工具  
    │   └─ OpenClaw → projects/english-eval/
    │
    └─ Topic: AI Agent体系
        └─ OpenClaw → projects/agent-system/
```

### 文件结构

```
workspace/
├── projects/
│   ├── _meta/                    # 元项目（管理方法论本身）
│   │   ├── FACTS.md
│   │   └── docs/
│   │       ├── methodology.md    # 本文档
│   │       └── execution-guide.md
│   │
│   ├── life-manager/             # 具体项目
│   │   ├── FACTS.md              # 导航页
│   │   ├── docs/                 # 详细文档
│   │   │   ├── architecture.md
│   │   │   ├── api-spec.md
│   │   │   └── user-stories.md
│   │   └── .history/             # 备份
│   │       └── FACTS-20260226-143022.md
│   │
│   └── english-eval/
│       ├── FACTS.md
│       └── docs/
│
└── memory/                       # 日常记录
    └── 2026-02-26.md
```

### FACTS.md模板

```markdown
# {项目名} - 事实单

最后更新：{日期}

## 核心决策（不超过5条）
- [日期] 决策内容
  → 详见: [链接](docs/xxx.md) （如果有详细文档）

## 当前架构（不超过200字）
简要描述系统架构，点到为止

## 技术栈
- 语言：
- 框架：
- 数据库：
- 部署：

## 待办事项（不超过10条）
- [ ] 任务1
- [ ] 任务2

## 已淘汰的想法（不超过3条）
- ~~想法1~~ (日期) 原因

## 快速参考
- [文档1](docs/xxx.md)
- [文档2](docs/yyy.md)
```

### 逻辑约束机制

在每个项目的System Prompt中加入：

```
## 项目上下文
{从FACTS.md读取的内容}

## 约束规则
- 你的输出必须与[核心决策]保持一致
- 如果用户需求与已确定的架构冲突，你必须：
  1. 明确指出冲突点
  2. 询问是否需要修改FACTS.md
  3. 不要擅自偏离已确定的方案
```

---

## 技术实现

### Telegram Topics设置

1. 在Telegram Group中开启Topics功能
2. 为每个项目创建一个Topic
3. OpenClaw会自动识别topic_id

### 上下文加载策略

```python
# 伪代码
def load_context(topic_name, user_query):
    # 永远加载导航页
    facts = read_file(f"projects/{topic_name}/FACTS.md")
    
    # 智能判断需要加载哪些详细文档
    docs_to_load = []
    
    if "架构" in user_query or "设计" in user_query:
        docs_to_load.append("docs/architecture.md")
    
    if "API" in user_query:
        docs_to_load.append("docs/api-spec.md")
    
    if "数据库" in user_query or "schema" in user_query:
        docs_to_load.append("docs/db-schema.md")
    
    # 加载必要的文档
    detailed_docs = [read_file(f"projects/{topic_name}/{doc}") 
                     for doc in docs_to_load]
    
    return facts + "\n\n" + "\n\n".join(detailed_docs)
```

### /checkpoint机制

当用户发送`/checkpoint`时：

```bash
# 1. 备份当前版本
cp projects/{topic}/FACTS.md \
   projects/{topic}/.history/FACTS-$(date +%Y%m%d-%H%M%S).md

# 2. AI分析最近对话，提取关键信息

# 3. 生成更新建议
AI: "建议更新：
     - FACTS.md: 添加核心决策XXX
     - 新建: docs/api-design.md
     你确认吗？"

# 4. 用户确认后执行更新
```

---

## 工作流程

### 日常对话流程

```
1. Claire在某个Topic中发消息
   ↓
2. OpenClaw识别topic_id
   ↓
3. 加载FACTS.md（300-500 tokens）
   ↓
4. 根据问题内容，判断是否需要加载详细文档
   ↓
5. AI生成回复（基于充分的上下文）
   ↓
6. Claire继续对话或进行checkpoint
```

### Checkpoint流程

```
1. Claire发送 /checkpoint
   ↓
2. AI回顾最近10-20轮对话
   ↓
3. 提取关键信息：
   - 核心决策
   - 技术选型
   - 架构变更
   - 待办事项
   ↓
4. 分类：哪些进FACTS.md，哪些进docs/
   ↓
5. 展示更新建议（diff形式）
   ↓
6. Claire确认
   ↓
7. 执行：
   - 备份旧版本到.history/
   - 更新FACTS.md（覆盖式）
   - 创建/更新docs/文档
   ↓
8. 完成，通知Claire
```

### 新项目启动流程

```
1. 在Telegram创建新的Topic
   ↓
2. 第一次对话时，AI检测到FACTS.md不存在
   ↓
3. AI自动创建项目结构：
   projects/{topic}/
   ├── FACTS.md (使用模板)
   ├── docs/ (空)
   └── .history/ (空)
   ↓
4. 开始正常对话
   ↓
5. 第一次checkpoint时填充FACTS.md内容
```

---

## 注意事项与常见陷阱

### 陷阱1：过早优化

❌ **错误做法：**
一开始就想把所有自动化都做好（自动检测冲突、自动归档、自动压缩...）

✅ **正确做法：**
先跑起来，手动checkpoint，发现真实问题后再优化

**原因：** 你不知道哪些问题是真实的，哪些是想象的。过早优化会浪费时间在不重要的问题上。

### 陷阱2：为了省钱而牺牲质量

❌ **错误做法：**
设置严格的token上限，导致FACTS.md写不清楚

✅ **正确做法：**
FACTS.md想写多长就写多长，但保持高信息密度（每句话都是核心事实）

**原因：** 不清晰的FACTS.md会导致后续对话反复澄清，总成本反而更高。

### 陷阱3：把FACTS.md当成日记

❌ **错误做法：**
```markdown
## 讨论记录
- 2026-02-20: 今天讨论了数据库选型，考虑了MySQL和PostgreSQL...
- 2026-02-21: 继续讨论数据库，James提到了JSONB...
- 2026-02-26: 最终决定用PostgreSQL
```

✅ **正确做法：**
```markdown
## 核心决策
- [2026-02-26] 使用PostgreSQL
  原因：需要JSONB支持和事务一致性
  → 详细讨论见: docs/db-decision.md
```

**原因：** FACTS.md是"当前状态"，不是"历史日记"。详细的讨论过程放在docs/里。

### 陷阱4：过度分层

❌ **错误做法：**
创建过多的文档层级：
```
docs/
├── architecture/
│   ├── overview/
│   │   ├── high-level.md
│   │   └── detailed.md
│   └── components/
│       ├── backend/
│       └── frontend/
```

✅ **正确做法：**
保持简单：
```
docs/
├── architecture.md    # 包含overview和组件说明
├── api-spec.md
└── db-schema.md
```

**原因：** 太多层级会增加维护成本，也让AI难以定位信息。

### 陷阱5：忘记备份

❌ **错误做法：**
直接覆盖FACTS.md，没有备份

✅ **正确做法：**
每次更新前自动备份到.history/

**原因：** 有时候新决策是错的，需要回退。没有备份就无法恢复。

### 陷阱6：黑名单思维

❌ **错误做法：**
列一个长长的"禁止清单"：
- 禁止使用MySQL
- 禁止使用中文
- 禁止使用REST API
- ...

✅ **正确做法：**
用正向约束：
- 技术栈：PostgreSQL
- 输出语言：英文
- API风格：GraphQL

**原因：** 黑名单永远列不完，而且容易过度约束。白名单更清晰、更可维护。

---

## 案例演示

### 案例：生活管家系统项目

#### 第1天：项目启动

**对话：**
```
Claire: 我想做一个生活管家系统，能自动帮我下单、管理日程。

JamesBot: 好，让我们先明确几个核心问题：
1. 主要场景是什么？（买菜？订餐？日程提醒？）
2. 数据存哪？（本地？云端？）
3. 用什么技术栈？

Claire: 主要是自动买菜和订餐。数据放云端，技术栈你推荐吧。

JamesBot: 基于你的需求，我建议：
- 后端：Python + FastAPI（快速开发，异步支持好）
- 数据库：PostgreSQL（关系型 + JSONB灵活性）
- 部署：Docker + Railway（简单，适合个人项目）

你觉得如何？

Claire: OK，就这样。/checkpoint
```

**Checkpoint后生成的FACTS.md：**
```markdown
# 生活管家系统 - 事实单

最后更新：2026-02-26

## 核心决策
- [2026-02-26] 主要功能：自动买菜和订餐
- [2026-02-26] 数据存储：云端（PostgreSQL）

## 当前架构
用户通过Telegram交互 → 后端API处理逻辑 → 调用第三方平台API（如Instacart、Uber Eats）→ 存储订单记录到数据库

## 技术栈
- 后端：Python 3.11 + FastAPI
- 数据库：PostgreSQL 15
- 部署：Docker + Railway
- 交互：Telegram Bot

## 待办事项
- [ ] 设计数据库schema
- [ ] 调研第三方平台API（Instacart、Uber Eats）
- [ ] 实现Telegram Bot基础框架

## 当前状态
- 进度：需求分析阶段
- 下一里程碑：完成技术调研（预计3月5日）
```

#### 第5天：架构设计

**对话：**
```
Claire: 数据库schema怎么设计？

JamesBot: [加载FACTS.md + 准备创建docs/db-schema.md]
         我建议这几个表：
         1. users - 用户信息
         2. orders - 订单记录
         3. items - 商品清单
         4. schedules - 定时任务
         
         详细设计我写到文档里，/checkpoint?

Claire: OK
```

**Checkpoint后：**

FACTS.md更新：
```markdown
## 待办事项
- [x] 设计数据库schema
- [ ] 调研第三方平台API
- [ ] 实现Telegram Bot基础框架

## 快速参考
- [数据库设计](docs/db-schema.md)
```

新建docs/db-schema.md：
```markdown
# 数据库Schema设计

创建日期：2026-03-01

## 概述
生活管家系统的数据库设计，包含用户、订单、商品、定时任务四个核心表。

## 表结构

### users
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| telegram_id | bigint | Telegram用户ID |
| preferences | jsonb | 用户偏好设置 |
| created_at | timestamp | 创建时间 |

### orders
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| user_id | uuid | 外键 → users.id |
| platform | varchar | 平台（instacart/ubereats） |
| status | varchar | 状态 |
| items | jsonb | 订单内容 |
| created_at | timestamp | 创建时间 |

（... 详细内容 ...）

## 索引策略
- users: telegram_id (unique)
- orders: user_id, created_at
- ...

## 相关文档
- [FACTS.md](../FACTS.md)
```

#### 第10天：技术栈变更

**对话：**
```
Claire: 我发现Railway太贵了，能不能改用自己的VPS？

JamesBot: [检测到与FACTS.md冲突]
         注意：FACTS.md中当前确定的部署方案是Railway。
         
         改用VPS是可以的，但需要：
         1. 自己管理Docker
         2. 配置Nginx反向代理
         3. 处理SSL证书
         
         复杂度会增加，但成本确实能省。你确定要改吗？

Claire: 确定，我有VPS。

JamesBot: OK，那我们/checkpoint，更新技术栈。

Claire: /checkpoint
```

**Checkpoint后：**

FACTS.md更新：
```markdown
## 核心决策
- [2026-02-26] 主要功能：自动买菜和订餐
- [2026-02-26] 数据存储：云端（PostgreSQL）
- [2026-03-10] 部署方式：自有VPS + Docker + Nginx

## 技术栈
- 后端：Python 3.11 + FastAPI
- 数据库：PostgreSQL 15
- 部署：Docker + Nginx on VPS（不再使用Railway）
- 交互：Telegram Bot

## 已淘汰的想法
- ~~Railway部署~~ (2026-03-10) 成本太高，改用自有VPS
```

.history/备份：
```
.history/
└── FACTS-20260310-152033.md  # 保留了Railway的版本
```

---

## 附录：模板与工具

### A. FACTS.md完整模板

```markdown
# {项目名} - 事实单

最后更新：{YYYY-MM-DD}

## 核心决策（不超过5条）
- [YYYY-MM-DD] 决策描述
  原因/背景（可选）
  → 详见: [链接](docs/xxx.md) （如果有详细文档）

## 当前架构（不超过200字）
简要描述系统架构，用1-2段话说清楚核心流程。

## 技术栈
- 语言：
- 框架：
- 数据库：
- 部署：
- 其他：

## 待办事项（不超过10条）
- [ ] 任务1（预计完成日期，可选）
- [ ] 任务2
- [x] 已完成的任务（保留最近完成的3-5条）

## 当前状态
- 进度：（需求分析/开发中/测试/已上线）
- 下一里程碑：描述 + 日期

## 已淘汰的想法（不超过3条）
- ~~想法1~~ (YYYY-MM-DD) 原因

## 快速参考
- [文档1](docs/xxx.md) - 简短说明
- [文档2](docs/yyy.md) - 简短说明
```

### B. 详细文档模板

```markdown
# {文档标题}

创建日期：{YYYY-MM-DD}  
最后更新：{YYYY-MM-DD}

## 概述
用2-3句话说明这个文档的目的和范围。

## {主要内容Section 1}
...

## {主要内容Section 2}
...

## 相关文档
- [FACTS.md](../FACTS.md)
- [其他相关文档](./other.md)

## 变更历史
- {YYYY-MM-DD}: 创建文档
- {YYYY-MM-DD}: 重大变更描述
```

### C. Checkpoint指令提示词

```
/checkpoint

[AI会执行以下步骤]
1. 备份当前FACTS.md到.history/
2. 分析最近对话，提取关键信息
3. 建议更新方案（显示diff）
4. 等待确认
5. 执行更新
```

### D. 项目初始化Checklist

新项目启动时的检查清单：

```markdown
## 项目初始化 Checklist

- [ ] 在Telegram创建Topic
- [ ] 第一次对话，明确项目目标
- [ ] 确定技术栈
- [ ] 创建FACTS.md（第一次checkpoint）
- [ ] 创建docs/文件夹
- [ ] 创建.history/文件夹
- [ ] 在memory/中记录项目启动日期
```

---

## 总结

这套方法论的核心是：

1. **分层存储** - 导航页（FACTS.md）+ 详细文档（docs/）
2. **按需加载** - 不是每次都加载所有文档
3. **覆盖更新** - 保持当前状态清晰，历史可追溯
4. **质量优先** - 不为省token而牺牲清晰度
5. **手动触发** - 用/checkpoint主动归档，不过度自动化

**记住：** 好的项目管理不是"省钱"，而是"高效用钱"。该详细的时候详细，该简洁的时候简洁。

---

**下一步：**
- 创建第一个实际项目（生活管家系统）
- 跑2周，验证方案
- 根据实际问题迭代优化

祝我们合作愉快！🐷

Claire & JamesBot  
2026-02-26
