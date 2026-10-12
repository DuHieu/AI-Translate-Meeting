/**
 * Semantic Clause Stream Buffer for Real-Time Voice Dubbing.
 * Splits continuous live translation into prosodic clauses to achieve < 250ms TTS latency.
 */

export interface ClauseChunk {
  text: string;
  index: number;
  isTerminal: boolean;
  wordCount: number;
}

const PUNCTUATION_SPLIT_REGEX = /([,;:!?.—–~、。！？])\s*/;

const CONJUNCTION_DELIMITERS: Record<string, RegExp> = {
  vi: /\s+(và|nhưng|hoặc|đồng thời|sau đó|bởi vì|cho nên|do đó|trong khi|mặc dù)\s+/i,
  en: /\s+(and|but|or|however|because|therefore|meanwhile|although|while)\s+/i,
  ja: /(そして|しかし|だから|または|なお|ですから|けれども)/,
};

export class ClauseStreamBuffer {
  private minChars: number;
  private maxChars: number;
  private minWords: number;

  constructor(minChars = 12, maxChars = 85, minWords = 3) {
    this.minChars = minChars;
    this.maxChars = maxChars;
    this.minWords = minWords;
  }

  public splitIntoClauses(text: string, lang = 'vi'): ClauseChunk[] {
    const cleaned = text.trim();
    if (!cleaned) return [];

    // 1. Punctuation boundary pass
    const tokens = cleaned.split(PUNCTUATION_SPLIT_REGEX);
    const rawParts: string[] = [];
    let currentSegment = '';

    for (const token of tokens) {
      if (!token) continue;
      if (PUNCTUATION_SPLIT_REGEX.test(token)) {
        currentSegment += token;
        rawParts.push(currentSegment.trim());
        currentSegment = '';
      } else {
        if (currentSegment) {
          rawParts.push(currentSegment.trim());
        }
        currentSegment = token;
      }
    }

    if (currentSegment.trim()) {
      rawParts.push(currentSegment.trim());
    }

    // 2. Conjunction splitting for long fragments without punctuation
    if (rawParts.length <= 1 && cleaned.length > this.maxChars) {
      const baseLang = lang.toLowerCase().split('-')[0];
      const conjRegex = CONJUNCTION_DELIMITERS[baseLang];
      if (conjRegex) {
        const splitConj = cleaned.split(conjRegex);
        rawParts.length = 0;
        let buf = '';
        for (const part of splitConj) {
          const partStr = part.trim();
          if (!partStr) continue;
          if (buf.length + partStr.length > this.maxChars) {
            if (buf) rawParts.push(buf.trim());
            buf = partStr;
          } else {
            buf = buf ? `${buf} ${partStr}`.trim() : partStr;
          }
        }
        if (buf) rawParts.push(buf.trim());
      }
    }

    // 3. Merge short fragments below minChars / minWords
    const mergedClauses: string[] = [];
    let accumulator = '';

    for (const part of rawParts) {
      if (!accumulator) {
        accumulator = part;
      } else {
        const accWords = accumulator.split(/\s+/).filter(Boolean);
        if (accumulator.length < this.minChars || accWords.length < this.minWords) {
          accumulator = `${accumulator} ${part}`.trim();
        } else {
          mergedClauses.push(accumulator);
          accumulator = part;
        }
      }
    }

    if (accumulator) {
      if (
        mergedClauses.length > 0 &&
        (accumulator.length < this.minChars || accumulator.split(/\s+/).filter(Boolean).length < this.minWords)
      ) {
        mergedClauses[mergedClauses.length - 1] = `${mergedClauses[mergedClauses.length - 1]} ${accumulator}`.trim();
      } else {
        mergedClauses.push(accumulator);
      }
    }

    if (mergedClauses.length === 0) {
      mergedClauses.push(cleaned);
    }

    // 4. Return ClauseChunk array
    const total = mergedClauses.length;
    return mergedClauses.map((clause, idx) => ({
      text: clause,
      index: idx,
      isTerminal: idx === total - 1,
      wordCount: clause.split(/\s+/).filter(Boolean).length,
    }));
  }
}

export const defaultClauseStreamBuffer = new ClauseStreamBuffer();
