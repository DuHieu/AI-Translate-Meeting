# Translation-Aware Conversation Flow

> **Dự án:** AI-Translate-Meeting  
> **Trạng thái:** Refined Proposal / Ready for Validation  
> **Thị trường đầu tiên:** Đội dự án Việt Nam - Nhật Bản, có thể sử dụng tiếng Anh làm ngôn ngữ trung gian  
> **Mục tiêu:** Giảm va chạm lượt nói và giúp người tham gia theo kịp bản dịch mà không khóa microphone hoặc phát hai luồng âm thanh chồng nhau.

---

## 1. Problem Statement

**How might we** giúp đội dự án Việt - Nhật duy trì lượt nói tự nhiên trong cuộc họp có dịch thời gian thực, mà không cần push-to-talk và không làm người nghe quá tải bởi giọng gốc cùng giọng dịch phát đồng thời?

### Người dùng mục tiêu

- Nhóm 3-6 người gồm kỹ sư, PM và khách hàng.
- Mỗi người nói ngôn ngữ quen thuộc của mình.
- Cuộc họp có nội dung kỹ thuật, quyết định và action item cần giữ đúng ngữ cảnh.
- Ưu tiên cặp Việt - Nhật - Anh trong giai đoạn đầu; các ngôn ngữ khác chỉ mở rộng sau khi có bằng chứng chất lượng.

### Vấn đề cần giải quyết

1. **Translation gap:** Sau khi diễn giả ngừng nói, người nghe chưa nhận được bản dịch cuối cùng và có thể phản hồi quá sớm.
2. **Information loss:** Phụ đề overlay biến mất nhanh; người nghe khó xem lại thuật ngữ, con số hoặc quyết định vừa nêu.
3. **Audio overload:** TTS tự động có thể chồng lên giọng thật hoặc bị trễ so với cuộc hội thoại.

Không coi một con số latency duy nhất là đủ. Hệ thống phải đo riêng:

- Time to first partial subtitle.
- End-of-speech đến final transcript.
- End-of-speech đến translation ready.
- Translation ready đến lúc TTS bắt đầu, nếu Audio Booth được bật.

---

## 2. Current Product Baseline

Các khả năng sau đã tồn tại và không cần xây lại từ đầu:

| Khả năng | Hiện trạng |
| :--- | :--- |
| Silent bilingual subtitle overlay | Đã có partial/final subtitle theo ngôn ngữ đích của từng listener |
| Review timeline | Đã có lịch sử trong session, speaker, timestamp, tìm kiếm và song ngữ |
| Transcript export | Đã có TXT, SRT và meeting minutes |
| Manual TTS replay | Đã có nút nghe lại từng subtitle bằng Web Speech API |
| Speaking indicator | Đã có trạng thái speaking từ LiveKit |
| Translation-aware status | Chưa có event `transcribing`, `translating`, `ready`, `failed` |
| Automatic TTS queue and ducking | Chưa có |

### Khoảng trống thực tế

- Timeline hiện chỉ giữ tối đa 200 subtitle trong React state và mất khi reload.
- Auto-scroll chưa dừng khi người dùng chủ động cuộn lên.
- `isFinal` chỉ cho biết subtitle đã sẵn sàng; không cho biết backend đang transcribe hay translate.
- Subtitle dùng database `participantId`, trong khi video tile dùng LiveKit `identity`; chưa có mapping an toàn khi trùng display name.
- TTS hiện tại hủy câu đang đọc trước khi đọc câu mới; chưa phù hợp cho chế độ tự động.

---

## 3. Directions Evaluated

### Direction A - Translation-Aware Soft Floor

- **User value:** Cao; giải quyết trực tiếp va chạm lượt nói.
- **Feasibility:** Trung bình; cần mở rộng WebSocket contract và mapping participant.
- **Differentiation:** Cao hơn subtitle thông thường vì UI hiểu trạng thái của pipeline dịch.
- **Quyết định:** Là hướng chính của MVP.

### Direction B - Timeline Hardening

- **User value:** Trung bình đến cao; giúp xem lại nội dung bị bỏ lỡ.
- **Feasibility:** Cao vì nền tảng đã tồn tại.
- **Differentiation:** Thấp; đây là tính năng hỗ trợ, không phải điểm bán hàng chính.
- **Quyết định:** Thực hiện như một thin slice nhỏ sau Soft Floor.

### Direction C - Automatic Audio Booth

- **User value:** Chưa được kiểm chứng; có thể hữu ích cho người không nhìn màn hình.
- **Feasibility:** Trung bình đến thấp vì cần queue, voice capability detection, audio ducking và xử lý độ trễ tích lũy.
- **Differentiation:** Trung bình nhưng rủi ro phá nhịp hội thoại cao.
- **Quyết định:** Chỉ làm experiment sau pilot, không đưa vào core MVP.

---

## 4. Recommended Direction: Translation-Aware Soft Floor

UI hiển thị vòng đời của một phát ngôn thay vì suy luận từ subtitle cuối cùng:

```text
Speaking -> Transcribing -> Translating -> Ready
    |             |              |
    +-------------+--------------+--> Failed / Expired
```

- **Speaking:** lấy từ LiveKit active speaker để phản hồi nhanh.
- **Transcribing:** backend đang tạo final transcript.
- **Translating:** final transcript đã có và đang dịch cho listener.
- **Ready:** subtitle cuối cùng đã gửi thành công.
- **Failed/Expired:** pipeline lỗi hoặc event bị treo quá thời gian cho phép; UI phải tự dọn trạng thái.

Badge chỉ là chỉ báo mềm. Hệ thống không khóa mic và không ngăn người dùng phát biểu.

### WebSocket contract đề xuất

```ts
type PipelinePhase =
  | "transcribing"
  | "translating"
  | "ready"
  | "failed";

interface PipelineStatusBroadcast {
  type: "pipeline_status";
  data: {
    meetingId: string;
    utteranceId: string;
    participantId: string;
    liveKitIdentity: string;
    phase: PipelinePhase;
    sequence: number;
    timestamp: string;
    expiresAt: string;
    reasonCode?: string;
  };
}
```

### Quy tắc contract

- Dùng cùng `utteranceId` cho partial, status và final subtitle.
- `sequence` tăng dần để frontend bỏ qua event đến sai thứ tự.
- `liveKitIdentity` phải lấy từ token đã ký, không tin dữ liệu client tự gửi.
- Không gửi transcript, token hoặc tên người dùng trong log trạng thái.
- `failed` chỉ chứa reason code an toàn, không phát tán exception nội bộ.
- Frontend tự clear trạng thái khi quá `expiresAt` để không để badge bị treo.

---

## 5. Key Assumptions to Validate

- [ ] **Soft Floor làm giảm va chạm lượt nói.** So sánh số giây có nhiều người cùng nói trước và sau khi bật tính năng trong 5-10 cuộc họp pilot.
- [ ] **Người dùng hiểu badge mà không cần hướng dẫn dài.** Kiểm thử nhanh với kỹ sư Việt Nam và PM Nhật Bản; yêu cầu họ giải thích ý nghĩa badge sau một lần sử dụng.
- [ ] **Pipeline đủ nhanh để badge còn hữu ích.** Đo end-of-speech đến `ready` p50/p95 bằng audio thật, không dùng text fixture để kết luận.
- [ ] **Timeline giúp giảm yêu cầu nhắc lại.** Đo số lần mở lịch sử/tìm kiếm và số câu “nói lại giúp tôi”.
- [ ] **Audio Booth có nhu cầu thật.** Theo dõi số người dùng nút TTS thủ công trước khi đầu tư auto-TTS.

### Pilot success targets

Các ngưỡng dưới đây là mục tiêu kiểm chứng, chưa phải số liệu production đã xác nhận:

- Giảm ít nhất 25% thời lượng overlapping speech so với baseline.
- End-of-speech đến translation ready: p95 không vượt 2.5 giây trong pilot profile đã công bố.
- Không có pipeline badge bị treo quá 3 giây sau `ready`, `failed` hoặc disconnect.
- Người dùng xem lại được câu vừa bỏ lỡ trong không quá 5 giây.
- Không gắn nhầm trạng thái khi hai người có cùng display name.

---

## 6. MVP Scope

### In Scope

1. **Latency và overlap telemetry**
   - Ghi nhận thời điểm utterance started, end-of-speech, STT final, translation ready và subtitle sent.
   - Không log nội dung transcript hoặc thông tin nhạy cảm.

2. **Pipeline status protocol**
   - Bổ sung `pipeline_status` vào backend và frontend contract.
   - Truyền `liveKitIdentity` bằng claim đã ký.
   - Xử lý ordering, timeout, reconnect và failure state.

3. **Soft Floor UI**
   - Giữ indicator `Speaking` hiện tại.
   - Hiển thị `Đang xử lý` hoặc `Đang dịch` trên đúng participant tile.
   - Hiển thị trạng thái gọn trên SubtitleOverlay.
   - Không khóa microphone.

4. **Timeline hardening**
   - Chỉ lưu final subtitle trong timeline mặc định.
   - Pause auto-scroll khi người dùng cuộn lên; có nút “Về nội dung mới nhất”.
   - Hiển thị source/target language badge.
   - Giữ giới hạn 200 item cho MVP nhưng thông báo rõ đây là lịch sử trong session.

5. **Manual TTS hardening**
   - Kiểm tra voice bằng `speechSynthesis.getVoices()`.
   - Hiển thị fallback rõ ràng khi locale không có voice phù hợp.
   - Ưu tiên voice có `localService=true` trong chế độ yêu cầu private/on-premise.

### Not Doing in MVP

- **Automatic TTS và audio ducking:** chưa có bằng chứng người dùng cần, đồng thời có rủi ro tăng conversational lag.
- **Server-side neural TTS:** tăng hạ tầng và không kiểm chứng giả định cốt lõi của Soft Floor.
- **Hard microphone locking:** làm cuộc họp thiếu tự nhiên và tăng rủi ro deadlock UX.
- **Hỗ trợ chất lượng ngang nhau cho tám ngôn ngữ:** giai đoạn đầu chỉ cam kết Việt - Nhật - Anh.
- **Lưu transcript dài hạn:** MVP chỉ bảo đảm review trong session; retention cần policy và yêu cầu bảo mật riêng.
- **Emotion/facial analysis:** không liên quan trực tiếp tới turn-taking và có rủi ro riêng tư cao.

---

## 7. Thin-Slice Implementation Plan

### Slice 0 - Establish Baseline

- Bổ sung timestamp nội bộ cho các mốc pipeline.
- Đo bằng audio thật trong cuộc họp nhiều người.
- Ghi lại p50/p95 và overlapping speech baseline trước khi đổi UX.

### Slice 1 - Status Contract and Identity Mapping

- Mở rộng subtitle token với LiveKit identity.
- Bổ sung schema `pipeline_status` ở Python và TypeScript.
- Viết contract tests cho event ordering, spoofing và cross-room isolation.

### Slice 2 - Soft Floor UI

- Truyền status map từ `MeetingShell` tới `ParticipantTile` và `SubtitleOverlay`.
- Render badge theo `liveKitIdentity`.
- Clear state khi ready, failed, disconnect hoặc timeout.
- Thêm accessibility label; không chỉ truyền trạng thái bằng màu sắc.

### Slice 3 - Timeline Hardening

- Tách interim overlay khỏi final history.
- Thêm pause/resume auto-scroll và language badges.
- Kiểm thử lịch sử đạt giới hạn 200 item và reconnect.

### Slice 4 - Pilot Verification

- Chạy pilot 5-10 cuộc họp Việt - Nhật hoặc Việt - Anh.
- So sánh overlap, latency và số lần yêu cầu nhắc lại.
- Phỏng vấn ngắn người tham gia sau cuộc họp.

### Slice 5 - Optional Audio Booth Experiment

Chỉ mở slice này nếu dữ liệu pilot cho thấy người dùng thường xuyên sử dụng TTS thủ công.

---

## 8. Audio Booth Guardrails for a Later Experiment

Nếu triển khai auto-TTS:

- Chỉ đọc subtitle `isFinal=true` và bỏ qua phát ngôn của chính listener.
- Dùng queue tuần tự; không gọi `cancel()` mỗi khi subtitle mới đến.
- Bỏ qua câu đã chờ quá 2 giây để tránh đọc nội dung lỗi thời.
- Kiểm tra locale và voice thực tế trên thiết bị; fallback về subtitle-only khi thiếu voice.
- Ưu tiên local voice khi khách hàng yêu cầu private/on-premise.
- Với MVP experiment, duck toàn bộ remote audio thay vì cố xác định riêng speaker.
- Dùng mức mục tiêu khoảng `-15dB` (gain xấp xỉ `0.18`), ramp xuống/lên trong 150-250ms.
- Luôn restore volume trong `onend`, `onerror`, cancel, unmount và reconnect.
- Đo riêng `tts_queue_lag`; tự tắt auto-TTS nếu queue không theo kịp cuộc hội thoại.

---

## 9. Technical and Product Constraints

- Các con số CPU/RAM/latency phải được ghi là hypothesis cho đến khi có load/soak test trên profile tương ứng.
- Không dùng kết quả text fixture để chứng minh độ trễ audio thật.
- Chỉ tuyên bố fully self-hosted khi translation backend offline đã được triển khai và kiểm chứng; cấu hình cloud không đáp ứng air-gapped deployment.
- Không mô tả Web Speech API là luôn có giọng Neural. Voice phụ thuộc browser, OS, locale và có thể là remote service.
- Verification dựa trên command thành công, không hard-code tổng số test vì số lượng test sẽ thay đổi.

### Required verification commands

```bash
python -m pytest tests/ apps/ai-service/tests/ -v
dotnet test tests/AITranslateMeeting.Api.Tests/AITranslateMeeting.Api.Tests.csproj
cd apps/web && npm run lint && npm run build
```

Ngoài test tự động, Soft Floor cần browser smoke test với ít nhất hai participant thật vì unit test không chứng minh mapping LiveKit hoặc hành vi lượt nói.

---

## 10. Open Questions

- Badge nên hiển thị hai trạng thái riêng `Đang xử lý` và `Đang dịch`, hay một trạng thái đơn giản để giảm cognitive load?
- Khi người mới bắt đầu nói trong lúc bản dịch trước chưa sẵn sàng, badge nên giữ ở speaker cũ hay chuyển trọng tâm sang speaker mới?
- Pilot có yêu cầu lưu transcript sau khi reload hay chỉ cần xem lại trong cuộc họp?
- Khách hàng có chấp nhận remote Web Speech voice, hay bắt buộc `localService=true`?
- Mức giảm overlap bao nhiêu là đủ để người dùng cảm nhận cuộc họp tốt hơn?

## 11. Recommended Next Decision

Ưu tiên triển khai **Slice 0 và Slice 1**. Không bắt đầu auto-TTS hoặc audio ducking trước khi có:

1. Baseline overlap và latency bằng audio thật.
2. Contract `pipeline_status` ổn định.
3. Mapping chính xác giữa subtitle participant và LiveKit participant.
4. Pilot evidence cho thấy TTS thủ công có nhu cầu sử dụng đáng kể.
