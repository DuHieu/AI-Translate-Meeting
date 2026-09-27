# Laya Reflex-Gated Meeting Intelligence

## Problem Statement
> **How Might We** tận dụng tốc độ sub-35ms của Laya (`laya-multilingual`) để phát hiện tức thì Action Items và Decisions từ luồng phụ đề WebRTC đa ngữ thời gian thực, đồng thời cắt giảm >85% chi phí token LLM mà không gây trễ nhịp cuộc họp?

---

## Recommended Direction

**Kiến trúc Reflex-Gate (System 1 + System 2 Hybrid):**
1. **System 1 Reflex Layer (<35ms):** Khi `ai-service` nhận được câu hoàn chỉnh (`transcript.is_final == True`) từ luồng Whisper STT, nó gửi HTTP POST sang container `laya-serve` qua mạng Docker nội bộ. Laya đánh giá hai câu hỏi định kiểu:
   - `action_item` (`noul`): *"Does this sentence assign a task, duty, action item, or deadline to someone?"*
   - `decision_made` (`noul`): *"Does this sentence announce an agreement, conclusion, consensus, or final decision?"*
2. **In-Stream Subtitle Enrichment:** Nếu xác suất $P \ge \text{threshold}$ (mặc định $0.80$, có thể tùy chỉnh từ UI), `ai-service` gắn tag `action_item` hoặc `decision` vào `SubtitleBroadcastMessage` gửi qua WebSocket cho React client để hiển thị badge thời gian thực.
3. **Persisted Meeting Minutes:** Các câu được gắn tag sẽ được đẩy sang backend `apps/api` (ASP.NET Core / EF Core) để lưu vào PostgreSQL, tự động sinh biên bản tổng kết (Action Items List) ngay khi kết thúc cuộc họp.
4. **Trigger Gate cho System 2 (Optional):** Chỉ những câu vượt ngưỡng tin cậy mới được đưa vào hàng đợi để LLM tạo sinh (nếu cần) trích xuất chi tiết Assignee và Due Date. Toàn bộ 85–90% câu giao tiếp thông thường bị Laya chặn lại ở cấp độ System 1, không tốn token LLM.

```mermaid
flowchart TD
    A["LiveKit WebRTC Audio"] --> B["Whisper STT (ai-service)"]
    B -->|transcript.is_final| C["Laya System 1 Service (laya-serve:8000)"]
    C -->|sub-35ms typed decision| D{"P(action/decision) >= Threshold?"}
    D -->|No (85-90% conversation)| E["Bỏ qua, chỉ gửi subtitle thông thường"]
    D -->|Yes (P >= 0.80)| F["WebSocket Tagging -> React UI Badge"]
    F --> G["Lưu Action Item vào PostgreSQL (EF Core)"]
    G --> H["Biên bản họp sẵn sàng ngay khi kết thúc phòng"]
```

---

## Technical Contract & Questions Definition

### Laya Schema (`questions.json`)
```json
{
  "action_item": {
    "type": "noul",
    "instructions": "Does this statement assign a task, deliverable, action item, or deadline to someone?",
    "criteria": {
      "false": "casual chat, greeting, question, or general status without specific task assignment",
      "true": "explicit or implicit assignment of a task, promise to do something, or setting a deadline"
    }
  },
  "decision_made": {
    "type": "noul",
    "instructions": "Does this statement confirm a final decision, agreement, or consensus?",
    "criteria": {
      "false": "debate, proposal, suggestion, or brainstorming without final consensus",
      "true": "explicit confirmation of a choice, approval, agreement, or closing of a debate"
    }
  }
}
```

### Subtitle WebSocket Payload Update
```typescript
interface SubtitleBroadcastMessage {
  meetingId: string;
  participantId: string;
  participantName: string;
  language: string;
  text: string;
  isFinal: boolean;
  tags?: Array<"action_item" | "decision">;
  confidence?: number;
}
```

---

## Key Assumptions to Validate
- [ ] **A1 — Độ nhạy tiếng Việt của `laya-multilingual`:** Đo accuracy và calibration trên bộ 50 câu hội thoại họp tiếng Việt mẫu (chia việc, hẹn deadline, chốt ý kiến).
- [ ] **A2 — Độ trễ Docker Network:** Xác nhận round-trip latency từ `ai-service` sang `laya-serve` qua mạng Docker bridge $\le 45\text{ms}$.
- [ ] **A3 — Lưu trữ bất đồng bộ:** Việc ghi log Action Item vào PostgreSQL không làm nghẽn tiến trình phát subtitle WebSocket.

---

## MVP Scope

### In Scope
1. **Docker Service `laya-serve`:** Thêm container `laya-serve` vào `docker-compose.yml`, mount cache checkpoint `convaiinnovations/laya` subfolder `multilingual`.
2. **`LayaClient` trong `apps/ai-service`:** Module Python gọi `http://laya-serve:8000/v1/systemone` hoặc `/predict`.
3. **WebSocket Subtitle Tagging:** Thêm mảng `tags` và `confidence` vào schema `SubtitleBroadcastMessage`.
4. **PostgreSQL Persistence:** Tạo Entity `MeetingActionItem` trong `apps/api` (ASP.NET Core) và endpoint lưu trữ bất đồng bộ.
5. **UI Badging & Threshold Setting:**
   - Badge hiển thị trực tiếp trên dòng subtitle đang nói.
   - Panel bên phải gom danh sách "Action Items & Decisions".
   - Slider trên giao diện cho phép người dùng chỉnh `Confidence Threshold` (mặc định 0.80).

### Out of Scope (Not Doing & Why)
- **Không tự fine-tune checkpoint ngay:** Tận dụng zero-shot của `laya-multilingual`. Chỉ cân nhắc fine-tune khi đã có dataset họp thực tế.
- **Không dùng Laya để tóm tắt văn bản dài:** Laya là non-autoregressive decision engine, không phải generative model.
- **Không phân tích cảm xúc (Emotion/Sentiment) trong MVP:** Giữ giao diện tối giản, tập trung vào giá trị cốt lõi là ghi nhận công việc.
- **Không gọi LLM tốn phí ở bước phân loại:** Toàn bộ quá trình gắn nhãn thời gian thực thực hiện 100% bằng Laya on-device/local.

---

## Next Action Checklist
1. Cập nhật `docker-compose.yml` để bổ sung container `laya-serve`.
2. Viết unit test & benchmark bộ câu họp tiếng Việt với `laya.Router`.
3. Tích hợp `LayaClient` vào `TranscribeWebSocketHandler` của `apps/ai-service`.
4. Cập nhật giao diện `apps/web` để hiển thị badge và panel Action Items.
