# English Eval - 英文表达训练工具

一个帮助提升英文口语和写作能力的智能评估工具。

## 功能特性

### Phase 1 MVP (当前版本)
- ✅ 文字输入英文表达
- ✅ AI智能评估（语法、用词、地道性）
- ✅ 显示修正版本 + 详细反馈
- ✅ 简洁易用的界面

### Phase 2 (计划中)
- 练习题生成
- 错题本系统
- 表达重建功能
- 历史记录持久化

## 技术栈

- **前端框架：** Next.js 15 (App Router)
- **样式：** Tailwind CSS
- **AI服务：** Claude 3.5 Sonnet (via OpenRouter)
- **部署：** Vercel
- **数据库：** Supabase (Phase 2)

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入你的 OpenRouter API Key：

```env
OPENROUTER_API_KEY=your_actual_api_key_here
```

### 3. 本地运行

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

### 4. 部署到 Vercel

1. 在 Vercel 导入项目
2. 添加环境变量 `OPENROUTER_API_KEY`
3. 部署

> ⚠️ **部署注意**: 因为 Vercel 权限限制，部署时需要将 commit author 改为你的 GitHub 账号：
> ```bash
> git commit --amend --author="JiaChen430 <jiachen430@gmail.com>" --no-edit
> git push --force origin main
> ```
> 然后运行 `npx vercel --prod`

## 使用说明

1. 在文本框输入你的英文表达
2. 点击"提交评估"
3. 查看AI提供的修正版本和详细反馈
4. 根据反馈改进你的表达

## 项目结构

```
english-eval/
├── app/
│   ├── api/
│   │   └── evaluate/
│   │       └── route.ts        # 评估API端点
│   ├── globals.css             # 全局样式
│   ├── layout.tsx              # 根布局
│   └── page.tsx                # 主页面
├── public/                     # 静态资源
├── .env.example                # 环境变量模板
├── next.config.ts              # Next.js配置
├── package.json                # 依赖配置
├── tailwind.config.ts          # Tailwind配置
└── tsconfig.json               # TypeScript配置
```

## 开发计划

- [x] Phase 1: 核心评估功能
- [ ] Phase 2: 练习系统
- [ ] Phase 3: 用户历史记录
- [ ] Phase 4: 语音输入支持

## License

Private - 个人使用
