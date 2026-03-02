# 执行指南 - JamesBot 工作手册

最后更新：2026-02-28

---

## 核心原则

### 质量 + Token 优化

| 内容 | 存储位置 | 何时加载 |
|------|----------|----------|
| 全局规则（如何执行命令） | AGENTS.md | 每次 |
| 跨项目规则（技术偏好、工作流） | _shared.md | 每次 |
| 项目专属（milestone、待办、进展） | topic 文件 | 进入该 topic 时 |
| 详细文档（API 设计、技术细节） | docs/ | 按需加载 |

### 判断标准：什么值得记录？

在 checkpoint 时，问自己三个问题：
1. **这个信息会影响未来的决策吗？**
2. **这个信息会被反复引用吗？**
3. **如果删掉它，会不会导致困惑或错误？**

如果三个答案都是"否"，就不记录。

**值得记录的：**
- ✅ 核心架构决策（会影响后续开发）
- ✅ 技术栈选择（需要保持一致）
- ✅ 重要的"为什么"（帮助未来理解决策背景）
- ✅ 已确定的约束条件（影响方案设计）
- ✅ 里程碑/阶段性成果
- ✅ 待完成事项（清晰描述）

**不值得记录的：**
- ❌ 临时 troubleshooting（解决了就过去了）
- ❌ 流水账式的"今天做了什么"（没有决策价值）
- ❌ 过程性讨论（结论已经体现在决策中）
- ❌ 已经在代码/文档里的信息（避免重复）

---

## 每次对话开始时

### 在 Telegram Forum（topic 模式）

1. **从消息元数据获取 topic_id**
2. **查 topic-mapping.json → topic_name**
   ```
   memory/topic-mapping.json
   ```
3. **加载上下文（按优先级）：**
   ```
   1. AGENTS.md（全局规则）
   2. memory/topics/_shared.md（跨项目通用）
   3. memory/topics/[topic-name].md（项目专属）
   ```
4. **按需加载 docs/**：如果是架构/API/数据库讨论

### 在 Direct Chat

1. 加载 AGENTS.md
2. 加载 MEMORY.md
3. 加载 memory/YYYY-MM-DD.md（今天 + 昨天）
4. 不需要 topic 上下文

---

## /checkpoint 指令处理流程

### 场景判断

| 输入位置 | 执行内容 |
|----------|----------|
| 在某个 topic 里输入 `/checkpoint` | 总结**该 topic** 的阶段性成果，更新 `memory/topics/[topic-name].md` |
| 在 direct chat 输入 `/checkpoint` | 全局总结所有 topic 的进度，更新 `memory/checkpoint.md` |

### 执行步骤

#### Step 1: 识别当前上下文
- Telegram Forum → 获取 topic_id → 查 topic-mapping.json
- Direct chat → 全局 checkpoint

#### Step 2: 收集信息
回顾最近 10-20 轮对话，提取：
- ✅ 新的核心决策
- ✅ 已达成的里程碑
- ✅ 待完成的事项
- ❌ 临时 troubleshooting（跳过）
- ❌ 过程性讨论（只记结论）

#### Step 3: 执行更新

**单 topic checkpoint 格式：**
```markdown
## Checkpoint - {date}

### 阶段性成果
- {里程碑1}
- {里程碑2}

### 待完成
- [ ] {待办1}
- [ ] {待办2}

### 重要决策
- {决策描述}（如有）
```

**全局 checkpoint 格式：**
```markdown
# Checkpoint 全局视图 - {date}

## 各 Topic 进度

### english-eval
- 状态：上线运行中
- 最新：表达重建功能完成

### life-manager
- 状态：规划中

### agent-system
- 状态：...

---
_Last updated: {date}_
```

#### Step 4: 反馈
回复 Claire：
- 简要说明更新了什么
- 指出文档位置

### 关键原则
1. **不询问确认** — 直接执行
2. **精简优先** — 只记结论，不记过程
3. **覆盖式更新** — 保持当前状态清晰

---

## 项目文件结构

### Telegram Forum Topic
```
memory/
├── topic-mapping.json          # topic_id ↔ topic_name 映射
├── topics/
│   ├── _shared.md              # 跨项目通用规则
│   ├── english-eval.md         # 项目 A
│   ├── life-manager.md         # 项目 B
│   └── agent-system.md         # 项目 C
└── YYYY-MM-DD.md               # 每日日志
```

### 文件职责

| 文件 | 作用 |
|------|------|
| AGENTS.md | 全局规则（每次必加载） |
| _shared.md | 跨项目通用（技术偏好、工作流） |
| [topic].md | 项目专属（milestone、待办、进展） |
| YYYY-MM-DD.md | 每日对话记录 |

---

## 错误处理

### 如果 topic 文件不存在
说明是新 topic，创建模板：
```markdown
# {topic_name} - [项目简介]

## 项目简介
[待补充]

## 基本信息
- **状态：** 待启动

---

_记录开始_
```

### 如果引用的话题/文件不存在
告诉 Claire：
```
该文件不存在。是否需要创建？
```

---

## 质量检查清单

每次输出前，自检：
- [ ] 是否加载了正确的 topic 上下文？
- [ ] 输出是否与该 topic 的 milestone/待办一致？
- [ ] 是否避免了泄露其他 topic 的信息？
- [ ] 如果有冲突，是否明确指出？

---

**原则：该详细时详细，该简洁时简洁。记住：你不是在"节省token"，你是在"高效使用token"。**
