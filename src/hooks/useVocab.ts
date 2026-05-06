import { useEffect, useState } from 'react';

interface InitStatus {
  initialized: boolean;
  loading: boolean;
  error: string | null;
  stats?: Record<string, number>;
}

export function useVocabInitialize() {
  const [status, setStatus] = useState<InitStatus>({
    initialized: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const initializeVocab = async () => {
      try {
        const response = await fetch('/api/vocab', {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error('Failed to initialize vocabulary');
        }

        const data = await response.json();

        setStatus({
          initialized: true,
          loading: false,
          error: null,
          stats: data.levelStats,
        });
      } catch (error) {
        setStatus({
          initialized: false,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    initializeVocab();
  }, []);

  return status;
}

/**
 * 客户端上检查单词等级
 */
export async function checkWordLevel(word: string): Promise<number | null> {
  try {
    const response = await fetch('/api/vocab', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        word,
        action: 'check-level',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to check word level');
    }

    const data = await response.json();
    return data.level;
  } catch (error) {
    console.error('Error checking word level:', error);
    return null;
  }
}

/**
 * 获取单词的完整信息
 */
export async function getVocabEntry(word: string) {
  try {
    const response = await fetch('/api/vocab', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        word,
        action: 'get-entry',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get vocabulary entry');
    }

    const data = await response.json();
    return data.entry;
  } catch (error) {
    console.error('Error getting vocabulary entry:', error);
    return null;
  }
}

/**
 * 对文本进行分词
 */
export async function tokenizeText(text: string): Promise<string[]> {
  try {
    const response = await fetch('/api/vocab', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        word: text,
        action: 'tokenize',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to tokenize text');
    }

    const data = await response.json();
    return data.tokens;
  } catch (error) {
    console.error('Error tokenizing text:', error);
    return [];
  }
}
