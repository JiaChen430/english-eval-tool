# English Eval 产品需求文档 (PRD)

## 1. 产品概述

### 1.1 产品定位
**English Eval** 是一款 AI 驱动的英文表达评估与训练工具，帮助中文母语者提升英文表达的地道性（naturalness），尤其是北美口语和商务表达。

### 1.2 核心价值
- **即时评估**：输入英文，立即获得 AI 评分和修改建议
- **场景适配**：支持口语闲聊、商务邮件、会议表达三种场景
- **练习闭环**：评估 → 练习 → 视频学习 → 错题记录
- **个性化学习**：基于用户错误历史，智能推荐复习内容

### 1.3 目标用户
- 中文母语者，想要提升英文表达的地道性
- 需要进行商务英文沟通的职场人士
- 准备海外生活的移民或留学生
- 5岁孩子妈妈 Claire（产品种子用户 🎯）

---

## 2. 功能架构

### 2.1 页面结构

| 页面 | 路径 | 功能描述 |
|------|------|----------|
| 评估首页 | `/` | 英文输入 + 场景选择 + AI 评估 |
| 练习页 | `/practice` | 错题练习 + 视频推荐 |
| 错题本 | `/notebook` | 历史错误记录 + 复习管理 |
| 重建表达 | `/rebuild` | 重新表达练习 |
| 复习 | `/review` | 艾宾浩斯遗忘曲线复习 |

### 2.2 核心功能模块

#### 2.2.1 英文评估模块
- **输入**：文本框输入英文（最多 5000 字符）
- **场景选择**：
  - 口语闲聊 (Casual) - 更口语化
  - 商务邮件 (Business) - 更正式专业
  - 会议表达 (Meeting) - 清晰逻辑
- **评估输出**：
  - 综合评分 (0-100)
  - 修正版本 (Corrected Text)
  - 错误列表 (Grammar/Vocabulary/Naturalness/Punctuation)
  - 每条错误的解释和建议

#### 2.2.2 练习模块
- **练习题生成**：基于错误自动生成填空题和选择题
- **视频推荐**：AI 生成 YouTube 搜索关键词，一键跳转学习
- **结果记录**：练习结果自动保存到错题本

#### 2.2.3 错题本模块
- **错误分类**：按类别（语法/词汇/地道性/标点）组织
- **复习状态**：标记已掌握/未掌握
- **搜索筛选**：按类别、时间搜索

#### 2.2.4 表达重建模块
- **同义改写**：提供多种表达方式
- **场景切换**：一键切换不同场景的表达

---

## 3. 技术架构

### 3.1 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端框架 | Next.js 15 (App Router) |
| 样式 | Tailwind CSS |
| AI 服务 | OpenRouter (Gemini 2.5 Flash Lite) |
| 视频搜索 | YouTube Data API v3 |
| 数据库 | Supabase (Phase 2) |
| 部署 | Vercel |

### 3.2 API 接口

#### 3.2.1 POST /api/evaluate
**功能**：评估英文表达

**请求参数**：
```json
{
  "text": "string",      // 用户输入的英文
  "scenario": "casual" | "business" | "meeting"  // 场景
}
```

**响应**：
```json
{
  "evaluation": {
    "score": 85,
    "correctedText": "...",
    "errors": [
      {
        "id": "err1",
        "category": "naturalness",
        "original": "Just letting you know",
        "corrected": "Just a quick note to let you know",
        "explanation": "..."
      }
    ]
  },
  "exercises": [...]
}
```

#### 3.2.2 POST /api/videos
**功能**：获取视频推荐

**请求参数**：
```json
{
  "error": "string",
  "corrected": "string",
  "explanation": "string"
}
```

**响应**：
```json
{
  "recommendations": [
    {
      "title": "🔍 professional email phrases",
      "channel": "YouTube Search",
      "url": "https://youtube.com/results?search_query=...",
      "reason": "..."
    }
  ]
}
```

### 3.3 数据模型

#### User
```typescript
interface User {
  id: string;
  nickname: string;
  created_at: string;
}
```

#### Evaluation
```typescript
interface Evaluation {
  id: string;
  user_id: string;
  original_text: string;
  corrected_text: string;
  score: number;
  scenario: 'casual' | 'business' | 'meeting';
  created_at: string;
}
```

#### Error
```typescript
interface Error {
  id: string;
  evaluation_id: string;
  category: 'grammar' | 'vocabulary' | 'naturalness' | 'punctuation';
  original: string;
  corrected: string;
  explanation: string;
}
```

#### Exercise
```typescript
interface Exercise {
  id: string;
  error_id: string;
  type: 'fill-in-blank' | 'multiple-choice';
  data: FillInBlankExercise | MultipleChoiceExercise;
  attempt_count: number;
  mastered: boolean;
}
```

---

## 4. 用户流程

### 4.1 核心用户流程

```
1. 用户输入英文
   ↓
2. 选择场景（口语/商务/会议）
   ↓
3. 点击"评估"
   ↓
4. 查看评分 + 错误列表 + 修正版本
   ↓
5. 进入练习页面
   ↓
6. 完成练习题
   ↓
7. 查看视频推荐（可选）
   ↓
8. 错误自动保存到错题本
```

### 4.2 复习流程

```
1. 进入错题本/复习页面
   ↓
2. 查看待复习的错误
   ↓
3. 尝试重新表达
   ↓
4. 对比正确答案
   ↓
5. 标记掌握状态
```

---

## 5. 场景评估标准

### 5.1 口语闲聊 (Casual)
- 鼓励缩写 (I'm, don't, can't)
- 鼓励口语表达 (gonna, wanna, kinda)
- 避免过度正式
- 示例："Just letting you know" ✓

### 5.2 商务邮件 (Business)
- 使用完整词汇 (cannot, not can't)
- 正式开场/结尾
- 清晰结构
- 示例："Just a quick note to let you know" ✓

### 5.3 会议表达 (Meeting)
- 完整句子
- 明确的观点
- 逻辑连接词
- 示例："I'd like to inform you that..." ✓

---

## 6. 迭代计划

### Phase 1 ✅ 已完成
- [x] 英文评估 API
- [x] 场景选择功能
- [x] 错误分类与修正
- [x] 练习题生成
- [x] 视频推荐（YouTube 搜索）
- [x] 错题本基础功能

### Phase 2 📋 待开发
- [ ] 用户认证系统
- [ ] Supabase 数据持久化
- [ ] 复习提醒功能
- [ ] 进度统计面板
- [ ] 表达重建增强

### Phase 3 🚀 规划中
- [ ] 语音输入
- [ ] AI 对话练习
- [ ] 社区分享
- [ ] 多语言支持

---

## 7. 成功指标

| 指标 | 目标 |
|------|------|
| 评估准确率 | > 90% |
| 用户评分 | > 4.5/5 |
| 日活跃用户 | > 100 |
| 7日留存 | > 30% |
| 平均练习完成率 | > 70% |

---

## 8. 竞争对手参考

- ** Grammarly ** - 语法检查为主，缺少年地性建议
- ** ELSA Speak ** - 语音为主，评估深度不足
- ** DeepL Write ** - 写作辅助缺练习闭环

**English Eval 差异化**：
- 专注北美地道表达
- 场景化评估
- 练习 + 视频学习闭环

---

## 9. 附录

### 9.1 环境变量
```env
OPENROUTER_API_KEY=    # AI 评估服务
YOUTUBE_API_KEY=       # 视频搜索
NEXT_PUBLIC_SUPABASE_URL=   # 数据库
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### 9.2 部署
- Vercel Production: https://english-eval.vercel.app
- GitHub: https://github.com/JiaChen430/english-eval-tool

---

*文档版本：v1.0*
*最后更新：2026-03-08*
*维护者：JamesBot / Claire*
