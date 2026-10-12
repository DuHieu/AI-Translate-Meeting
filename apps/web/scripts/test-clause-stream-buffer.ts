import assert from 'node:assert';
import { defaultClauseStreamBuffer } from '../src/utils/clauseStreamBuffer.ts';

console.log('Testing ClauseStreamBuffer runtime suite...');

// 1. Basic punctuation split
const text1 = 'Hôm nay chúng ta họp về Phase 7, thảo luận về Voice Dubbing, và chốt ngân sách quý tới.';
const clauses1 = defaultClauseStreamBuffer.splitIntoClauses(text1, 'vi');

assert(clauses1.length >= 2, `Expected >= 2 clauses, got ${clauses1.length}`);
assert.strictEqual(clauses1[0].index, 0);
assert.strictEqual(clauses1[clauses1.length - 1].isTerminal, true);

// 2. Fragment merging: short fragment (< 12 chars / < 3 words) should merge with preceding or following
const text2 = 'Xin chào. Dạ. Hôm nay bắt đầu phiên họp trực tuyến.';
const clauses2 = defaultClauseStreamBuffer.splitIntoClauses(text2, 'vi');
assert(clauses2.length >= 1);
const allText = clauses2.map((c) => c.text).join(' ');
assert(allText.includes('Xin chào'));
assert(allText.includes('phiên họp'));

// 3. Japanese punctuation split
const textJa = '本日はPhase 7の開発進捗を確認し、リアルタイム音声吹き替えについて議論します。';
const clausesJa = defaultClauseStreamBuffer.splitIntoClauses(textJa, 'ja');
assert(clausesJa.length >= 1);
assert.strictEqual(clausesJa[clausesJa.length - 1].isTerminal, true);

// 4. English conjunction and punctuation split
const textEn = 'Today we will review the real-time AI voice dubbing pipeline, and we will verify the sub-250ms latency.';
const clausesEn = defaultClauseStreamBuffer.splitIntoClauses(textEn, 'en');
assert(clausesEn.length >= 2);
assert(clausesEn[0].wordCount >= 3);

// 5. Empty text handling
const emptyClauses = defaultClauseStreamBuffer.splitIntoClauses('', 'vi');
assert.strictEqual(emptyClauses.length, 0);

console.log('✅ ALL 5 runtime checks for ClauseStreamBuffer PASSED!');
