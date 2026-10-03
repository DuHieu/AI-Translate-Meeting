# Kế hoạch tăng tốc hoàn thiện AI Translate Meeting

## Mục tiêu

Đưa dự án từ MVP scaffold sang bản demo chạy được end-to-end: tạo phòng, join bằng LiveKit, gửi audio sang AI service, nhận subtitle song ngữ trên UI, có test/CI đủ tin cậy để tiếp tục phát triển nhanh.

## Nguyên tắc triển khai

- Ưu tiên luồng demo thật trước: meeting -> audio -> STT -> translation -> subtitle UI.
- Mỗi task phải nhỏ, test được, không trộn refactor lớn với feature.
- Chưa tuyên bố production-ready khi còn dùng mock/local fallback.
- Secrets/CORS/auth production xử lý sau khi luồng demo đã ổn.

## Dependency graph

```text
Docker/runtime routing
  -> Subtitle WebSocket contract
    -> Frontend subtitle UI wiring
      -> Browser audio chunk capture
        -> AI service VAD/STT buffering
          -> Translation provider
            -> End-to-end demo test
              -> Security hardening
              -> Product features
```

## Phase 0: Đóng demo end-to-end

### Task 1: Sửa đường WebSocket subtitle chạy được trong dev và Docker

**Description:** Chuẩn hóa URL `/ws/transcribe` giữa Vite dev server, Nginx Docker web, và FastAPI AI service.

**Acceptance criteria:**
- [ ] Web dev server proxy được `/ws/transcribe` sang AI service.
- [ ] Docker web container proxy được WebSocket sang AI service.
- [ ] README ghi đúng URL và cách kiểm tra WebSocket.

**Verification:**
- [ ] `npm run build`
- [ ] `docker compose up --build`
- [ ] Browser join room không lỗi WebSocket 404/502.

**Dependencies:** None

**Files likely touched:**
- `apps/web/vite.config.ts`
- `apps/web/Dockerfile`
- `docker-compose.yml`
- `README.md`

**Estimated scope:** M

### Task 2: Gắn subtitle overlay/panel vào meeting screen

**Description:** `MeetingShell` hiện chỉ có slot placeholder; cần dùng `useSubtitle` để render `SubtitleOverlay` và transcript panel thực tế.

**Acceptance criteria:**
- [ ] Khi AI service gửi message subtitle, UI hiển thị overlay.
- [ ] Transcript panel lưu lịch sử subtitle trong session.
- [ ] Empty/loading/error state rõ ràng.

**Verification:**
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Manual: gửi mock WS message và thấy subtitle trên meeting screen.

**Dependencies:** Task 1

**Files likely touched:**
- `apps/web/src/components/meeting/MeetingShell.tsx`
- `apps/web/src/components/subtitle/SubtitleOverlay.tsx`
- `apps/web/src/components/subtitle/SubtitlePanel.tsx`
- `apps/web/src/hooks/useSubtitle.ts`
- `apps/web/src/types/subtitle.ts`

**Estimated scope:** M

### Task 3: Chuẩn hóa subtitle message contract

**Description:** Hiện AI service gửi `{ type, data }`, frontend lại check `SubtitleMessage` trực tiếp. Cần thống nhất một shape và validate ở boundary.

**Acceptance criteria:**
- [ ] Frontend parse đúng message từ AI service.
- [ ] AI service schema phản ánh đúng contract.
- [ ] Invalid message không làm crash UI.

**Verification:**
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `python -m compileall -q apps/ai-service/app`

**Dependencies:** Task 2

**Files likely touched:**
- `apps/ai-service/app/schemas/subtitle.py`
- `apps/ai-service/app/websocket/transcribe_handler.py`
- `apps/web/src/services/subtitleService.ts`
- `apps/web/src/types/subtitle.ts`

**Estimated scope:** M

## Checkpoint A: Demo subtitle mock hoạt động

- [ ] Join meeting thành công.
- [ ] WebSocket connected.
- [ ] Subtitle mock từ AI service hiển thị trên overlay.
- [ ] Frontend lint/build pass.
- [ ] API test pass.

## Phase 1: Real audio -> STT -> translation

### Task 4: Capture và gửi audio chunks từ browser

**Description:** Lấy microphone stream trong meeting, chunk audio theo interval ngắn, gửi bytes qua subtitle WebSocket.

**Acceptance criteria:**
- [ ] Chỉ gửi audio khi mic bật.
- [ ] Stop gửi khi leave room hoặc tắt subtitle.
- [ ] Reconnect không tạo nhiều recorder song song.

**Verification:**
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Manual: AI service log nhận audio bytes đều.

**Dependencies:** Checkpoint A

**Files likely touched:**
- `apps/web/src/services/subtitleService.ts`
- `apps/web/src/hooks/useSubtitle.ts`
- `apps/web/src/components/meeting/MeetingShell.tsx`

**Estimated scope:** M

### Task 5: Thay mock STT bằng faster-whisper lazy loading

**Description:** Load model một lần, buffer audio đủ dài, chạy transcribe async an toàn cho CPU local.

**Acceptance criteria:**
- [ ] Không load model khi health check.
- [ ] Empty/noisy chunk không sinh subtitle rác.
- [ ] Có config model/device/compute type từ env.

**Verification:**
- [ ] `python -m compileall -q apps/ai-service/app`
- [ ] Manual: gửi audio sample và nhận transcript.

**Dependencies:** Task 4

**Files likely touched:**
- `apps/ai-service/app/speech/whisper_service.py`
- `apps/ai-service/app/audio/audio_processor.py`
- `apps/ai-service/app/audio/vad.py`
- `apps/ai-service/app/websocket/transcribe_handler.py`

**Estimated scope:** M

### Task 6: Translation provider thật và cache

**Description:** Giữ local fallback nhưng thêm provider thật có config rõ ràng. Redis cache theo source/target/text.

**Acceptance criteria:**
- [ ] Translation provider interface có error handling.
- [ ] Cache hit không gọi lại provider.
- [ ] Same source/target trả nguyên văn.

**Verification:**
- [ ] Python unit tests cho provider/cache.
- [ ] Manual: transcript tiếng Việt trả bản dịch Anh/Nhật.

**Dependencies:** Task 5

**Files likely touched:**
- `apps/ai-service/app/translation/base.py`
- `apps/ai-service/app/translation/local_provider.py`
- `apps/ai-service/app/config/settings.py`
- `apps/ai-service/requirements.txt`

**Estimated scope:** M

## Checkpoint B: Demo thật với microphone

- [ ] User nói vào mic.
- [ ] AI service nhận audio.
- [ ] STT trả transcript thật.
- [ ] Translation trả text target language.
- [ ] UI hiển thị subtitle không cần refresh.

## Phase 2: Stabilize, test, CI

### Task 7: API integration tests

**Description:** Thêm `WebApplicationFactory` tests cho create/join/leave/participants và health endpoint.

**Acceptance criteria:**
- [ ] Test request pipeline thật thay vì chỉ unit service.
- [ ] Override DB bằng test database/in-memory setup.
- [ ] Error responses trả ProblemDetails ổn định.

**Verification:**
- [ ] `dotnet test`

**Dependencies:** None

**Files likely touched:**
- `tests/AITranslateMeeting.Api.Tests/*`
- `apps/api/Program.cs`

**Estimated scope:** M

### Task 8: CI chạy đầy đủ quality gates

**Description:** CI hiện chưa chạy lint/audit/API tests/Python syntax. Cần nâng thành quality gate thật.

**Acceptance criteria:**
- [ ] CI chạy `npm ci`, `npm run lint`, `npm run build`, `npm audit`.
- [ ] CI chạy `dotnet test`.
- [ ] CI chạy Python compile/import smoke.

**Verification:**
- [ ] GitHub Actions pass.

**Dependencies:** Task 7 nếu muốn test API đầy đủ trong CI.

**Files likely touched:**
- `.github/workflows/ci.yml`

**Estimated scope:** S

### Task 9: Docker smoke test

**Description:** Thêm script/manual checklist kiểm tra health của web/API/AI/LiveKit sau `docker compose up`.

**Acceptance criteria:**
- [ ] Health endpoints OK.
- [ ] API kết nối được PostgreSQL.
- [ ] Web load được.
- [ ] AI WebSocket reachable.

**Verification:**
- [ ] `docker compose up --build`
- [ ] Smoke script pass hoặc checklist pass.

**Dependencies:** Task 1

**Files likely touched:**
- `scripts/*`
- `README.md`

**Estimated scope:** S

## Phase 3: Security và production hardening

### Task 10: Room access security

**Description:** Thêm meeting host/admin secret hoặc lightweight auth để tránh ai có code cũng lấy LiveKit token không kiểm soát.

**Acceptance criteria:**
- [ ] Join endpoint validate quyền/phòng.
- [ ] LiveKit token TTL hợp lý.
- [ ] Không log token/secrets.

**Verification:**
- [ ] `dotnet test`
- [ ] Manual: join invalid credential bị reject.

**Dependencies:** Checkpoint B

**Files likely touched:**
- `apps/api/Controllers/MeetingsController.cs`
- `apps/api/Services/MeetingService.cs`
- `apps/api/DTOs/MeetingDtos.cs`
- `tests/AITranslateMeeting.Api.Tests/*`

**Estimated scope:** M

### Task 11: CORS/config/secrets hardening

**Description:** Thay `AllowAll` bằng allowlist config, validate options fail-fast, tách dev defaults khỏi production.

**Acceptance criteria:**
- [ ] CORS origin đọc từ env/config.
- [ ] Missing LiveKit secret ở production làm app fail fast.
- [ ] README ghi rõ production env required.

**Verification:**
- [ ] `dotnet test`
- [ ] Manual: local dev vẫn chạy.

**Dependencies:** Task 10

**Files likely touched:**
- `apps/api/Program.cs`
- `apps/api/Options/LiveKitOptions.cs`
- `apps/api/appsettings.json`
- `.env.example`
- `README.md`

**Estimated scope:** M

## Phase 4: Đề xuất phát triển thêm sau MVP

### Product features nên ưu tiên

1. **Meeting recap bằng AI:** tóm tắt nội dung, action items, quyết định chính.
2. **Export transcript:** tải `.txt`, `.srt`, `.vtt`, `.docx`.
3. **Custom glossary:** ưu tiên dịch đúng thuật ngữ công ty/dự án.
4. **Speaker labels:** gắn subtitle theo speaker/participant.
5. **Recording + replay subtitles:** phát lại meeting kèm transcript song ngữ.
6. **Admin dashboard:** lịch sử phòng, participants, usage, lỗi realtime.
7. **Calendar integrations:** tạo meeting từ Google/Outlook Calendar.
8. **SaaS billing:** plan free/pro, giới hạn phút dịch, Stripe.

### Technical features nên ưu tiên

1. **Observability:** structured logs, latency metrics STT/translation, WebSocket reconnect metrics.
2. **Queue/worker:** tách AI processing khỏi WebSocket handler nếu tải cao.
3. **Model strategy:** CPU local cho dev, GPU/cloud provider cho production.
4. **E2E browser tests:** Playwright cho create/join/subtitle flow.
5. **Load testing:** đo LiveKit + AI service với nhiều participants.

## Parallelization

Có thể chạy song song:

- Task 1 + Task 7 + Task 8
- Task 2 + Task 3 sau khi Task 1 có contract URL rõ
- Task 10 + Task 11 sau Checkpoint B
- Product docs/landing page song song với technical hardening

Không nên chạy song song:

- Task 4/5/6 vì phụ thuộc trực tiếp audio -> STT -> translation.
- Task 10/11 trước khi demo subtitle thật ổn, vì dễ mất thời gian vào hardening khi core flow chưa xong.

## Ước lượng thực tế

| Mốc | Thời gian nếu tập trung | Kết quả |
| --- | --- | --- |
| Checkpoint A | 1-2 ngày | Demo subtitle mock hiển thị thật |
| Checkpoint B | 3-5 ngày | Demo mic -> STT -> translation -> UI |
| CI + tests | 1-2 ngày | Có quality gate ổn định |
| Security hardening cơ bản | 2-3 ngày | Sẵn sàng demo khách hàng/private beta |
| Production beta | 2-4 tuần | Cần auth, secrets, observability, deployment, real model strategy |

## Quyết định đề xuất

Bắt đầu ngay với **Task 1 -> Task 2 -> Task 3**. Đây là đường ngắn nhất để biến UI hiện tại thành demo có subtitle hoạt động, trước khi đầu tư vào STT thật.

---

# Kế hoạch mở rộng: Whisper cold-start hardening

> Ngày lập kế hoạch: 2026-10-02
> Các task MVP phía trên đã được triển khai; trạng thái thực tế được theo dõi trong `tasks/todo.md`. Phần này chỉ mở rộng kế hoạch, không thay thế backlog cũ.

## Tổng quan

Loại bỏ việc người đầu tiên phải chờ model tải trong request audio. AI service sẽ preload Whisper ở background, giữ cache qua các lần recreate container, công bố readiness thật và cho frontend hiển thị rõ trạng thái “AI đang khởi động”. LiveKit meeting vẫn hoạt động khi AI chưa sẵn sàng; chỉ audio subtitle bị tạm dừng.

## Quyết định kiến trúc

- Dùng một `SpeechToTextService` singleton cho preload, health và WebSocket; không tạo model thứ hai.
- State machine: `not_started -> loading -> ready | failed`; preload idempotent, có lock và không block event loop.
- Giữ `/health` để tương thích; thêm `/health/live` và `/health/ready`. Readiness trả HTTP 503 ProblemDetails khi `loading/failed`, không trả exception/path nội bộ.
- Docker dùng named volume cho Hugging Face cache và bật `WHISPER_PRELOAD=true`; không commit model binary vào Git.
- Frontend gọi same-origin `/ai-health/ready` qua Vite/Nginx proxy, không gọi trực tiếp port 8000.
- Meeting vẫn dùng được khi AI lỗi. `useSubtitle` chỉ bắt đầu MediaRecorder và gửi audio sau khi readiness là `ready`.
- Không thêm database, framework hay queue mới.

## Dependency graph

```text
STT lifecycle state + preload API
  -> FastAPI lifespan + readiness contract
    -> Docker persistent cache + healthcheck
    -> Frontend readiness client/hook
      -> Meeting banner + audio gating
        -> Runtime cold/warm verification + docs
```

## Task 15.1: Quản lý lifecycle và preload Whisper

**Description:** Bổ sung state machine, snapshot trạng thái và hàm `preload()` idempotent cho `SpeechToTextService`. Cả preload và transcribe dùng chung model/lock.

**Acceptance criteria:**
- [x] Hai lời gọi preload đồng thời chỉ load model một lần.
- [x] Load thành công chuyển sang `ready`; exception chuyển sang `failed` mà không lộ exception trong public status.
- [x] `transcribe()` vẫn tương thích và có thể phục hồi/retry theo policy đã test.

**Verification:**
- [x] RED -> GREEN: focused tests mới cho `not_started/loading/ready/failed` và concurrent preload.
- [x] `python -m pytest apps/ai-service/tests/test_whisper_readiness.py -v`

**Dependencies:** None

**Files likely touched:**
- `apps/ai-service/app/speech/whisper_service.py`
- `apps/ai-service/tests/test_whisper_readiness.py`

**Estimated scope:** S, 30-45 phút

## Task 15.2: Preload background và health contract

**Description:** FastAPI tạo một STT singleton, truyền nó vào WebSocket handler và kick-off preload bằng lifespan background task. Health endpoint phản ánh cùng instance đó.

**Acceptance criteria:**
- [x] `/health/live` luôn trả 200 khi process/event loop còn sống.
- [x] `/health/ready` trả 503 ProblemDetails trong `not_started/loading/failed`, trả 200 khi `ready`.
- [x] WebSocket sử dụng đúng model instance đã preload, không load lần hai.

**Verification:**
- [x] RED -> GREEN: endpoint tests cho loading, ready, failed và backward-compatible `/health`.
- [x] `python -m pytest apps/ai-service/tests/test_whisper_readiness.py apps/ai-service/tests/test_cors.py -v`

**Dependencies:** Task 15.1

**Files likely touched:**
- `apps/ai-service/app/main.py`
- `apps/ai-service/app/api/health.py`
- `apps/ai-service/app/websocket/transcribe_handler.py`
- `apps/ai-service/tests/test_whisper_readiness.py`

**Estimated scope:** M, 60-90 phút

## Checkpoint C1: Backend readiness

- [x] Focused Python tests pass.
- [x] Event loop/health vẫn phản hồi trong lúc mock model đang load chậm.
- [x] Existing subtitle JWT/WebSocket tests pass.

## Task 15.3: Persist model cache và Docker readiness

**Description:** Bật preload qua env, mount named cache volume và thêm AI service healthcheck dựa trên `/health/ready`. Không bake một model cố định làm mất khả năng đổi `WHISPER_MODEL`.

**Acceptance criteria:**
- [x] Recreate container không tải lại artifact đã có trong cache volume.
- [x] Container chuyển `starting -> healthy` chỉ sau khi model ready; lỗi model chuyển `unhealthy` nhưng không restart-loop phá meeting.
- [x] Model, device, compute type và preload đều cấu hình được bằng env.

**Verification:**
- [x] Contract test kiểm tra volume, env và healthcheck.
- [x] `docker compose config -q`
- [x] Cold start một lần, recreate container và so sánh warm readiness time.

**Dependencies:** Task 15.2

**Files likely touched:**
- `.env.example`
- `docker-compose.yml`
- `tests/test_operations_contract.py`
- `scripts/smoke-test.ps1`

**Estimated scope:** S, 30-45 phút

## Task 15.4: Frontend readiness client và hook

**Description:** Thêm typed client/hook poll `/ai-health/ready`, phân biệt `starting`, `ready`, `failed/unavailable`, có retry/backoff và cleanup khi unmount.

**Acceptance criteria:**
- [x] HTTP 200 map thành `ready`; 503 loading map thành `starting`; network/failure map thành trạng thái retry được.
- [x] Poll không tạo timer trùng và dừng khi component unmount.
- [x] Vite và Nginx proxy cùng một URL, không cần CORS hoặc lộ internal service URL.

**Verification:**
- [x] RED -> GREEN: frontend/source contract tests cho URL, state mapping, retry và cleanup.
- [x] `cd apps/web && npm run lint && npm run build`

**Dependencies:** Task 15.2

**Files likely touched:**
- `apps/web/src/services/aiHealthService.ts`
- `apps/web/src/hooks/useAiReadiness.ts`
- `apps/web/vite.config.ts`
- `apps/web/nginx.conf`

**Estimated scope:** M, 45-75 phút

## Task 15.5: Banner “AI đang khởi động” và chặn gửi audio sớm

**Description:** Hiển thị trạng thái AI trong phòng họp và chỉ kích hoạt recorder/subtitle audio khi model ready; không chặn WebRTC, chat phòng hoặc quyền host.

**Acceptance criteria:**
- [x] `starting` hiển thị banner accessible “AI đang khởi động, phụ đề sẽ tự bật khi sẵn sàng”.
- [x] `failed/unavailable` hiển thị lỗi có retry nhưng meeting tiếp tục hoạt động.
- [x] Không tạo/gửi audio chunk trước `ready`; khi chuyển `ready`, subtitle tự hoạt động không cần reload.

**Verification:**
- [x] RED -> GREEN: UI/source contract tests cho ba trạng thái và audio gating.
- [x] Browser + audio runtime test: vào phòng khi model cold, thấy banner tự biến mất khi ready; authenticated PCM nhận subtitle final đúng binding.

**Dependencies:** Task 15.4

**Files likely touched:**
- `apps/web/src/components/meeting/MeetingShell.tsx`
- `apps/web/src/components/meeting/AiReadinessBanner.tsx`
- `apps/web/src/hooks/useSubtitle.ts`
- `tests/test_livekit_media_contract.py`

**Estimated scope:** M, 45-75 phút

## Checkpoint C2: User-visible readiness

- [x] LiveKit meeting không bị chặn khi Whisper đang load hoặc lỗi.
- [x] Frontend không gửi audio trước readiness.
- [x] Banner đúng và tự cập nhật không reload.
- [x] Frontend lint/build và Python tests pass.

## Task 15.6: Runtime gate, observability và tài liệu

**Description:** Đo cold/warm readiness, bổ sung smoke assertions, log transition/latency không chứa token, transcript hay tên người dùng, và cập nhật kiến trúc/runbook.

**Acceptance criteria:**
- [x] Có log structured cho `loading -> ready/failed` và `load_duration_ms`, không log nội dung nhạy cảm.
- [x] Smoke xác nhận liveness/readiness; runtime PCM riêng xác nhận audio final sau warm start.
- [x] Runbook có cache lifecycle, failure diagnosis và rollback env/volume an toàn.

**Verification:**
- [x] Toàn bộ Python/.NET/frontend gates pass.
- [x] npm/NuGet vulnerability scans pass; `docker compose config -q` pass.
- [x] `scripts/smoke-test.ps1` pass và runtime logs không chứa token/transcript.

**Dependencies:** Tasks 15.3 và 15.5

**Files likely touched:**
- `scripts/smoke-test.ps1`
- `docs/architecture.md`
- `docs/production-runbook.md`
- `tasks/todo.md`

**Estimated scope:** M, 45-60 phút cộng thời gian cold-start runtime

## Checkpoint C3: Hoàn tất

- [x] Acceptance criteria của Tasks 15.1-15.6 đạt.
- [x] Full verification: Python 86+ tests, .NET 64+ tests, frontend lint/build, audits, Compose config và smoke.
- [x] Cold-start và warm-start có số đo riêng; không dùng warm result để tuyên bố cold-start.
- [ ] Human review trước merge/deploy.

## Parallelization

- Tuần tự bắt buộc: `15.1 -> 15.2` và `15.4 -> 15.5`.
- Sau khi contract 15.2 ổn định, có thể làm song song `15.3` và `15.4`.
- `15.6` chỉ bắt đầu sau khi Docker và frontend readiness đều hoàn tất.

## Rủi ro và giảm thiểu

| Rủi ro | Mức độ | Giảm thiểu |
| --- | --- | --- |
| First boot vẫn cần tải model | Cao | Persistent cache, UI starting, readiness 503 và runbook cho pre-warm trước demo |
| Healthcheck gây restart-loop | Cao | Healthcheck chỉ đánh dấu unhealthy; giữ restart policy hiện tại và test failure mode |
| Preload và request cùng load hai model | Cao | Singleton + idempotent lock + concurrency test |
| Volume rỗng che cache bake trong image | Trung bình | Chọn runtime named volume, không kết hợp bake cache vào cùng mount path |
| Frontend poll quá nhiều | Thấp | Backoff, cleanup và dừng poll nhanh khi ready |
| Model load fail do mạng/disk | Trung bình | State `failed`, retry có kiểm soát, meeting vẫn dùng được, log lỗi đã sanitize |

## Rollback

- Đặt `WHISPER_PRELOAD=false` để quay về lazy loading hiện tại.
- Gỡ AI readiness healthcheck/proxy và banner mà không đụng admission, LiveKit hay database.
- Giữ cache volume khi rollback; chỉ xóa thủ công nếu có xác nhận vì xóa cache làm lần khởi động sau phải tải lại.

## Ước lượng

- Tổng: khoảng **4-6 giờ** triển khai tập trung, chưa tính thời gian tải model/mạng.
- Không cần migration database hoặc downtime dữ liệu.
