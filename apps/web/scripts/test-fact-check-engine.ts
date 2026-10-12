import assert from 'node:assert';
import {
  evaluateSubtitleFactCheck,
  queryKnowledgeBase,
} from '../src/utils/factCheckEngine.ts';
import type { SubtitleMessage } from '../src/types/subtitle.ts';

console.log('Testing evaluateSubtitleFactCheck & queryKnowledgeBase runtime suite...');

// Helper to create mock subtitle
function makeSubtitle(text: string, speaker = 'Nam Nguyễn', isFinal = true): SubtitleMessage {
  return {
    id: `sub-${Math.random()}`,
    speakerId: `user-${speaker}`,
    participantId: `user-${speaker}`,
    participantName: speaker,
    originalText: text,
    translatedText: text,
    detectedLanguage: 'vi',
    targetLanguage: 'en',
    timestamp: new Date().toISOString(),
    isFinal,
  };
}

// 1. Non-final subtitles should return null
const nonFinal = evaluateSubtitleFactCheck(makeSubtitle('SLA của bên mình là 99.0%', 'Nam', false));
assert.strictEqual(nonFinal, null, 'Non-final subtitle must not trigger fact-check');

// 2. SLA Discrepancy test (spoken 99.0% vs official 99.99%)
const slaDiscrepancy = evaluateSubtitleFactCheck(makeSubtitle('SLA của hệ thống bên mình hiện tại là 99.0%', 'Nam'));
assert(slaDiscrepancy !== null, 'SLA claim must be detected');
assert.strictEqual(slaDiscrepancy?.status, 'DISCREPANCY', '99.0% SLA must be flagged as DISCREPANCY');
assert.strictEqual(slaDiscrepancy?.category, 'sla');
assert(slaDiscrepancy?.explanation.includes('99.99%'), 'Explanation must mention official 99.99%');

// 3. SLA Verified test (spoken 99.99%)
const slaVerified = evaluateSubtitleFactCheck(makeSubtitle('Hệ thống cam kết mức độ sẵn sàng SLA đạt 99.99%', 'Alice'));
assert(slaVerified !== null, 'SLA claim must be detected for Alice');
assert.strictEqual(slaVerified?.status, 'VERIFIED', '99.99% SLA must be VERIFIED');

// 4. Refund Policy Discrepancy test (spoken 30 days vs official 14 days)
const refundDiscrepancy = evaluateSubtitleFactCheck(makeSubtitle('Khách hàng có thể yêu cầu hoàn tiền trong 30 ngày nhé', 'Bob'));
assert(refundDiscrepancy !== null, 'Refund claim must be detected');
assert.strictEqual(refundDiscrepancy?.status, 'DISCREPANCY', '30 days refund must be flagged as DISCREPANCY');
assert(refundDiscrepancy?.explanation.includes('14 ngày'), 'Explanation must cite 14 days official refund');

// 5. Refund Policy Verified test (spoken 14 days)
const refundVerified = evaluateSubtitleFactCheck(makeSubtitle('Chính sách hoàn tiền áp dụng trong 14 ngày kể từ khi thanh toán', 'Carol'));
assert(refundVerified !== null, 'Refund claim must be detected');
assert.strictEqual(refundVerified?.status, 'VERIFIED', '14 days refund must be VERIFIED');

// 6. Free Meeting Duration Discrepancy (spoken 60 mins vs official 45 mins)
const durationDiscrepancy = evaluateSubtitleFactCheck(makeSubtitle('Gói Free được họp tối đa 60 phút mỗi phòng', 'Dave'));
assert(durationDiscrepancy !== null, 'Meeting duration claim must be detected');
assert.strictEqual(durationDiscrepancy?.status, 'DISCREPANCY', '60 mins for Free must be DISCREPANCY');
assert(durationDiscrepancy?.explanation.includes('45 phút'), 'Explanation must cite 45 mins');

// 7. Free Meeting Duration Verified (spoken 45 mins)
const durationVerified = evaluateSubtitleFactCheck(makeSubtitle('Tài khoản Free chỉ được tổ chức họp tối đa 45 phút', 'Eve'));
assert(durationVerified !== null, 'Meeting duration claim must be detected');
assert.strictEqual(durationVerified?.status, 'VERIFIED', '45 mins for Free must be VERIFIED');

// 8. RAM-Only Security Verified
const ramOnlyVerified = evaluateSubtitleFactCheck(makeSubtitle('Dữ liệu được bảo mật theo cơ chế RAM-Only không lưu trên đĩa', 'Frank'));
assert(ramOnlyVerified !== null, 'RAM-Only claim must be detected');
assert.strictEqual(ramOnlyVerified?.status, 'VERIFIED', 'RAM-only compliance must be VERIFIED');

// 9. TTFS Latency Verified
const ttfsVerified = evaluateSubtitleFactCheck(makeSubtitle('Độ trễ phụ đề thời gian thực dưới 200ms rất mượt', 'Grace'));
assert(ttfsVerified !== null, 'TTFS latency claim must be detected');
assert.strictEqual(ttfsVerified?.status, 'VERIFIED', 'Sub-200ms latency must be VERIFIED');

// 10. Direct Query Knowledge Base: SLA query
const querySla = queryKnowledgeBase('@Laya fact-check SLA của doanh nghiệp');
assert(querySla.items.length > 0, 'Querying SLA must return KB items');
assert(querySla.answer.includes('99.99%'), 'Answer must mention 99.99%');
assert.strictEqual(querySla.source, 'Điều khoản SLA Doanh Nghiệp LayaMeet (Mục 2.1)');

// 11. Direct Query Knowledge Base: Refund query
const queryRefund = queryKnowledgeBase('@Laya kiểm tra chính sách hoàn tiền');
assert(queryRefund.answer.includes('14 ngày'), 'Answer must mention 14 days');

// 12. Direct Query Knowledge Base: Domain Glossary
const queryGlossary = queryKnowledgeBase('@Laya thuật ngữ Pull Request (PR)');
assert(queryGlossary.answer.includes('Yêu cầu tích hợp mã nguồn'), 'Glossary answer must define PR');

// 13. General query fallback
const queryGeneral = queryKnowledgeBase('@Laya fact-check');
assert(queryGeneral.answer.includes('Laya Fact-Check hiện hỗ trợ đối soát'), 'Fallback must summarize supported checks');

console.log('✅ ALL 13 runtime behavioral tests for factCheckEngine PASSED!');
