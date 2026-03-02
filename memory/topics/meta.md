# Meta Topic - 方法论和工作流

## 2025-01-27

### Telegram Forum Groups机制发现
**问题：** Claire发现即使我在所有topics里，不@我就看不到消息

**测试结果：**
- 关闭bot Privacy Mode后仍然无法看到未@的消息
- 这是Telegram forum groups的特殊机制，与普通群不同
- 需要被@才能接收和响应

**决策：** 接受现状，使用topic memory系统补偿

---

### Topic Memory系统建立

**目标：** 不同topic使用不同模型，控制成本和效能

**方案选择：**
- ~~方案1: Topic级别配置（不支持）~~
- ~~方案2: Sub-agent per topic~~
- ✅ **方案3: 精简模式topic memory + 按需加载**

**规则确立：**
- 文件结构：`memory/topics/[topic-name].md`
- 记录模式：精简（只记重要决策、里程碑、关键context）
- 加载策略：用`memory_search`语义搜索，不全文读取
- 规则位置：写入`AGENTS.md`（全局生效）

**AGENTS.md vs MEMORY.md 明确：**
- `AGENTS.md` = 操作手册，所有场景适用
- `MEMORY.md` = 私人日记，仅main session加载（安全考虑）

**下一步：**
- ✅ Claire提供所有topics列表（5个）
- ✅ 创建对应的topic memory文件
- ✅ 开始记录各topic的关键内容

---

### Topic自动发现优化

**初始方案：** 每次@我都检查是否有新topic → 浪费性能

**Claire的insight：** 新topic不频繁，不需要实时检查

**最优方案：每日扫描一次**
- 在heartbeat时检查`lastTopicScan`
- 距上次扫描>24小时 → 执行topic扫描
- 发现新topic → 创建模板文件，记note提醒询问用途
- 追踪方式：`memory/heartbeat-state.json` 里的`knownTopics`数组

**当前已知topics：**
1. meta - 方法论和工作流讨论
2. english-eval - 英文口语反馈项目
3. life-manager - 生活管家系统
4. agent-system - AI Agent企业体系
5. general - 日常闲聊

**实施状态：** ✅ 规则已写入AGENTS.md，heartbeat-state.json已初始化
