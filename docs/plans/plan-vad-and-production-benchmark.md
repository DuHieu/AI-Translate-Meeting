# 🚀 KẾ HOẠCH TRIỂN KHAI 2 GIAI ĐOẠN: CLIENT-SIDE VAD & PRODUCTION BENCHMARK (20 ROOMS / 500 CCU)

> **File:** `docs/plans/plan-vad-and-production-benchmark.md`  
> **Dự án:** `AI-Translate-Meeting` (`layameet.com`)  
> **Phiên bản:** `1.0.0-EXECUTION`  
> **Mục tiêu quy mô:** 20–30 Phòng họp đồng thời / 500 người dùng trực tuyến (CCU)  
> **Mục tiêu chi phí:** $\le \$20\text{/tháng}$ trên VPS 4 vCPU / 8GB RAM  
> **Chỉ dẫn thực thi:** Dành cho Cursor AI / Developer triển khai trực tiếp, tuân thủ nghiêm ngặt quy chuẩn kỹ thuật.

---

## 📌 TỔNG QUAN 2 GIAI ĐOẠN

```
┌────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 1: TỐI ƯU HÓA PHÍA CLIENT (CLIENT-SIDE VAD) │
│ - WebAssembly / AudioWorklet xử lý âm thanh độc lập    │
│ - Chặn 100% audio frame khi người dùng im lặng         │
│ - Giảm 95% áp lực tính toán và băng thông server       │
└────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 2: DEPLOY PRODUCTION & BENCHMARK TẢI CAO    │
│ - Cấu hình Groq LPU API trên layameet.com             │
│ - Chạy kịch bản đo tải 20 phòng / 500 CCU thực tế     │
│ - Xác minh SLA: TTFS < 250ms, CPU VPS < 30%           │
└────────────────────────────────────────────────────────┘
```

---

# GIAI ĐOẠN 1: NÂNG CẤP CLIENT-SIDE VAD (AUDIOWORKLET + RING BUFFER)

### 1.1. Bối cảnh & Vấn đề Kỹ thuật
* **Hiện trạng**: `apps/web/src/hooks/useSubtitle.ts` đang dùng `ScriptProcessorNode` cũ (chạy trên Main Thread của trình duyệt gây lag UI) và thuật toán `RMS Thresholding` cơ bản.
* **Hậu quả**: Khi phòng họp có 25 người, tiếng thở nhẹ, tiếng gõ phím cạch cạch hoặc tạp âm môi trường vẫn kích hoạt gửi frame lên server, gây lãng phí chu kỳ xử lý của AI Service.
* **Mục tiêu**:
  1. Di chuyển toàn bộ việc phân tích audio sang **AudioWorklet** chạy ở background thread độc lập của trình duyệt (không bao giờ drop frame video WebRTC).
  2. Tích hợp bộ đệm Circular RingBuffer gom đúng 350ms audio chunk (16kHz PCM).
  3. Khi người dùng im lặng: **Hoàn toàn KHÔNG gửi 1 byte WebSocket nào lên server**.
  4. Cơ chế Hangover thông minh (2–3 chunks) để không bị ngắt cụt âm cuối khi người nói ngắt câu.

---

### 1.2. Danh sách Task Chi Tiết

#### Task 1.1.1: Tạo AudioWorklet Processor chuyên dụng
- **Vị trí file**: `apps/web/public/audio-processors/vad-processor.js`
- **Nội dung thực hiện**:
  1. Đăng ký `registerProcessor('vad-audio-processor', VadAudioProcessor)`:
     ```javascript
     class VadAudioProcessor extends AudioWorkletProcessor {
       constructor() {
         super();
         this.sampleRate = 16000;
         this.chunkSize = 5600; // 350ms ở 16kHz
         this.buffer = new Float32Array(this.chunkSize);
         this.bufferIndex = 0;
         this.isSpeaking = false;
         this.silenceHangover = 0;
         this.maxHangover = 2; // Giữ 2 chunk (~700ms) sau khi ngừng nói
       }
       process(inputs, outputs, parameters) { ... }
     }
     ```
  2. Chuyển đổi tần số lấy mẫu (Resampling) từ input sang 16kHz mono.
  3. Tính toán năng lượng âm học (Energy & Zero-Crossing Rate):
     - Nếu phát hiện giọng nói (`RMS > Threshold`): Đưa dữ liệu vào buffer, gửi message `{ type: 'SPEECH_CHUNK', data: int16PcmBuffer, isSpeaking: true }`.
     - Nếu im lặng: Gửi message `{ type: 'SILENCE_HEARTBEAT', isSpeaking: false }` và **hủy bỏ buffer âm thanh** (không gửi mảng byte).

#### Task 1.1.2: Tái cấu trúc hook `useSubtitle.ts`
- **Vị trí file**: `apps/web/src/hooks/useSubtitle.ts`
- **Nội dung thực hiện**:
  1. Khởi tạo `AudioWorkletNode`:
     ```typescript
     await audioCtx.audioWorklet.addModule('/audio-processors/vad-processor.js');
     const vadNode = new AudioWorkletNode(audioCtx, 'vad-audio-processor');
     sourceNode.connect(vadNode);
     ```
  2. Lắng nghe port message:
     ```typescript
     vadNode.port.onmessage = (event) => {
       const { type, data, isSpeaking } = event.data;
       setIsSpeaking(isSpeaking);
       if (type === 'SPEECH_CHUNK' && subtitleWsService.isConnected()) {
         subtitleWsService.sendAudioChunk(data);
       }
     };
     ```
  3. Expose state `isSpeaking: boolean` ra ngoài hook để phục vụ UI.

#### Task 1.1.3: Visual Feedback trên UI (Thanh điều khiển cuộc họp)
- **Vị trí file**: `apps/web/src/components/meeting/MeetingBottomBar.tsx`
- **Nội dung thực hiện**:
  - Nhận prop `isSpeaking` từ `useSubtitle`.
  - Nút Micro hiển thị viền hiệu ứng xanh lá (`ring-2 ring-emerald-500 animate-pulse shadow-emerald-500/20`) khi phát hiện giọng nói người dùng.
  - Khi im lặng: Trở về trạng thái tĩnh bình thường, giúp người dùng an tâm là âm thanh không bị truyền trộm khi không nói.

---

# GIAI ĐOẠN 2: DEPLOY PRODUCTION & BENCHMARK TẢI CAO (20 ROOMS / 500 CCU)

### 2.1. Bối cảnh & Mục tiêu Kỹ thuật
* **Mục tiêu**: Đưa toàn bộ cấu hình **Omni-Language Router** (Groq LPU cho tiếng quốc tế, PhoWhisper CT2 cho tiếng Việt, RTL cho tiếng Ả Rập) lên máy chủ thực tế `layameet.com`.
* **Kỳ vọng hiệu năng**:
  * 20 phòng họp hoạt động đồng thời (mỗi phòng ~25 người tham gia).
  * Độ trễ nhận dạng phụ đề TTFS Median (p50) $\le 200\text{ms}$.
  * Mức sử dụng CPU của VPS Hetzner/OVH duy trì $\le 30\%$.

---

### 2.2. Danh sách Task Chi Tiết

#### Task 2.1.1: Cấu hình Môi trường Production (`.env.production`)
- **Vị trí**: Trên máy chủ VPS (`/opt/ai-translate-meeting/.env.production`)
- **Thông số cấu hình bắt buộc**:
  ```bash
  # STT Omni-Router Config
  STT_PROVIDER=groq
  GROQ_API_KEY=gsk_your_groq_api_key_here
  GROQ_STT_MODEL=whisper-large-v3-turbo
  GROQ_STT_TIMEOUT_SECONDS=3.0

  # Nâng trần hạn mức phục vụ quy mô SaaS
  DEFAULT_MAX_ROOMS=25
  DEFAULT_MAX_PARTICIPANTS=50
  LICENSE_KEY=
  ```

#### Task 2.1.2: Triển khai Docker Stack Không Gián Đoạn (Zero-Downtime Rollout)
- **Quy trình lệnh trên VPS**:
  ```bash
  # 1. Kéo mã nguồn mới nhất từ GitLab
  git pull origin main

  # 2. Build và khởi động lại dịch vụ
  docker compose -f docker-compose.production.yml build web ai-service api
  docker compose -f docker-compose.production.yml up -d --remove-orphans

  # 3. Kiểm tra sức khỏe toàn hệ thống
  curl -s https://layameet.com/ai-health/ready | jq .
  curl -s https://layameet.com/health/live
  ```

#### Task 2.1.3: Nâng cấp Kịch bản Đo Tải Thực Tế (`scripts/load-test.py`)
- **Vị trí file**: `scripts/load-test.py`
- **Nội dung thực hiện**:
  1. Hỗ trợ kịch bản mô phỏng đa ngôn ngữ đồng thời:
     ```bash
     python scripts/load-test.py \
       --api-url https://layameet.com \
       --ws-url wss://layameet.com \
       --rooms 20 \
       --participants-per-room 25 \
       --speakers-per-room 1 \
       --sample-file vi_sample_16k.pcm \
       --output-json benchmark-production-20rooms.json
     ```
  2. Bổ sung bộ thu thập metrics:
     - Số lượng audio chunks stream thực tế.
     - Số lượng phụ đề broadcast thành công.
     - Phân tích TTFS p50, p95 cho từng luồng.
     - Kiểm tra xác nhận **Zero Cross-Room Subtitle Leakage** (0% rò rỉ phụ đề giữa các phòng).

---

## 🧪 BỘ KIỂM THỬ NGHIỆM THU (VERIFICATION GATES)

Mọi code triển khai bởi Cursor bắt buộc phải vượt qua toàn bộ 3 cổng kiểm thử trước khi bàn giao:

```bash
# Cổng 1: Toàn bộ Unit & Contract Tests của Python AI Service
python -m pytest tests/ apps/ai-service/tests/ -v

# Cổng 2: Toàn bộ Unit & Integration Tests của .NET 8 API
dotnet test tests/AITranslateMeeting.Api.Tests/AITranslateMeeting.Api.Tests.csproj

# Cổng 3: Kiểm tra chất lượng mã nguồn Frontend & Production Bundle
cd apps/web && npm run build
```

---

## 📊 BẢNG THEO DÕI TIẾN ĐỘ (TASK CHECKLIST)

- [x] **Giai đoạn 1: Client VAD Optimization**
  - [x] `apps/web/public/audio-processors/vad-processor.js` (AudioWorklet RingBuffer)
  - [x] `apps/web/src/hooks/useSubtitle.ts` (Refactor connect AudioWorklet, expose `isSpeaking`)
  - [x] `apps/web/src/components/meeting/MeetingBottomBar.tsx` (UI Mic Visual Ring Effect)
  - [x] `npm run build` verify không phát sinh lỗi bundle hoặc memory leak
- [ ] **Giai đoạn 2: Production Benchmark & Deployment**
  - [ ] Điền `GROQ_API_KEY` vào `.env.production` trên VPS
  - [x] Nâng trần `DEFAULT_MAX_ROOMS=25` và `DEFAULT_MAX_PARTICIPANTS=50` (repo / compose / `.env.production.example`)
  - [ ] Khởi chạy `docker compose -f docker-compose.production.yml up -d`
  - [x] Nâng cấp `scripts/load-test.py` metrics + SLA target 200ms (chạy benchmark trên VPS còn lại)
