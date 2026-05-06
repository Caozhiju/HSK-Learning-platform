# 文本重写闭环修正工作流 - API 文档

## 概述

此工作流实现了一个"生成-评估者"的闭环修正系统，用于自动将超纲词汇替换为更简单的基础词汇，同时保持原句核心意思。

## 核心特性

### 1. **智能 LLM 重写**
- 使用 OpenAI API（或兼容的 LLM）进行智能词汇替换
- 两步思考过程：找到初级同义词 → 进行替换
- 保持原句核心意思不变

### 2. **自动校验与循环修正**
- 自动检测修改后文本中的残留超纲词
- 最多循环 3 次，确保修正效率
- 如仍有残留超纲词，返回警告信息

### 3. **完整反馈**
- 修正后文本
- 迭代次数统计
- 残留超纲词列表（如有）
- 修正成功/失败状态

## API 端点

### POST /api/rewrite

#### 请求

```bash
curl -X POST http://localhost:3000/api/rewrite \
  -H "Content-Type: application/json" \
  -d '{
    "highlightedText": "我非常喜欢学习**高级**的中文**课程**。",
    "targetLevel": 3
  }'
```

#### 请求参数

| 字段 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `highlightedText` | string | ✅ | 包含超纲词高亮标记 `**词汇**` 的文本 |
| `targetLevel` | number | ✅ | 目标 HSK 级别 (1-9) |

#### 响应

```json
{
  "success": true,
  "originalText": "我非常喜欢学习高级的中文课程。",
  "rewrittenText": "我很喜欢学习简单的中文课。",
  "iterations": 2,
  "maxIterations": 3,
  "hasOutOfLevelWords": false,
  "message": "成功修正所有超纲词 (第 2 次迭代)"
}
```

#### 响应参数

| 字段 | 类型 | 说明 |
|-----|------|------|
| `success` | boolean | 是否成功 |
| `originalText` | string | 去除高亮标记后的原始文本 |
| `rewrittenText` | string | 修改后的文本 |
| `iterations` | number | 实际迭代次数 |
| `maxIterations` | number | 最大允许迭代次数（总是 3） |
| `hasOutOfLevelWords` | boolean | 修正后是否仍有超纲词 |
| `outOfLevelWords` | string[] | 残留超纲词列表（如有） |
| `message` | string | 人类可读的结果说明 |

## 工作流程

```
输入: { highlightedText, targetLevel }
  ↓
[第 1 次迭代]
  ├─ 提取超纲词
  ├─ 构建 Prompt
  ├─ 调用 LLM API
  ├─ 获取重写文本
  └─ 校验修正效果
  ↓
[有超纲词 ∧ 迭代 < 3?]
  ├─ Yes → 返回第 2 次迭代
  └─ No → 返回最终结果
```

### 详细步骤

1. **移除高亮标记** - 从输入文本中去除 `**` 标记

2. **第一次迭代**
   - 提取超纲词列表
   - 高亮超纲词
   - 组装 Prompt：
     ```
     在以下文本中，被 ** ** 标记的词汇超出了 HSK {targetLevel} 级的范围。
     请你分两步思考：
     第一步，在心里寻找这些词的初级同义词；
     第二步，仅使用 HSK 1-{targetLevel} 级的基础词汇替换这些高亮词汇，
     保持原句核心句意不变。
     请直接输出修改后的纯文本。
     
     文本：
     {highlightedText}
     ```
   - 调用 LLM API
   - 获取重写文本

3. **校验与循环**
   - 在修改后的文本中再次检查超纲词
   - 如果仍有超纲词且迭代次数 < 3，回到步骤 2
   - 否则返回最终结果

4. **返回结果**
   - 修改后的文本
   - 迭代次数
   - 是否仍有残留超纲词
   - 残留超纲词列表（如有）

## 配置步骤

### 1. 安装依赖

```bash
npm install openai
```

### 2. 配置 API Key

创建 `.env.local` 文件：

```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx
```

获取 API Key：https://platform.openai.com/api-keys

### 3. 启动开发服务器

```bash
npm run dev
```

## 使用示例

### JavaScript / Node.js

```javascript
async function rewriteText(highlightedText, targetLevel) {
  const response = await fetch('/api/rewrite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      highlightedText,
      targetLevel
    })
  });

  const result = await response.json();

  if (result.success) {
    console.log('修改后文本:', result.rewrittenText);
    console.log('迭代次数:', result.iterations);
    
    if (result.hasOutOfLevelWords) {
      console.warn('⚠️  警告:', result.message);
    } else {
      console.log('✅ 成功:', result.message);
    }
  } else {
    console.error('❌ 错误:', result.message);
  }

  return result;
}

// 使用示例
const result = await rewriteText(
  '我非常喜欢学习**高级**的中文**课程**。',
  3
);
```

### React 组件示例

```jsx
import { useState } from 'react';

export default function TextRewriter() {
  const [text, setText] = useState('');
  const [level, setLevel] = useState(3);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRewrite = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          highlightedText: text,
          targetLevel: level
        })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('错误:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="输入高亮标记的文本..."
      />
      
      <input
        type="number"
        min="1"
        max="9"
        value={level}
        onChange={(e) => setLevel(parseInt(e.target.value))}
      />
      
      <button onClick={handleRewrite} disabled={loading}>
        {loading ? '处理中...' : '修改文本'}
      </button>

      {result && (
        <div>
          <h3>修改后的文本</h3>
          <p>{result.rewrittenText}</p>
          
          <p>迭代次数: {result.iterations}/{result.maxIterations}</p>
          
          {result.hasOutOfLevelWords && (
            <div className="warning">
              ⚠️ {result.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## 错误处理

### 常见错误

#### 1. `OPENAI_API_KEY is not set`

**原因**: 未配置 API Key

**解决**: 在 `.env.local` 中添加 `OPENAI_API_KEY`

#### 2. `Invalid request: highlightedText is required`

**原因**: 请求参数不完整

**解决**: 确保请求包含 `highlightedText` 和 `targetLevel` 参数

#### 3. API 超时或调用失败

**原因**: LLM API 调用失败

**解决**: 
- 检查网络连接
- 验证 API Key 有效性
- 检查 API 配额
- 查看服务器日志

## 性能考虑

### 时间复杂度

- **最坏情况**: O(3n)，其中 n 为文本中的 token 数量
- **平均情况**: O(1-2n)，大多数文本在 1-2 次迭代内修正完成

### 成本考虑

- 每次迭代调用一次 LLM API
- 平均每个请求调用 1-2 次 API
- 建议设置速率限制以控制成本

### 缓存建议

可以对常见的超纲词进行缓存，避免重复调用 LLM：

```javascript
const replacementCache = new Map();

// 缓存常见替换
replacementCache.set('现象', '事情');
replacementCache.set('社会', '生活');
replacementCache.set('产生', '有');
```

## 测试

运行演示脚本查看完整的工作流程：

```bash
node scripts/test-rewrite.js
```

## 限制与注意事项

1. **最大迭代次数**: 固定为 3 次，避免无限循环
2. **文本长度**: 单个请求建议 < 1000 字符
3. **并发请求**: 需考虑 LLM API 的限流策略
4. **语义保持**: 虽然目标是保持核心意思，但复杂句子可能会有细微变化
5. **残留超纲词**: 某些专业术语或人名可能无法完全替换

## 集成到学习平台的工作流

```
用户输入文本
  ↓
调用 /api/analyze → 获取超纲词和高亮文本
  ↓
展示分析结果和超纲词提示
  ↓
用户点击"修改文本"
  ↓
调用 /api/rewrite → 获取修改后的文本
  ↓
展示修改建议和迭代信息
  ↓
用户选择接受/拒绝修改
```

## 相关 API

- **分析 API**: `POST /api/analyze` - 分词和超纲词检测
- **词汇初始化**: `GET /api/vocab` - 初始化词汇管理器
- **词汇查询**: `POST /api/vocab/check` - 查询单词等级

## 常见问题

**Q: 如何使用其他 LLM 提供商？**
A: OpenAI SDK 兼容大多数支持 OpenAI API 格式的服务。修改 API 调用中的 `apiKey` 和 `baseURL` 参数。

**Q: 可以离线运行吗？**
A: 不可以，此工作流需要调用远程 LLM API。

**Q: 为什么有时会有残留超纲词？**
A: 某些词汇可能难以替换或 LLM 可能不知道更简单的替代。3 次循环限制可防止无限循环。

**Q: 如何提高修正成功率？**
A: 
- 提供更清晰的 Prompt
- 使用更强大的 LLM 模型
- 为常见超纲词构建替换字典
- 调整目标级别设置

## 许可证

MIT
