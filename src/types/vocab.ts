/**
 * HSK 等级 (1-9)
 */
export type VocabLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/**
 * 词汇条目接口
 */
export interface Vocab {
  word: string;
  level: VocabLevel;
  pinyin?: string;
  definition?: string;
  examples?: string[];
}

/**
 * HSK 等级统计
 */
export interface LevelStats {
  level: VocabLevel;
  count: number;
  percentage?: number;
}

/**
 * 文本分析结果
 */
export interface TextAnalysisResult {
  tokens: string[];
  vocabStats: LevelStats[];
  totalWords: number;
  knownWords: number;
  unknownWords: number;
}

/**
 * 词汇查询结果
 */
export interface VocabQueryResult {
  found: boolean;
  word: string;
  level?: VocabLevel;
  pinyin?: string;
  definition?: string;
}
