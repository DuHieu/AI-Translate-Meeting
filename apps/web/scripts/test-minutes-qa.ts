import assert from 'node:assert';
import { askMeetingMinutes } from '../src/utils/minutesQa.ts';
import type { MeetingTranscriptEntry } from '../src/types/meeting.ts';

const sampleTranscript: MeetingTranscriptEntry[] = [
  {
    participantName: 'Nam',
    originalText: 'Tôi đề xuất dời lịch deploy sang thứ Sáu để hoàn thiện bảo mật.',
    translatedText: 'I propose moving the deploy to Friday to finalize security.',
    timestamp: '10:01:00',
  },
  {
    participantName: 'Alice',
    originalText: 'We agreed to allocate 20% budget for automated stress testing.',
    translatedText: 'Chúng tôi đã đồng ý dành 20% ngân sách cho kiểm thử tải tự động.',
    timestamp: '10:03:15',
  },
  {
    participantName: 'Tanaka',
    originalText: '来週の月曜日にステージング環境の移行を実施します。',
    translatedText: 'Tuần sau vào thứ Hai chúng ta sẽ di chuyển môi trường staging.',
    timestamp: '10:05:40',
  },
];

const sampleRecap = {
  executiveHighlights: [
    'Cuộc họp bàn về kế hoạch triển khai và kiểm thử tải tự động.',
    'Thống nhất phân bổ ngân sách 20% cho stress testing.',
  ],
  decisions: [
    'Dời lịch deploy sang thứ Sáu.',
    'Phân bổ 20% ngân sách cho stress testing.',
  ],
  actionItems: [
    { task: 'Hoàn thiện bảo mật hệ thống', owner: 'Nam', deadline: 'thứ Sáu' },
    { task: 'Chuẩn bị kịch bản kiểm thử tải', owner: 'Alice', deadline: 'thứ Tư' },
  ],
  blockersAndRisks: [
    'Rủi ro nghẽn mạng nếu số lượng kết nối đồng thời vượt 500 CCU.',
  ],
};

console.log('Testing askMeetingMinutes runtime behavioral suite...');

// 1. Decision Queries
{
  const viRes = askMeetingMinutes('Khách vừa chốt quyết định gì gần nhất?', sampleTranscript, sampleRecap);
  assert.ok(viRes.answer.includes('quyết định chính'), 'VI decision query failed');
  assert.ok(viRes.citations.length > 0, 'VI decision citations missing');

  const enRes = askMeetingMinutes('What were the agreed decisions?', sampleTranscript, sampleRecap);
  assert.ok(enRes.answer.includes('quyết định chính'), 'EN decision query failed');

  const jaRes = askMeetingMinutes('会議の決定事項は何ですか？', sampleTranscript, sampleRecap);
  assert.ok(jaRes.answer.includes('quyết định chính'), 'JA decision query failed');
}

// 2. Action Items Queries
{
  const viRes = askMeetingMinutes('Ai phụ trách các công việc cần làm?', sampleTranscript, sampleRecap);
  assert.ok(viRes.answer.includes('Nam'), 'VI action item owner Nam missing');
  assert.ok(viRes.answer.includes('Alice'), 'VI action item owner Alice missing');

  const enRes = askMeetingMinutes('Who is responsible for the assigned tasks?', sampleTranscript, sampleRecap);
  assert.ok(enRes.answer.includes('Nam'), 'EN action item query failed');

  const jaRes = askMeetingMinutes('タスクの担当者と締切は？', sampleTranscript, sampleRecap);
  assert.ok(jaRes.answer.includes('Nam'), 'JA action item query failed');
}

// 3. Risks & Blockers Queries
{
  const viRes = askMeetingMinutes('Có rủi ro hay vấn đề gì nổi bật?', sampleTranscript, sampleRecap);
  assert.ok(viRes.answer.includes('500 CCU'), 'VI risk query failed');

  const enRes = askMeetingMinutes('What are the main risks and blockers?', sampleTranscript, sampleRecap);
  assert.ok(enRes.answer.includes('500 CCU'), 'EN risk query failed');

  const jaRes = askMeetingMinutes('リスクや問題点はありますか？', sampleTranscript, sampleRecap);
  assert.ok(jaRes.answer.includes('500 CCU'), 'JA risk query failed');
}

// 4. Speaker-specific Queries
{
  // Suffix: "Nam nói gì?"
  const namRes = askMeetingMinutes('Nam nói gì?', sampleTranscript, sampleRecap);
  assert.ok(namRes.answer.includes('Nam đã phát biểu 1 lần'), 'Suffix speaker "Nam nói gì?" failed');
  assert.ok(namRes.answer.includes('deploy'), 'Nam content missing');

  // Suffix Japanese: "Tanakaさんの発言"
  const tanakaRes = askMeetingMinutes('Tanakaさんの発言', sampleTranscript, sampleRecap);
  assert.ok(tanakaRes.answer.includes('Tanaka đã phát biểu 1 lần'), 'JA Suffix speaker "Tanakaさんの発言" failed');

  // Prefix English: "What did Alice say?"
  const aliceRes = askMeetingMinutes('What did Alice say?', sampleTranscript, sampleRecap);
  assert.ok(aliceRes.answer.includes('Alice đã phát biểu 1 lần'), 'Prefix speaker "What did Alice say?" failed');

  // Prefix Vietnamese: "Ý kiến của Nam"
  const namPrefixRes = askMeetingMinutes('Ý kiến của Nam', sampleTranscript, sampleRecap);
  assert.ok(namPrefixRes.answer.includes('Nam đã phát biểu 1 lần'), 'Prefix speaker "Ý kiến của Nam" failed');
}

// 5. Nonsense / empty query defensive fallback
{
  const nonsenseRes = askMeetingMinutes('??? !!!', sampleTranscript, sampleRecap);
  assert.ok(nonsenseRes.answer.includes('chưa tìm thấy đoạn biên bản đủ liên quan'), 'Nonsense fallback failed');
  assert.strictEqual(nonsenseRes.citations.length, 0, 'Nonsense query must not return citations');
}

console.log('✅ ALL 13 runtime behavioral checks for askMeetingMinutes PASSED!');
