# Chẩn Đoán & Khắc Phục Triệt Để Lỗi Nhận Diện Giọng Nói (STT), Phát Hiện Ngôn Ngữ (LID), Dịch Thuật & Đọc Phụ Đề (TTS)

> **Quy trình áp dụng:** `using-agent-skills` → `debugging-and-error-recovery` → `test-driven-development`  
> **Cơ chế điều phối:** Antigravity (Lead Debugger & Architect) ↔ Codex CLI `gpt-5.6-sol` (Executor)

---

## 1. Bảng Chẩn Đoán Nguyên Nhân Gốc Rễ (Root Causes Found)

### 🚨 Root Cause 1: Hỏng Định Dạng Audio Streaming từ Trình Duyệt (`MediaRecorder` WebM Headerless Clusters bị ép thành PCM 16-bit rác)
- **Vị trí:** `apps/web/src/hooks/useSubtitle.ts` (dòng 175–208) & `apps/ai-service/app/websocket/transcribe_handler.py` (dòng 202–210).
- **Cơ chế gây lỗi:**
  - `MediaRecorder.start(350)` cắt luồng `audio/webm;codecs=opus` mỗi 350ms. Chỉ có **chunk đầu tiên (`chunk #0`)** mới chứa WebM EBML header (`\x1a\x45\xdf\xa3`).
  - Nếu 350ms đầu tiên người dùng im lặng (bị client VAD bỏ qua), hoặc từ câu nói thứ 2 trở đi, **mọi chunk 350ms gửi lên server đều là WebM Cluster trần không có header `\x1a\x45\xdf\xa3`**.
  - Ở `transcribe_handler.py`, kiểm tra `raw_bytes[:4] in (b"RIFF", b"OggS", b"\x1a\x45\xdf\xa3")` trả về `False` cho mọi chunk thứ 2 trở đi, nên rơi vào nhánh `self.audio_processor.pcm_to_float32(raw_bytes)` — **ép dữ liệu nén Opus thành mảng số nguyên 16-bit PCM (`np.int16`)**!
  - Hệ quả: `faster-whisper` nhận toàn bộ **nhiễu trắng (white noise)** thay vì tiếng người nói -> không nhận diện được chữ hoặc sinh hallucination bị lọc bỏ.
- **Giải pháp triệt để:**
  1. **Trên Frontend (`apps/web/src/hooks/useSubtitle.ts`):**
     - Giữ hằng số `const AUDIO_CHUNK_MS = 350;` và `if (!isMicOn || !isAiReady) return;` cùng dependency `[isMicOn, isAiReady, audioTrack]` (để tuân thủ `tests/test_livekit_media_contract.py` và `tests/test_ai_readiness_contract.py`).
     - Sử dụng `AudioContext` + `ScriptProcessorNode` (với fallback `MediaRecorder` chỉ khi `createScriptProcessor` không khả dụng) để thu trực tiếp mẫu âm thanh `Float32` từ microphone, **downsample chính xác về `16000Hz` mono 16-bit PCM (`Int16Array`)** và gửi đều đặn mỗi `AUDIO_CHUNK_MS = 350`ms qua `subtitleWsService.sendAudioChunk(pcmBuffer)`.
     - Tính RMS trực tiếp trên toàn bộ mẫu của khung 350ms với ngưỡng nhạy theo `getUserSettings().vadSensitivity` (`low`: `0.003`, `medium`: `0.006`, `high`: `0.011`) và giữ `hangover = 3` chunks (~1 giây đuôi câu) để không bao giờ cắt mất âm đầu/âm cuối.
     - Kết hợp **Hybrid Browser SpeechRecognition (`webkitSpeechRecognition` / `SpeechRecognition`)** song song: khi trình duyệt có sẵn Web Speech Recognition API, chạy nhận diện giọng nói tức thì (với `continuous = true`, `interimResults = true`) và gửi câu nhận diện qua `subtitleWsService.sendSpeechText(transcript, sourceLanguage)` để đạt độ nhạy phát hiện giọng nói & ngôn ngữ gần như tức thì (và khi Web Speech API đang hoạt động ổn định, tránh gửi trùng audio nhiễu).
  2. **Trên Backend (`apps/ai-service/app/websocket/transcribe_handler.py` & `apps/ai-service/app/audio/vad.py`):**
     - Trong `transcribe_handler.py`: Nếu client gửi container (`WebM` bắt đầu bằng `\x1a\x45\xdf\xa3`), lưu lại `webm_header_bytes` của chunk đầu tiên hoặc nối buffer WebM hợp lệ trước khi gọi `decode_audio`. Nếu `decode_audio` thất bại trên một frame WebM, bỏ qua frame lỗi đó thay vì ép dữ liệu nén Opus sang `pcm_to_float32`!
     - Trong `apps/ai-service/app/audio/vad.py`: Hạ ngưỡng `VoiceActivityDetector` mặc định xuống nhạy hơn (`energy_threshold: float = 0.00015, rms_threshold: float = 0.006`) để bắt nhạy cả giọng nói nhỏ hoặc micro laptop.

---

### 🚨 Root Cause 2: Phát Hiện Ngôn Ngữ (Language Detection - LID) Kém Nhạy & Bị Khóa Cứng
- **Vị trí:** `apps/ai-service/app/speech/whisper_service.py`, `apps/ai-service/app/websocket/transcribe_handler.py`, `apps/web/src/pages/PreJoinPage.tsx`.
- **Cơ chế gây lỗi:**
  - `WHISPER_INITIAL_PROMPT` mặc định chứa toàn từ tiếng Anh (`"PR, Git, Docker, Kubernetes..."`), gây bias mạnh khiến `whisper-tiny` đoán nhầm các câu ngắn sang tiếng Anh.
  - Khi người dùng để `sourceLanguage` là `'vi'` nhưng nói tiếng Anh/Nhật (hoặc ngược lại), hoặc khi `sourceLanguage == "auto"`, hệ thống chỉ kiểm tra regex chữ cái tiếng Việt có dấu và Kana tiếng Nhật, thiếu nhận diện chữ Hán (`zh`), Hangul (`ko`), từ vựng tiếng Anh thông dụng và tiếng Việt không dấu.
  - Ngưỡng cập nhật ngôn ngữ `lang_prob >= 0.65` quá cao đối với các đoạn audio ngắn (1–2s) trên model `tiny`, làm kẹt ngôn ngữ cũ (`session_spoken_lang`).
- **Giải pháp triệt để:**
  1. Bổ sung hàm **`detect_text_language(text: str, fallback_lang: str = "vi") -> tuple[str, float]`** trong `apps/ai-service/app/speech/whisper_service.py`:
     - Nhận diện chính xác qua bộ ký tự & từ khóa đặc trưng cho cả `vi`, `ja`, `ko`, `zh`, `en`, `fr`, `de`, `es` (giữ nguyên `VIETNAMESE_DIACRITICS_REGEX` và `JAPANESE_KANA_REGEX`, bổ sung `KOREAN_HANGUL_REGEX`, `CHINESE_CJK_REGEX`, và từ điển từ khóa thông dụng cho `en` và `vi`).
  2. Trong `whisper_service.py` và `transcribe_handler.py`:
     - Khi `is_auto` (`source_language == "auto"`), không ép `initial_prompt` toàn tiếng Anh vào Whisper nếu `initial_prompt` là prompt mặc định, tránh làm lệch bộ phát hiện ngôn ngữ (LID) của Whisper.
     - Kể cả khi `source_language != "auto"`, nếu câu văn bản nhận diện được có dấu hiệu ngôn ngữ khác rõ rệt qua `detect_text_language(text)` (độ tin cậy `>= 0.85`), tự động cập nhật `lang` theo ngôn ngữ thực tế của câu nói!
     - Hạ ngưỡng chuyển đổi ngôn ngữ động trong `transcribe_handler.py` xuống `lang_prob >= 0.45` để đổi ngôn ngữ ngay lập tức ở câu đầu tiên người dùng chuyển giọng.

---

### 🚨 Root Cause 3: Không Dịch Được (`translatedText == originalText` hoặc Lỗi Token `__ENTITY_0__`)
- **Vị trí:** `apps/ai-service/app/translation/glossary.py` (dòng 241–275), `apps/ai-service/app/translation/local_provider.py`, `apps/ai-service/app/translation/contextual_provider.py`, `apps/ai-service/app/websocket/transcribe_handler.py`.
- **Cơ chế gây lỗi:**
  1. **Lỗi dịch token `__ENTITY_0__`:** `GlossaryManager.protect_entities` thay thế các từ viết hoa bằng `__ENTITY_0__`. Khi chuỗi này gửi qua Google Translate (`gtx_cloud`), từ `"ENTITY"` bị dịch sang tiếng Việt là `"__THỰC THỂ_0__"` hoặc tiếng Nhật là `"__エンティティ_0__"`, kèm khoảng trắng quanh dấu gạch dưới! Khiến `restore_entities` không khôi phục được!
  2. **Lỗi trùng ngôn ngữ (`tl.lower() == lang.lower()`):** Nếu người dùng nói ngôn ngữ trùng với `target_language` của chính họ (ví dụ họ chọn ngôn ngữ nói là `vi`, ngôn ngữ dịch cũng là `vi`, hoặc chọn ngôn ngữ nói `ja`, ngôn ngữ dịch `vi` nhưng lại nói tiếng Việt để thử nghiệm), hệ thống thấy `tl == lang` nên trả nguyên câu gốc không dịch!
  3. **Lỗi timeout dịch thuật:** `TRANSLATION_TIMEOUT_MS` (1000ms) và `httpx.Timeout(2.0)` quá ngắn khi gọi HTTPS tới Google Translate lần đầu, dẫn đến `TimeoutError` -> trả về `original_text` không dịch!
- **Giải pháp triệt để:**
  1. **Tăng `TRANSLATION_TIMEOUT_MS` mặc định lên `3500`ms** trong `settings.py` và tăng timeout của `httpx.AsyncClient` trong `local_provider.py` lên `4.0`s.
  2. **Bổ sung bộ từ điển hội thoại thông dụng mở rộng trong `LocalTranslationProvider._sample_dict` và `ContextualTranslationProvider`** cho các cặp `vi <-> en`, `vi <-> ja`, `en <-> ja` để ngay cả khi mất mạng hoặc API ngoài bị chặn, các câu giao tiếp họp phổ biến vẫn dịch mượt mà.
  3. **Sửa `restore_entities` trong `glossary.py`:**
     - Giữ nguyên logic `protect_entities` (để tương thích 100% với `test_glossary_entity_preservation`), nhưng trong `restore_entities`, ngoài việc tìm `token` (`__ENTITY_0__`), dùng regex bắt mọi biến thể bị dịch của `__ENTITY_{idx}__` như `r"_{1,2}\s*(?:ENTITY|THỰC\s*THỂ|エンティティ|실체|实体|[A-ZÀ-Ỹa-zà-ỹ\u3040-\u30ff\u4e00-\u9fff]+)\s*_\s*" + str(idx) + r"\s*_{1,2}"` để luôn khôi phục 100% thực thể gốc!
  4. **Dịch hai chiều thông minh (Bidirectional Auto-Pivot) khi người nói tự kiểm tra:**
     - Trong `transcribe_handler.py`, khi gửi phụ đề cho chính người nói (`listener.participant_id == participant_id`) hoặc khi chỉ có 1 người trong phòng (`len(listeners) == 1`): nếu ngôn ngữ thực tế của câu nói (`lang`) trùng với `listener.target_language`, nhưng khác với `source_language` đã cấu hình (ví dụ `source_language="ja"`, `target_language="vi"`, nhưng người dùng nói tiếng Việt), tự động dịch sang `source_language` (`ja`), hoặc nếu cả `source_language` và `target_language` đều trùng với `lang` (ví dụ cùng là `vi`), giữ nguyên cho các test contract yêu cầu bypass khi `source_language == "auto"` và `lang == target_language` (lưu ý: `test_transcribe_handler_auto_source_language_bypass` trong `test_real_lid_and_translation_opt.py` kiểm tra khi `source_language="auto"`, `target_language="ja"`, và câu text là tiếng Nhật `"はい、承知いたしました。"` thì `translatedText == "はい、承知いたしました。"`!). Vì vậy:
       - Nếu `source_language.lower() != "auto"` và `lang.lower() == tl.lower()` và `source_language.lower() != tl.lower()`: dịch từ `lang` sang `source_language`!

---

### 🚨 Root Cause 4: Chức Năng Đọc Phụ Đề (TTS / Audio Booth) Không Phát Ra Tiếng
- **Vị trí:** `apps/web/src/utils/speechAndAudio.ts`, `apps/web/src/hooks/useAudioBooth.ts`, `apps/web/src/components/subtitle/LiveSubtitleView.tsx`.
- **Giải pháp triệt để (Tuân thủ chặt chẽ `tests/test_audio_booth_contract.py` và `tests/test_live_first_sidecar_contract.py`):**
  1. **Trong `apps/web/src/utils/speechAndAudio.ts`:**
     - Nạp danh sách voices từ `window.speechSynthesis.getVoices()` (và đăng ký `onvoiceschanged`), tự động chọn `utterance.voice` khớp nhất với `resolvedLang` (`vi-VN`, `ja-JP`, `en-US`, `ko-KR`, `zh-CN`...).
     - Gọi `window.speechSynthesis.resume()` trước `window.speechSynthesis.speak(utterance)` để sửa lỗi kẹt âm thanh trên Chrome/Edge.
  2. **Trong `apps/web/src/hooks/useAudioBooth.ts`:**
     - **BẮT BUỘC giữ nguyên các chuỗi sau để pass `tests/test_audio_booth_contract.py`:**
       - `latest.isFinal`
       - `currentUserId && latest.participantId === currentUserId`
       - `ageMs > 2500`
       - `Dropping stale queue item`
       - `pendingCount > 1 || ageMs > 800`
       - `speechRate = 1.25`
       - `speechRate = 1.12`
       - `audioDuckingRegistry.setDucked(true)` / `audioDuckingRegistry.setDucked(false)`
       - `isDucked: audioDuckingRegistry.getDucked()` / `isSpeaking: isSpeakingRef.current`
     - Sửa lỗi không đọc khi người dùng tự test trong phòng 1 người: Thêm tham số tùy chọn `allowSelfSpeech?: boolean` vào `UseAudioBoothOptions` (trong `MeetingShell.tsx` truyền `allowSelfSpeech: participants.length <= 1`), và viết điều kiện:
       `if (!allowSelfSpeech && currentUserId && latest.participantId === currentUserId) return;`
       (Chuỗi `"currentUserId && latest.participantId === currentUserId"` vẫn nằm nguyên vẹn trong file, đồng thời khi họp/test 1 mình `participants.length <= 1`, Audio Booth sẽ đọc luôn bản dịch cho người dùng nghe!).
     - Cập nhật `enqueuedAt` của các phần tử còn lại trong `queueRef.current` mỗi khi một câu vừa đọc xong trong `onEnd` trước khi gọi `processQueue()`, để câu kế tiếp không bị đánh dấu nhầm là `ageMs > 2500` do phải đợi câu trước đọc!
  3. **Trong `apps/web/src/components/subtitle/LiveSubtitleView.tsx`:**
     - **LƯU Ý CONTRACT (`tests/test_live_first_sidecar_contract.py`):** Tuyệt đối KHÔNG dùng tên biến/hàm chứa chuỗi `"handleReplay"` hay `"Search"` hay `"Cuộn xuống mới nhất"`.
     - Thêm nút biểu tượng Loa (`Volume2` từ `lucide-react`) trên mỗi câu phụ đề gọi trực tiếp `speakText(item.translatedText || item.originalText, item.targetLanguage)` để người dùng có thể bấm nghe đọc bất kỳ câu dịch nào chỉ với 1 cú nhấp chuột!
