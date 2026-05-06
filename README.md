# HSK 3.0 Learning Platform

一个基于 Next.js (App Router)、TypeScript 和 Tailwind CSS 的全栈 Web 应用，专为中文二语习得者的 HSK 3.0 学习而设计。

## 🚀 项目特性

- **完整词汇库**：支持 11000+ HSK 3.0 标准词汇，涵盖 HSK 1-9 所有等级
- **智能分词**：基于词汇字典的分词器，准确识别和分析中文文本
- **等级分析**：实时分析文本中的 HSK 等级分布和难度评估
- **单例词汇管理**：高效的单例模式服务，在启动时加载全部词汇数据

## 📋 项目结构

```
hsk-learning-platform/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── vocab/
│   │   │       └── route.ts          # 词汇查询 API 路由
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── page.tsx                  # 主页面
│   ├── hooks/
│   │   └── useVocab.ts               # 词汇 Hook 和工具函数
│   ├── lib/
│   │   └── vocab-manager.ts          # 词汇管理单例服务
│   ├── types/
│   │   └── vocab.ts                  # TypeScript 类型定义
│   └── middleware.ts
├── public/
│   └── hsk3.0_vocab.json             # HSK 词汇数据文件
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── README.md
```

## 🛠️ 安装和设置

### 前置要求
- Node.js 18+ 
- npm 或 yarn

### 安装依赖

```bash
cd hsk-learning-platform
npm install
```

### 已安装的依赖

- **Next.js 16.2.4**：React 框架
- **TypeScript**：类型安全
- **Tailwind CSS**：样式框架
- **ESLint**：代码检查
- **lucide-react**：图标库
- **shadcn-ui**：UI 组件库（可选）

## 📝 核心功能

### 1. 词汇管理器（Singleton Pattern）

**文件**: `src/lib/vocab-manager.ts`

```typescript
import VocabManager from '@/lib/vocab-manager';

const manager = VocabManager.getInstance();
await manager.initialize(vocabData);

// 检查单词等级
const level = manager.checkWordLevel('中文');  // 返回: 1

// 获取词汇完整信息
const entry = manager.getVocabEntry('学校');   // 返回: VocabEntry

// 获取指定等级的所有词汇
const hsk1Words = manager.getVocabByLevel(1);

// 统计各等级词汇数
const stats = manager.getLevelStats();

// 文本分词
const tokens = manager.tokenize('我是学生');    // 返回: ['我', '是', '学生']

// 文本分析
const analysis = manager.analyzeText('我在学校学中文');
```

### 2. 分词器

采用贪心匹配算法的简单分词器，基于词汇字典进行分词：

```typescript
// 自动对文本进行分词
const tokens = manager.tokenize('我在学校学中文');
// 结果: ['我', '在', '学校', '学', '中文']
```

### 3. API 路由

**GET `/api/vocab`** - 初始化词汇管理器

```bash
curl http://localhost:3000/api/vocab
```

响应示例：
```json
{
  "success": true,
  "message": "Vocabulary manager initialized successfully",
  "totalVocabulary": 11000,
  "levelStats": {
    "1": 150,
    "2": 300,
    ...
  }
}
```

**POST `/api/vocab`** - 查询词汇

请求体：
```json
{
  "word": "学校",
  "action": "check-level"
}
```

或

```json
{
  "word": "我在学校",
  "action": "tokenize"
}
```

### 4. React Hooks

**`useVocabInitialize()`** - 自动初始化词汇系统

```typescript
const vocabStatus = useVocabInitialize();

if (vocabStatus.loading) {
  return <div>正在加载...</div>;
}

if (vocabStatus.error) {
  return <div>错误: {vocabStatus.error}</div>;
}

// 访问统计信息
console.log(vocabStatus.stats);
```

**`checkWordLevel(word)`** - 检查词汇等级

```typescript
const level = await checkWordLevel('中文');
console.log(level);  // 1
```

**`getVocabEntry(word)`** - 获取词汇详细信息

```typescript
const entry = await getVocabEntry('学校');
console.log(entry);
// {
//   word: '学校',
//   level: 1,
//   pinyin: 'xuéxiào',
//   definition: '名词，表示学校'
// }
```

**`tokenizeText(text)`** - 对文本进行分词

```typescript
const tokens = await tokenizeText('我在学校学中文');
console.log(tokens);  // ['我', '在', '学校', '学', '中文']
```

## 💾 词汇数据格式

编辑 `public/hsk3.0_vocab.json` 文件来添加或更新词汇数据。

格式示例：

```json
[
  {
    "word": "我",
    "level": 1,
    "pinyin": "wǒ",
    "definition": "第一人称单数代词"
  },
  {
    "word": "学校",
    "level": 1,
    "pinyin": "xuéxiào",
    "definition": "名词，表示学校"
  }
]
```

### 必需字段
- `word`：中文词汇
- `level`：HSK 等级 (1-9)

### 可选字段
- `pinyin`：拼音
- `definition`：定义或解释
- `examples`：例句数组

## 🏃 开发和运行

### 开发模式

```bash
npm run dev
```

应用将运行在 `http://localhost:3000`

### 生产构建

```bash
npm run build
npm start
```

### 检查代码

```bash
npm run lint
```

## 📊 类型定义

查看 `src/types/vocab.ts` 了解完整的 TypeScript 类型定义：

- `VocabLevel`：HSK 等级类型 (1-9)
- `Vocab`：词汇条目接口
- `LevelStats`：等级统计接口
- `TextAnalysisResult`：文本分析结果接口
- `VocabQueryResult`：词汇查询结果接口

## 🔄 初始化流程

1. **应用启动** → 浏览器加载主页 (`page.tsx`)
2. **Hook 触发** → `useVocabInitialize()` 自动调用
3. **API 请求** → 向 `/api/vocab` 发送 GET 请求
4. **文件加载** → 从 `public/hsk3.0_vocab.json` 读取数据
5. **初始化管理器** → `VocabManager.initialize(vocabData)`
6. **分词器创建** → `SimpleTokenizer` 初始化
7. **UI 更新** → 显示初始化状态和统计信息

## 🎯 后续扩展建议

1. **数据库集成**：将词汇数据存储到 MongoDB 或 PostgreSQL
2. **用户系统**：添加用户认证和学习进度追踪
3. **拓展分词器**：集成更高级的分词库（如 segmentit）
4. **发音功能**：添加文字转语音功能
5. **练习模块**：创建词汇测验和练习题
6. **学习路径**：按等级推荐学习路径
7. **统计仪表板**：显示学习进度和成就

## 🚀 部署

可以部署到 Vercel、Netlify 或其他 Next.js 兼容的平台：

```bash
# Vercel 部署
npm i -g vercel
vercel
```

## 📄 许可证

MIT

## 👨‍💻 贡献

欢迎提交 Pull Requests 和 Issues！

---

**更新日期**: 2026年5月6日

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
