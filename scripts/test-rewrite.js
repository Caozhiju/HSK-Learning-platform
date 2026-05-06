/**
 * 服务端测试文件：文本重写闭环修正工作流
 * 
 * 运行方式：
 * node scripts/test-rewrite.js
 */

const fs = require('fs');
const path = require('path');

// 模拟 VocabManager
class SimpleTokenizer {
  constructor(vocabSet) {
    this.vocabSet = vocabSet;
  }

  tokenize(text) {
    const result = [];
    let i = 0;

    while (i < text.length) {
      let found = false;

      for (let len = Math.min(5, text.length - i); len > 0; len--) {
        const word = text.slice(i, i + len);

        if (this.vocabSet.has(word)) {
          result.push(word);
          i += len;
          found = true;
          break;
        }
      }

      if (!found) {
        result.push(text[i]);
        i++;
      }
    }

    return result;
  }
}

class TestVocabManager {
  constructor(vocabData) {
    this.vocabularyMap = new Map();
    this.vocabSet = new Set();

    vocabData.forEach((entry) => {
      this.vocabularyMap.set(entry.word, entry);
      this.vocabSet.add(entry.word);
    });

    this.tokenizer = new SimpleTokenizer(this.vocabSet);
  }

  checkWordLevel(word) {
    const entry = this.vocabularyMap.get(word);
    return entry ? entry.level : null;
  }

  tokenize(text) {
    return this.tokenizer.tokenize(text);
  }
}

/**
 * 判断是否是标点符号或空格
 */
function isPunctuation(char) {
  const punctuationRegex = /[\s\p{P}]/u;
  return punctuationRegex.test(char);
}

/**
 * 提取超纲词
 */
function extractOutOfLevelWords(manager, text, targetLevel) {
  const tokens = manager.tokenize(text);
  const outOfLevelWords = new Set();

  tokens.forEach((token) => {
    if (isPunctuation(token)) {
      return;
    }

    const level = manager.checkWordLevel(token);

    if (level === null) {
      return;
    }

    if (level > targetLevel) {
      outOfLevelWords.add(token);
    }
  });

  return {
    words: Array.from(outOfLevelWords),
    hasOutOfLevel: outOfLevelWords.size > 0,
  };
}

/**
 * 高亮超纲词
 */
function highlightOutOfLevelWords(manager, text, targetLevel) {
  const tokens = manager.tokenize(text);
  let highlightedText = '';

  tokens.forEach((token) => {
    if (isPunctuation(token)) {
      highlightedText += token;
      return;
    }

    const level = manager.checkWordLevel(token);

    if (level === null || level <= targetLevel) {
      highlightedText += token;
      return;
    }

    highlightedText += `**${token}**`;
  });

  return highlightedText;
}

/**
 * 模拟 LLM 重写（演示用）
 * 实际应用中这会调用真实的 LLM API
 */
function simulateLLMRewrite(highlightedText, targetLevel) {
  console.log(`\n🤖 [模拟 LLM 调用]`);
  console.log(`   Prompt: "在以下文本中，被 ** ** 标记的词汇超出了 HSK ${targetLevel} 级的范围..."`);
  console.log(`   输入: ${highlightedText}`);

  // 模拟 LLM 的替换逻辑
  // 这里只是一个简单的演示，真实的 LLM 会做更智能的替换
  const replacements = {
    '现象': '事情',
    '社会': '生活',
    '产生': '有',
    '深刻': '很',
    '高级': '高',
    '课程': '课',
    '影响': '作用',
    '议题': '话题',
    '讨论': '说',
    '重要': '重',
  };

  let rewritten = highlightedText;
  Object.entries(replacements).forEach(([word, replacement]) => {
    rewritten = rewritten.replace(`**${word}**`, replacement);
  });

  console.log(`   输出: ${rewritten}`);

  return rewritten;
}

/**
 * 运行演示
 */
function runDemo() {
  console.log('🧪 文本重写闭环修正工作流演示\n');

  try {
    // 加载词汇数据
    const vocabPath = path.join(
      process.cwd(),
      'public',
      'hsk3.0_vocab.json'
    );

    console.log(`📖 加载词汇数据: ${vocabPath}`);
    let vocabContent = fs.readFileSync(vocabPath, 'utf-8');
    if (vocabContent.charCodeAt(0) === 0xFEFF) {
      vocabContent = vocabContent.slice(1);
    }

    const vocabData = JSON.parse(vocabContent);
    const manager = new TestVocabManager(vocabData);
    console.log(`✓ 成功加载 ${vocabData.length} 个词汇\n`);

    // 演示用例
    const testCases = [
      {
        name: '演示 1: 简单的超纲词修正',
        originalText: '这个现象对社会产生了影响。',
        targetLevel: 3,
      },
      {
        name: '演示 2: 多个超纲词修正',
        originalText: '学生们讨论了一个重要的议题。',
        targetLevel: 3,
      },
      {
        name: '演示 3: 复杂句子修正',
        originalText: '这种现象对社会结构产生了深刻的影响。',
        targetLevel: 2,
      },
    ];

    // 执行演示
    for (const testCase of testCases) {
      console.log(`${'═'.repeat(70)}`);
      console.log(`${testCase.name}`);
      console.log(`${'═'.repeat(70)}`);
      console.log(`原始文本: ${testCase.originalText}`);
      console.log(`目标级别: ${testCase.targetLevel}\n`);

      const MAX_ITERATIONS = 3;
      let currentText = testCase.originalText;
      let iterationCount = 0;
      let hasOutOfLevel = true;
      let finalOutOfLevelWords = [];

      // 闭环修正循环
      while (iterationCount < MAX_ITERATIONS && hasOutOfLevel) {
        iterationCount++;
        console.log(`📍 第 ${iterationCount} 次迭代`);
        console.log(`───────────────────────────`);

        // 检查超纲词
        const check = extractOutOfLevelWords(manager, currentText, testCase.targetLevel);

        if (!check.hasOutOfLevel) {
          hasOutOfLevel = false;
          console.log(`✓ 没有发现超纲词，循环终止\n`);
          break;
        }

        console.log(`发现超纲词: ${check.words.join(', ')}`);

        // 高亮
        const highlighted = highlightOutOfLevelWords(
          manager,
          currentText,
          testCase.targetLevel
        );
        console.log(`高亮文本: ${highlighted}`);

        // 调用 LLM（模拟）
        const rewritten = simulateLLMRewrite(highlighted, testCase.targetLevel);
        currentText = rewritten;
        console.log();
      }

      // 最终检查
      const finalCheck = extractOutOfLevelWords(manager, currentText, testCase.targetLevel);
      finalOutOfLevelWords = finalCheck.words;

      console.log(`📊 修正结果`);
      console.log(`──────────`);
      console.log(`修改后文本: ${currentText}`);
      console.log(`迭代次数: ${iterationCount}/${MAX_ITERATIONS}`);
      console.log(`是否仍有超纲词: ${finalCheck.hasOutOfLevel ? '⚠️  是' : '✅ 否'}`);

      if (finalCheck.hasOutOfLevel) {
        console.log(`残留超纲词: ${finalOutOfLevelWords.join(', ')}`);
        console.log(
          `⚠️ 警告: 经过 ${iterationCount} 次迭代仍未完全修正超纲词`
        );
      } else {
        console.log(`✅ 成功修正所有超纲词`);
      }

      console.log();
    }

    console.log(`${'═'.repeat(70)}`);
    console.log('演示完成！\n');

    console.log('📝 说明:');
    console.log('  • 该演示使用模拟的 LLM 输出');
    console.log('  • 实际应用中需要配置 OPENAI_API_KEY 环境变量');
    console.log('  • API 调用会使用真实的 LLM 进行更智能的词汇替换');
    console.log('  • 最多循环 3 次，确保修正效率');
    console.log('  • 如仍有残留超纲词，会返回警告信息\n');
  } catch (error) {
    console.error('❌ 演示失败:', error.message);
    process.exit(1);
  }
}

// 运行演示
runDemo();
