# 第三阶段：文本重写闭环修正工作流 - 集成指南

## 📚 概览

本阶段实现了 HSK 学习平台的第三个核心模块：**文本重写闭环修正工作流**。

这是一个智能的"生成-评估者"系统，可以自动检测超纲词汇并使用 LLM 进行智能替换。

## 🎯 核心功能

### 1. **智能词汇替换**
- 输入：包含超纲词高亮标记的文本 + 目标 HSK 级别
- 处理：使用 LLM 将超纲词替换为更简单的基础词汇
- 输出：修改后的文本 + 修正过程统计

### 2. **自动校验循环**
- 修改后自动检测残留的超纲词
- 如有超纲词，重复修正流程
- 最多 3 次迭代，确保效率

### 3. **完整反馈**
```json
{
  "rewrittenText": "修改后的文本",
  "iterations": 2,
  "hasOutOfLevelWords": false,
  "message": "成功修正所有超纲词 (第 2 次迭代)"
}
```

## 📦 已实现的文件

### 后端代码

1. **[src/app/api/rewrite/route.ts](src/app/api/rewrite/route.ts)** - 主要 API 接口
   - POST /api/rewrite 端点
   - 参数验证
   - VocabManager 集成
   - LLM API 调用
   - 闭环修正逻辑
   - 完整日志记录

### 测试文件

2. **[scripts/test-rewrite.js](scripts/test-rewrite.js)** - 完整工作流演示
   - 3 个演示用例
   - 模拟 LLM 调用
   - 循环修正展示
   - 详细的输出日志

### 配置文件

3. **[.env.local.example](.env.local.example)** - 环境变量模板
   - OPENAI_API_KEY 配置
   - 其他可选配置

### 文档

4. **[API_REWRITE_GUIDE.md](API_REWRITE_GUIDE.md)** - 完整 API 文档
   - API 端点说明
   - 工作流程图
   - 使用示例
   - 错误处理
   - 性能考虑

## 🔧 安装与配置

### 1. 安装依赖

```bash
npm install openai
```

### 2. 配置环境变量

复制 `.env.local.example` 为 `.env.local`：

```bash
cp .env.local.example .env.local
```

编辑 `.env.local` 添加您的 API Key：

```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx
```

### 3. 验证安装

运行演示脚本：

```bash
node scripts/test-rewrite.js
```

## 📡 API 使用示例

### 基本请求

```bash
curl -X POST http://localhost:3000/api/rewrite \
  -H "Content-Type: application/json" \
  -d '{
    "highlightedText": "我非常喜欢学习**高级**的中文**课程**。",
    "targetLevel": 3
  }'
```

### JavaScript 集成

```javascript
async function rewriteText(highlightedText, targetLevel) {
  const response = await fetch('/api/rewrite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ highlightedText, targetLevel })
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('✅ 修改后文本:', result.rewrittenText);
    console.log('迭代次数:', result.iterations);
    
    if (result.hasOutOfLevelWords) {
      console.warn('⚠️ 残留超纲词:', result.outOfLevelWords);
    }
  }
  
  return result;
}
```

## 🔄 工作流程详解

### 输入处理
```
输入: { highlightedText, targetLevel }
  └─> 验证参数
      └─> 移除高亮标记获取原始文本
```

### 迭代循环 (最多 3 次)
```
第 N 次迭代:
  1. 提取超纲词 (使用 VocabManager)
  2. 检查是否有超纲词
     ├─ 无 → 循环结束 ✓
     └─ 有 → 继续
  3. 高亮超纲词 (** **)
  4. 组装 Prompt
  5. 调用 LLM API
  6. 获取修改后文本
  7. 回到步骤 1 (如果未达到最大迭代次数)
```

### 输出返回
```json
{
  "success": true,
  "originalText": "原始文本",
  "rewrittenText": "修改后的文本",
  "iterations": 2,
  "maxIterations": 3,
  "hasOutOfLevelWords": false,
  "message": "成功修正所有超纲词 (第 2 次迭代)"
}
```

## 📊 测试结果示例

运行 `node scripts/test-rewrite.js` 的输出示例：

```
📍 第 1 次迭代
───────────────────────────
发现超纲词: 现象, 社会, 产生
高亮文本: 这个**现象**对**社会****产生**了影响。

🤖 [LLM 调用]
   输入: 这个**现象**对**社会****产生**了影响。
   输出: 这个事情对生活有了影响。

📍 第 2 次迭代
───────────────────────────
✓ 没有发现超纲词，循环终止

📊 修正结果
──────────
修改后文本: 这个事情对生活有了影响。
迭代次数: 2/3
是否仍有超纲词: ✅ 否
✅ 成功修正所有超纲词
```

## 🔗 集成到学习平台

### 完整工作流

```
用户输入文本
  ↓
Step 1: 调用 /api/analyze
  ├─ 获取分词结果
  ├─ 检测超纲词
  └─ 生成高亮文本
  ↓
Step 2: 前端展示分析结果
  ├─ 显示分词数组
  ├─ 突出超纲词警告
  └─ 提供修改按钮
  ↓
Step 3: 用户点击"智能修改"
  ├─ 收集高亮文本
  └─ 提交到 /api/rewrite
  ↓
Step 4: 调用 /api/rewrite (后端处理)
  ├─ LLM 智能替换 (最多 3 次迭代)
  └─ 返回修改结果
  ↓
Step 5: 前端展示修改结果
  ├─ 显示修改前后对比
  ├─ 显示迭代次数统计
  └─ 提供接受/拒绝选项
```

### 前端集成示例

```jsx
import { useState } from 'react';

export default function TextAnalyzerWithRewriter() {
  const [text, setText] = useState('');
  const [level, setLevel] = useState(3);
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [rewriteResult, setRewriteResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Step 1: 分析文本
  const handleAnalyze = async () => {
    setLoading(true);
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLevel: level })
    });
    const data = await response.json();
    setAnalyzeResult(data);
    setLoading(false);
  };

  // Step 2: 重写文本（修正超纲词）
  const handleRewrite = async () => {
    if (!analyzeResult) return;
    
    setLoading(true);
    const response = await fetch('/api/rewrite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        highlightedText: analyzeResult.highlightedText,
        targetLevel: level
      })
    });
    const data = await response.json();
    setRewriteResult(data);
    setLoading(false);
  };

  return (
    <div className="container">
      <h1>HSK 文本智能分析与修正</h1>
      
      {/* 输入区域 */}
      <div className="input-section">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="输入要分析的文本..."
        />
        <input
          type="number"
          min="1"
          max="9"
          value={level}
          onChange={(e) => setLevel(parseInt(e.target.value))}
        />
        <button onClick={handleAnalyze} disabled={loading}>
          分析
        </button>
      </div>

      {/* 分析结果 */}
      {analyzeResult && (
        <div className="analysis-section">
          <h2>分析结果</h2>
          <p>超纲词数: {analyzeResult.outOfLevelCount}</p>
          <p>高亮文本: {analyzeResult.highlightedText}</p>
          
          {analyzeResult.outOfLevelCount > 0 && (
            <button onClick={handleRewrite} disabled={loading}>
              智能修改文本
            </button>
          )}
        </div>
      )}

      {/* 修改结果 */}
      {rewriteResult && (
        <div className="rewrite-section">
          <h2>修改结果</h2>
          <p><strong>原始文本:</strong> {rewriteResult.originalText}</p>
          <p><strong>修改后:</strong> {rewriteResult.rewrittenText}</p>
          <p>
            <strong>修正状态:</strong> 
            {rewriteResult.hasOutOfLevelWords ? '⚠️ 仍有超纲词' : '✅ 已完全修正'}
          </p>
          <p><strong>迭代次数:</strong> {rewriteResult.iterations}/{rewriteResult.maxIterations}</p>
          
          {rewriteResult.hasOutOfLevelWords && (
            <div className="warning">
              <p>⚠️ 警告: {rewriteResult.message}</p>
              <p>残留超纲词: {rewriteResult.outOfLevelWords.join(', ')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## 🎓 学习路径

### Phase 1 ✅ - 词汇管理
- VocabManager 类
- 词汇数据加载
- 分词算法

### Phase 2 ✅ - NLP 分析
- 分词与超纲词检测
- `/api/analyze` 端点
- 完整日志记录

### Phase 3 ✅ - 闭环修正工作流 (本阶段)
- LLM 集成
- `/api/rewrite` 端点
- 自动校验循环
- 智能词汇替换

### Phase 4 (待实现) - 前端应用
- React 组件开发
- UI/UX 设计
- 学习平台集成

## ✨ 关键特性总结

| 特性 | 说明 |
|-----|------|
| 🔄 **闭环修正** | 自动检测修正后的超纲词，最多 3 次循环 |
| 🤖 **LLM 集成** | 支持 OpenAI 及兼容的 LLM API |
| 📝 **完整日志** | 详细的迭代过程记录 |
| ⚡ **高效处理** | 平均 1-2 次迭代完成修正 |
| 🔍 **智能校验** | 使用 VocabManager 进行精确校验 |
| 💡 **灵活配置** | 支持自定义 API 提供商和参数 |

## 🚀 下一步

1. **前端集成**: 创建 React 组件集成分析和修改功能
2. **错误处理**: 增强异常情况处理和用户提示
3. **缓存优化**: 实现常见超纲词的本地缓存
4. **性能监控**: 添加 API 调用统计和性能监控
5. **测试覆盖**: 编写单元测试和集成测试

## 📞 故障排查

### API 无响应
- 检查 `.env.local` 中是否配置了 `OPENAI_API_KEY`
- 验证 API Key 的有效性
- 检查网络连接

### 超纲词未被修正
- 可能是 LLM 输出格式问题
- 检查服务器日志中的 LLM API 响应
- 某些词可能无法替换（专业术语等）

### 循环次数过多
- 通常表示 LLM 的替换效果不佳
- 可以尝试调整 Prompt 或使用更强大的模型
- 3 次限制可防止无限循环

## 📖 更多资源

- [API_REWRITE_GUIDE.md](API_REWRITE_GUIDE.md) - 详细的 API 文档
- [scripts/test-rewrite.js](scripts/test-rewrite.js) - 完整演示脚本
- OpenAI 文档: https://platform.openai.com/docs

---

**版本**: 1.0  
**更新时间**: 2026-05-06  
**状态**: ✅ 已完成
