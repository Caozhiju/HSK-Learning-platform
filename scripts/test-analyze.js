/**
 * 服务端测试文件：分析 API 逻辑验证 (JavaScript 版)
 * 
 * 运行方式：
 * node scripts/test-analyze.js
 */

const fs = require('fs');
const path = require('path');

// 模拟 VocabManager 的关键部分用于测试
class SimpleTokenizer {
  constructor(vocabSet) {
    this.vocabSet = vocabSet;
  }

  tokenize(text) {
    const result = [];
    let i = 0;

    while (i < text.length) {
      let found = false;

      // 贪心匹配：尝试从长到短的匹配
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
        // 如果没有找到匹配，就单个字符作为一个 token
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
 * 分析文本中的超纲词
 */
function analyzeText(manager, text, targetLevel) {
  const tokens = manager.tokenize(text);

  const tokenInfos = [];
  let outOfLevelCount = 0;

  tokens.forEach((token) => {
    if (isPunctuation(token)) {
      tokenInfos.push({
        token,
        level: null,
        isOutOfLevel: false,
      });
      return;
    }

    const level = manager.checkWordLevel(token);

    if (level === null) {
      tokenInfos.push({
        token,
        level: null,
        isOutOfLevel: false,
      });
      return;
    }

    const isOutOfLevel = level > targetLevel;

    if (isOutOfLevel) {
      outOfLevelCount++;
    }

    tokenInfos.push({
      token,
      level,
      isOutOfLevel,
    });
  });

  // 生成高亮文本
  let highlightedText = '';
  tokenInfos.forEach((tokenInfo) => {
    if (tokenInfo.isOutOfLevel) {
      highlightedText += `**${tokenInfo.token}**`;
    } else {
      highlightedText += tokenInfo.token;
    }
  });

  return {
    originalText: text,
    tokens: tokenInfos,
    outOfLevelCount,
    highlightedText,
  };
}

/**
 * 运行测试
 */
function runTests() {
  console.log('🧪 开始测试 NLP 分析 API...\n');

  try {
    // 读取实际的词汇数据
    const vocabPath = path.join(
      process.cwd(),
      'public',
      'hsk3.0_vocab.json'
    );

    console.log(`📖 加载词汇数据: ${vocabPath}`);
    let vocabContent = fs.readFileSync(vocabPath, 'utf-8');
    // 去除 BOM 标记
    if (vocabContent.charCodeAt(0) === 0xFEFF) {
      vocabContent = vocabContent.slice(1);
    }
    const vocabData = JSON.parse(vocabContent);

    console.log(`✓ 成功加载 ${vocabData.length} 个词汇\n`);

    // 创建测试管理器
    const manager = new TestVocabManager(vocabData);

    // 测试用例
    const testCases = [
      {
        name: '测试 1: HSK 3 级文本（全部合规）',
        text: '我喜欢学习中文。',
        targetLevel: 3,
      },
      {
        name: '测试 2: 混合文本（包含超纲词）',
        text: '我非常喜欢学习高级的中文课程。',
        targetLevel: 3,
      },
      {
        name: '测试 3: 高级文本（多个超纲词）',
        text: '这个现象对社会产生了深刻的影响。',
        targetLevel: 3,
      },
      {
        name: '测试 4: 目标等级为 5',
        text: '他们在会议上讨论了重要的议题。',
        targetLevel: 5,
      },
      {
        name: '测试 5: 包含标点符号和空格',
        text: '你好，我的名字是李明。',
        targetLevel: 2,
      },
    ];

    // 执行测试
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`${testCase.name}`);
      console.log(`📝 输入文本: "${testCase.text}"`);
      console.log(`🎯 目标等级: ${testCase.targetLevel}`);

      const result = analyzeText(manager, testCase.text, testCase.targetLevel);

      console.log(`\n📊 分析结果:`);
      console.log(`   超纲词总数: ${result.outOfLevelCount}`);
      console.log(`   分词结果:`);

      result.tokens.forEach((token) => {
        const levelStr =
          token.level === null
            ? '(库外词)'
            : `等级 ${token.level}`;
        const statusStr = token.isOutOfLevel ? '❌ 超纲' : '✓ 合规';

        console.log(
          `     "${token.token}" ${levelStr} ${statusStr}`
        );
      });

      console.log(`\n   高亮文本: ${result.highlightedText}`);
      console.log(`${'─'.repeat(60)}\n`);
    }

    console.log('✅ 所有测试完成！\n');

    // 统计信息
    console.log('📈 词汇统计信息:');
    const levelStats = new Map();

    vocabData.forEach((entry) => {
      levelStats.set(entry.level, (levelStats.get(entry.level) || 0) + 1);
    });

    Array.from(levelStats.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([level, count]) => {
        console.log(`   HSK ${level} 级: ${count} 个词汇`);
      });

    console.log(`   总计: ${vocabData.length} 个词汇`);
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
runTests();
