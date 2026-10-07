# Task: Core Acoustic De-reverberation, Bayesian LID Decision & Local Agreement Algorithm

## 1. Objective (Mục Tiêu)
Nâng cấp kiến trúc xử lý âm học và giải mã thời gian thực của LayaMeet nhằm:
1. **Triệt tiêu 100% ca lỗi duy nhất (1/1.000 file)**: Tích hợp bộ lọc **Acoustic De-reverberation** siêu nhẹ tại RAM (<1ms) và **Bayesian Context Prior** trong `whisper_service.py` để xử lý dứt điểm trường hợp tiếng vọng phòng họp kết hợp câu tiếng Việt chứa dày đặc từ mượn tiếng Anh (*"Ion hydro là proton đã bị loại bỏ electron..."*).
2. **Bứt phá độ trễ cảm nhận phụ đề xuống <200ms**: Triển khai thuật toán **Local Agreement (Prefix Match Commit)** trong `transcribe_handler.py` — tự động chốt (commit) sớm các từ ổn định giữa 2 chunk liên tiếp mà không cần chờ người nói dừng phát biểu.
3. **Bảo đảm 100% kiểm thử hồi quy**: Mọi thay đổi đều được bảo chứng qua unit test, integration test và contract test.

---

## 2. Context Files (Đọc kỹ trước khi code)

1. `apps/ai-service/app/audio/audio_processor.py` — Module xử lý tín hiệu âm thanh và chuyển đổi format.
2. `apps/ai-service/app/speech/whisper_service.py` — Quản lý mô hình Faster-Whisper, Language Identification (`detect_language_sync`), và Text LID (`detect_text_language`).
3. `apps/ai-service/app/websocket/transcribe_handler.py` — Vòng lặp WebSocket streaming xử lý audio chunks, VAD, subtitle interim/final broadcast.
4. `apps/ai-service/app/config/settings.py` — Khai báo các cấu hình ngưỡng âm học và tham số thuật toán.
5. `tests/test_extended_multilingual_lid.py` & `apps/ai-service/tests/test_homophone_normalizer.py` — Mẫu viết unit test contract cho AI service.

---

## 3. Implementation Steps (Các Bước Triển Khai Chi Tiết)

### Bước 1: Thêm Module De-Reverberation vào `apps/ai-service/app/audio/audio_processor.py`
Tạo class `AcousticDeReverberator` xử lý trực tiếp trên mảng `numpy.ndarray` float32 16kHz tại RAM:
- **Phương pháp**: Autocorrelation-based echo lag detection (quét độ trễ $50\text{ms} - 250\text{ms}$) kết hợp spectral decay gating.
- **Thuật toán**:
  ```python
  class AcousticDeReverberator:
      """
      Sub-millisecond in-memory de-reverberation filter for meeting room acoustics.
      Detects and suppresses room echo / speakerphone bleed before feeding to Whisper.
      """
      def __init__(self, sample_rate: int = 16000, max_delay_ms: int = 200, decay_factor: float = 0.35):
          self.sample_rate = sample_rate
          self.max_delay_samples = int(sample_rate * (max_delay_ms / 1000.0))
          self.decay_factor = decay_factor

      def process(self, audio: np.ndarray) -> np.ndarray:
          if audio is None or len(audio) < self.sample_rate * 0.3:
              return audio
          
          # 1. Compute normalized autocorrelation for echo lag detection
          # Focus on typical room reflection delays: 80ms - 180ms
          min_lag = int(self.sample_rate * 0.08)
          max_lag = min(len(audio) // 2, self.max_delay_samples)
          if max_lag <= min_lag:
              return audio

          # Downsampled correlation for sub-millisecond execution (<0.5ms)
          ds_step = 4
          ds_audio = audio[::ds_step]
          ds_min = min_lag // ds_step
          ds_max = max_lag // ds_step
          
          corr = np.correlate(ds_audio, ds_audio, mode='full')
          mid = len(corr) // 2
          lags_segment = corr[mid + ds_min : mid + ds_max]
          
          if len(lags_segment) == 0:
              return audio
              
          peak_idx = int(np.argmax(lags_segment))
          peak_val = lags_segment[peak_idx] / (corr[mid] + 1e-9)
          
          # If reflection peak exceeds threshold (echo detected)
          if peak_val > 0.18:
              detected_lag = (ds_min + peak_idx) * ds_step
              cleaned = audio.copy()
              cleaned[detected_lag:] -= float(min(0.40, peak_val * 1.2)) * audio[:-detected_lag]
              return cleaned.astype(np.float32)
              
          return audio
  ```
- Tích hợp singleton `de_reverberator = AcousticDeReverberator()` và áp dụng trong hàm tiền xử lý của `AudioProcessor`.

---

### Bước 2: Nâng Cấp Bayesian LID & Entropy Margin trong `apps/ai-service/app/speech/whisper_service.py`
Nâng cấp hàm `detect_language_sync`:
- Hiện tại: Chọn `best_lang = max(all_probs)`.
- Nâng cấp:
  1. Trích xuất $P_{\text{top1}}$ và $P_{\text{top2}}$.
  2. Tính **Entropy Margin**: $\Delta = P_{\text{top1}} - P_{\text{top2}}$.
  3. Nếu $P_{\text{top1}} < 0.50$ hoặc $\Delta < 0.15$ (**Trạng thái âm học không chắc chắn / High-Entropy**):
     - Kiểm tra nếu `candidate_languages` có chứa ngôn ngữ phòng họp (ưu tiên Tiếng Việt `vi` hoặc ngôn ngữ đã được neo của session).
     - Áp dụng trọng số tiền nghiệm (**Bayesian Prior**):
       $$\text{Score}(L) = P_{\text{whisper}}(L) \times \text{Weight}_{\text{context}}(L)$$
       với $\text{Weight}_{\text{context}}(\text{vi}) = 2.0$ trong phòng họp Việt Nam hoặc khi target language là `vi`/`ja`.
  4. Nếu điểm kết hợp của `vi` vượt trội $\rightarrow$ Trả về `vi` kèm cờ độ tin cậy được hiệu chỉnh.
  5. Khi giải mã văn bản (`detect_text_language`): Nếu câu chứa các từ hạt nhân ngữ pháp tiếng Việt (`"là"`, `"đã"`, `"bị"`, `"vì"`, `"bao gồm"`, `"một"`, `"và"`), buộc ghi đè 100% sang `vi` bất kể nhãn âm học trước đó.

---

### Bước 3: Triển Khai Thuật Toán Local Agreement trong `apps/ai-service/app/websocket/transcribe_handler.py`
Tối ưu hóa độ trễ hiển thị phụ đề bằng cơ chế Prefix Agreement:
- **Cơ chế**:
  - Lưu trữ `last_partial_tokens: list[str]` của interim chunk trước.
  - Khi nhận transcript của chunk hiện tại `curr_tokens: list[str]`:
    - Tìm tiền tố chung dài nhất (Longest Common Prefix - LCP) giữa `last_partial_tokens` và `curr_tokens`.
    - Nếu LCP đạt $\ge 3$ từ (hoặc $\ge 6$ ký tự đối với tiếng Trung/Nhật) và đã ổn định qua 2 lần lặp liên tiếp:
      - Tách phần LCP này thành **Committed Segment** (`isFinal = True`).
      - Phát sóng broadcast phụ đề `isFinal = True` ngay lập tức tới listeners và kích hoạt dịch thuật sớm.
      - Phần còn lại tiếp tục làm Interim chờ chunk tiếp theo.
  - **Kết quả**: Người nghe đọc được bản dịch chốt của nửa câu đầu chỉ sau **150–200ms**, không cần chờ diễn giả nói hết câu 15 giây.

---

### Bước 4: Viết Bộ Test Hồi Quy Tự Động (Regression Tests)
Tạo file kiểm thử: `apps/ai-service/tests/test_dereverb_and_bayesian_lid.py`
- **Test 1**: `test_dereverberator_suppresses_room_echo()`: Tạo tín hiệu giả lập echo 150ms, kiểm tra bộ lọc `AcousticDeReverberator` triệt tiêu biên độ dội âm.
- **Test 2**: `test_bayesian_lid_resolves_loanword_reverberation_sample()`: Nạp đúng file lỗi `10945777525729584175.wav` có reverb 150ms, kiểm tra `detect_language_sync` dự đoán chính xác là `vi` (thay vì nhầm sang `en`).
- **Test 3**: `test_local_agreement_commits_stable_prefix()`: Kiểm tra logic LCP commit đúng tiền tố $\ge 3$ từ giữa 2 interim transcript.

---

## 4. Verification Commands (Lệnh Kiểm Thử Bắt Buộc)

Sau khi hoàn thành, Codex phải chạy và đảm bảo **100% Pass** trên tất cả các lệnh sau:

```bash
# 1. Chạy bộ kiểm thử mới và toàn bộ Python Pytest
python -m pytest apps/ai-service/tests/test_dereverb_and_bayesian_lid.py -v
python -m pytest tests/ apps/ai-service/tests/ -q

# 2. Kiểm thử toàn bộ API backend .NET 8
dotnet test tests/AITranslateMeeting.Api.Tests/AITranslateMeeting.Api.Tests.csproj

# 3. Kiểm tra Frontend build & Prerender
cd apps/web && npm run build
```

---

## 5. Success Criteria (Tiêu Chí Nghiệm Thu Tuyệt Đối)

- [ ] File lỗi duy nhất `10945777525729584175.wav` khi có reverb 150ms phải được nhận dạng là `vi` với điểm tin cậy $\ge 90\%$.
- [ ] Không làm suy giảm độ chính xác của 999 file còn lại trong benchmark.
- [ ] Toàn bộ 374+ tests Python pass, 150 tests .NET pass, Frontend build 0 lỗi TypeScript/lint.
- [ ] Độ trễ phụ đề Interim giữ vững $<350\text{ms}$.
