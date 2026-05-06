/**
 * 简单的中文分词器实现
 * 基于词汇字典的贪心匹配算法
 */
class SimpleTokenizer {
  private vocabSet: Set<string>;

  constructor(vocabSet: Set<string>) {
    this.vocabSet = vocabSet;
  }

  /**
   * 对文本进行分词
   * @param text 输入文本
   * @returns 分词结果
   */
  tokenize(text: string): string[] {
    const result: string[] = [];
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


interface VocabEntry {
  word: string;
  level: number;
  pinyin?: string;
  definition?: string;
}

class VocabManager {
  private static instance: VocabManager | null = null;
  private vocabularyMap: Map<string, VocabEntry> = new Map();
  private vocabSet: Set<string> = new Set();
  private tokenizer: SimpleTokenizer | null = null;
  private initialized: boolean = false;

  private constructor() {}

  /**
   * 获取 VocabManager 单例实例
   */
  static getInstance(): VocabManager {
    if (!VocabManager.instance) {
      VocabManager.instance = new VocabManager();
    }
    return VocabManager.instance;
  }

  /**
   * 初始化词汇管理器，加载 JSON 文件
   */
  async initialize(vocabData: VocabEntry[]): Promise<void> {
    if (this.initialized) {
      console.warn('VocabManager is already initialized');
      return;
    }

    try {
      // 加载词汇数据到 Map 和 Set
      vocabData.forEach((entry) => {
        this.vocabularyMap.set(entry.word, entry);
        this.vocabSet.add(entry.word);
      });

      // 初始化分词器
      this.tokenizer = new SimpleTokenizer(this.vocabSet);

      this.initialized = true;
      console.log(
        `✓ VocabManager initialized successfully with ${vocabData.length} vocabulary entries`
      );
    } catch (error) {
      console.error('Failed to initialize VocabManager:', error);
      throw error;
    }
  }

  /**
   * 检查词汇是否在字典中，返回其 HSK 等级
   * @param word 要检查的词
   * @returns HSK 等级 (1-9) 或 null 如果词不在字典中
   */
  checkWordLevel(word: string): number | null {
    if (!this.initialized) {
      console.warn('VocabManager is not initialized');
      return null;
    }

    const entry = this.vocabularyMap.get(word);
    return entry ? entry.level : null;
  }

  /**
   * 获取指定等级的所有词汇
   * @param level HSK 等级 (1-9)
   * @returns 该等级的所有词汇
   */
  getVocabByLevel(level: number): VocabEntry[] {
    if (!this.initialized) {
      console.warn('VocabManager is not initialized');
      return [];
    }

    return Array.from(this.vocabularyMap.values()).filter(
      (entry) => entry.level === level
    );
  }

  /**
   * 获取词汇的完整信息
   * @param word 词汇
   * @returns 词汇条目或 null
   */
  getVocabEntry(word: string): VocabEntry | null {
    if (!this.initialized) {
      console.warn('VocabManager is not initialized');
      return null;
    }

    return this.vocabularyMap.get(word) || null;
  }

  /**
   * 使用分词器对文本进行分词
   * @param text 要分词的文本
   * @returns 分词结果
   */
  tokenize(text: string): string[] {
    if (!this.initialized || !this.tokenizer) {
      console.warn('VocabManager is not initialized');
      return [];
    }

    try {
      return this.tokenizer.tokenize(text);
    } catch (error) {
      console.error('Tokenization failed:', error);
      return [];
    }
  }

  /**
   * 分析文本中的 HSK 等级分布
   * @param text 要分析的文本
   * @returns 包含等级统计的对象
   */
  analyzeText(text: string): { level: number; count: number }[] {
    if (!this.initialized) {
      console.warn('VocabManager is not initialized');
      return [];
    }

    const tokens = this.tokenize(text);
    const levelStats = new Map<number, number>();

    tokens.forEach((token) => {
      const level = this.checkWordLevel(token);
      if (level !== null) {
        levelStats.set(level, (levelStats.get(level) || 0) + 1);
      }
    });

    return Array.from(levelStats.entries())
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => a.level - b.level);
  }

  /**
   * 获取词汇总数
   */
  getTotalVocabCount(): number {
    return this.vocabularyMap.size;
  }

  /**
   * 获取各等级的词汇数量统计
   */
  getLevelStats(): { [level: number]: number } {
    const stats: { [level: number]: number } = {};

    this.vocabularyMap.forEach((entry) => {
      if (!stats[entry.level]) {
        stats[entry.level] = 0;
      }
      stats[entry.level]++;
    });

    return stats;
  }

  /**
   * 重置管理器（用于测试）
   */
  reset(): void {
    this.vocabularyMap.clear();
    this.initialized = false;
    VocabManager.instance = null;
  }
}

export default VocabManager;
