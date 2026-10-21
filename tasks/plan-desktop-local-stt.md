# Kế hoạch: Desktop chạy STT cục bộ để giảm chi phí server

## Mục tiêu

Desktop app tự nhận dạng giọng nói trên máy người dùng và chỉ gửi text lên server.
Server không còn chạy sherpa/whisper hay gọi Groq STT cho người dùng desktop, nên giảm CPU `ai-service` và tiền Groq theo giờ audio.

## Hiện trạng (đã xác minh trong code)

- Server **đã hỗ trợ** giao thức `client_transcript` (`apps/ai-service/app/websocket/transcribe_handler.py` ~dòng 578): bỏ qua STT server, tin `sourceLanguage` của client, vẫn dịch và broadcast.
- Web đã có `SubtitleService.sendSpeechText()` gửi `client_transcript` (`apps/web/src/services/subtitleService.ts:296`), hiện chỉ dùng cho browser SpeechRecognition.
- Desktop (`apps/desktop/src-tauri/src/audio_engine.rs`) đã thu cpal, hạ mẫu 16 kHz mono, tính RMS. **Chưa có STT cục bộ**: audio vẫn đi lên server.

## Phạm vi

Trong phạm vi: STT cục bộ cho desktop. Dịch vẫn ở server (cache Redis đang tắt, xem Phase 3).
Ngoài phạm vi: web/mobile, đổi hạ tầng.

## Phase 1: STT cục bộ trong Tauri

1. Thêm crate `sherpa-onnx` (hoặc `sherpa-rs`) vào `src-tauri/Cargo.toml`; tải model zipformer đa ngữ (cùng model server đang dùng) về thư mục dữ liệu app ở lần chạy đầu, có checksum.
2. Trong `audio_engine.rs`, đưa chunk 16 kHz vào recognizer streaming, giữ VAD/RMS hiện có.
3. Phát sự kiện Tauri `local-transcript {text, language, isFinal, confidence}` (partial và final).
4. Verify: `cargo check`, unit test cho bộ đệm/resample, chạy thử WAV mẫu (`vi_sample_16k.pcm`, `en_sample_16k.pcm`, `ja_sample_16k.pcm` có sẵn ở root).

## Phase 2: Nối vào luồng phụ đề

1. `desktopBridge.ts`: lắng nghe `local-transcript`, gọi `sendSpeechText()`; khi bật chế độ cục bộ thì **không** gọi `sendAudioChunk()`.
2. Cờ cấu hình `localStt` (mặc định bật trên desktop nếu model sẵn sàng, tự về streaming audio nếu model lỗi/chưa tải).
3. Verify: lint + build web, test hợp đồng Python (`client_transcript` bỏ qua STT, 0 lần gọi provider), đo CPU ai-service trước/sau với `scripts/load-test.py`.

## Phase 3: Giảm chi phí còn lại ở server (rủi ro thấp, làm sau cùng)

- `TRANSLATION_CACHE_ENABLED` đang mặc định `false` trong `docker-compose.production.yml`; bật lên để dùng Redis cache câu lặp.
- Cân nhắc `LAYA_ENABLED` theo gói và `WHISPER_MODEL` nhỏ hơn cho người dùng web.

## Rủi ro

- Độ chính xác zipformer < whisper-large/PhoWhisper cho tiếng Việt; cần đo WER trước khi mặc định bật.
- Dung lượng app tăng (model vài chục đến vài trăm MB) → tải lần đầu thay vì nhúng vào installer.
- Máy yếu có thể không đủ CPU → cần tự fallback về audio lên server.

## Tiêu chí hoàn thành

- Phiên desktop không còn frame audio nào gửi lên `/ws/transcribe`; phụ đề song ngữ vẫn hiển thị với TTFS chấp nhận được.
- Toàn bộ test trong AGENTS.md (mục 3) vẫn đạt.
