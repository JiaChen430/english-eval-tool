# english-eval - 英文口语反馈项目

## 项目简介
英文口语评估和反馈产品，帮助用户提高英文表达能力。

## 基本信息
- **项目负责人：** Claire
- **开发伙伴：** JamesBot
- **Topic创建：** 2024-12-28
- **状态：** Phase 1 上线运行中

## 技术栈
- **前端：** Next.js 15 (App Router) + TypeScript
- **样式：** Tailwind CSS
- **AI服务：** Gemini 2.5 Flash Lite via OpenRouter
- **部署：** Vercel
- **数据库：** localStorage（MVP阶段）

## 需求总结

### 核心痛点
- 听力阅读OK，但口语和写作弱
- 表达错误、语句不完整、词汇匮乏
- 越说越没自信

### 使用场景
- 和老师沟通
- 面试准备
- 处理生活琐事

### MVP功能流程
1. **文字输入**（先不做语音） ✅
2. **AI评估**（语法+用词+地道性） ✅
3. **修改版本+逐条解释** ✅
4. **生成练习题** ✅
5. **作答→低于70%→错题本** ✅
6. 错题本复习追踪 (暂缓)
7. **表达重建功能** ✅

---

## 评估标准（重要更新）

### 当前问题（2026-02-28）
系统只评语法正确性，但忽略了"自然度"和"北美口语习惯"

**举例说明：**
- 原文："For the payment **of** March"
- 系统改："For the payment **for** March"（语法对✅）
- 更自然北美说法："I'll **take care of** the March payment"（地道✅）

### 新的评估维度

| 维度 | 权重 | 说明 |
|------|------|------|
| 语法正确 | 基础分 | 语法、拼写、时态 |
| 词汇选择 | 加分 | 用词准确、恰当 |
| **自然度** | **重要** | 符合北美口语习惯、地道表达 |
| 整体流畅 | 加分 | 表达连贯、可理解 |

### 反馈示例格式

```
原文：That handling fee works for me. How about I call at the end of the month to make the next payment? For the payment of March, I will call the office today or tomorrow to pay it.

评分：85分
- 语法：✅ 正确
- 词汇：✅ 合适
- 自然度：⚠️ 可以更地道

更自然的北美表达：
That handling fee works for me. I'll call at the end of the month to make the next payment. I'll also call the office today or tomorrow to take care of the March payment.

改进点：
1. "How about I call..." → 直接用"I'll call..."更简洁
2. "For the payment of March" → "take care of the March payment"更地道
3. "pay it" → "take care of it"更口语化
```

### 待开发
- [ ] 更新评估prompt，增加自然度维度
- [ ] 反馈中区分"语法错误"和"可以更地道"
- [ ] 提供更地道的北美口语替代方案

---

## 开发记录

### 2026-02-27 - 成功部署上线！
**部署完成：**
- ✅ GitHub仓库：https://github.com/JiaChen430/english-eval-tool
- ✅ 线上地址：https://english-eval.vercel.app
- ✅ 环境变量已配置
- ✅ 构建成功，所有TypeScript错误已修复
- ✅ 移除Supabase依赖，完全使用localStorage
- ✅ 多用户昵称系统上线

**最终功能列表：**
1. ✅ 英文表达评估（Evaluate页面）
2. ✅ 练习题生成+作答（Practice页面）
3. ✅ 错题本（Notebook页面）
4. ✅ 错题复习（Review页面）
5. ✅ 表达重建（Rebuild页面）
6. ✅ 多用户支持

### 2026-02-27 - 表达重建功能完成
**功能流程：**
1. 输入中文 → 翻译隐藏
2. 强制用户先输入自己的英文版本
3. 提交后显示：用户版本、AI标准翻译、评分、问题分析、改进建议
4. 小循环：继续复述 → 评估 → 直到达到90分
5. 进步追踪：显示所有尝试的历史记录

---

_项目成功上线！🎉_
