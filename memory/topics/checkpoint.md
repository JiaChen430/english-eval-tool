# Checkpoint - 2025-01-27

## Topic 映射表（已建立）

| Topic ID | Topic名称 | 用途 |
|----------|-----------|------|
| #2 | meta | 方法论和工作流讨论 |
| 待确认 | english-eval | 英文口语反馈项目 |
| 待确认 | life-manager | 生活管家系统 |
| 待确认 | agent-system | AI Agent企业体系 |
| 待确认 | general | 日常闲聊 |

---

## 阶段性成果

### 1. Telegram Forum Groups机制
- ✅ 发现并验证了Telegram forum的隐私模式限制
- ✅ 确认需要@才能看到消息（这是设计如此，非bug）
- ✅ 用topic memory系统补偿信息孤岛问题

### 2. Topic Memory系统
- ✅ 建立文件结构：`memory/topics/[topic-name].md`
- ✅ 制定精简记录规则（只记重要决策、里程碑、关键context）
- ✅ 实现按需加载（用memory_search语义搜索）
- ✅ 规则写入AGENTS.md全局生效

### 3. Topic自动发现
- ✅ 每日扫描一次机制（heartbeat时执行）
- ✅ 用heartbeat-state.json追踪已知topics
- ✅ 新topic自动创建模板文件

---

## 方案总结

**核心思路：** Telegram Forum Groups无法全局接收消息 → 用topic memory + 语义搜索补偿

**关键决策：**
1. 接受Telegram的限制，不强行对抗
2. 用AGENTS.md存全局规则（所有场景适用）
3. 用MEMORY.md存私人信息（仅main session，安全）
4. Topic memory用精简模式，成本可控

---

## 待完成

- [ ] 从Claire获取准确的topic ID对应关系
- [ ] 在各topic首次讨论时创建详细memory文件

---

## Checkpoint命令使用说明

**触发方式：** 在任意topic里输入 `/checkpoint @JamesBot`

**沉淀内容：**
- 当前topic的关键进展
- 方案和决策记录
- 达到的阶段性结果
- 待完成事项

**输出位置：** `memory/topics/checkpoint.md`

---
