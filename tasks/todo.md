# AI Translate Meeting todo

## P0 - Cần làm ngay để có demo

- [x] Task 1 implementation: Sửa đường WebSocket subtitle cho dev và Docker config.
- [x] Task 2 implementation: Gắn subtitle overlay/panel vào meeting screen.
- [x] Task 3 implementation: Chuẩn hóa subtitle message contract.
- [x] Task 1-3 browser verification: subtitle mock hiển thị trên overlay và transcript panel.
- [ ] Task 1-3 Docker verification: block do Docker Desktop engine timeout khi chạy Docker CLI.
- [ ] Checkpoint A: Demo subtitle mock hoạt động end-to-end trong Docker/browser.

## P1 - Real AI flow

- [ ] Task 4: Capture và gửi audio chunks từ browser.
- [ ] Task 5: Thay mock STT bằng faster-whisper lazy loading.
- [ ] Task 6: Translation provider thật và cache.
- [ ] Checkpoint B: Demo mic -> STT -> translation -> UI.

## P2 - Stabilize

- [ ] Task 7: API integration tests.
- [ ] Task 8: CI chạy lint/build/test/audit/Python syntax.
- [ ] Task 9: Docker smoke test.

## P3 - Production hardening

- [ ] Task 10: Room access security.
- [ ] Task 11: CORS/config/secrets hardening.

## P4 - Phát triển thêm

- [ ] Meeting recap bằng AI.
- [ ] Export transcript `.txt`, `.srt`, `.vtt`, `.docx`.
- [ ] Custom glossary theo công ty/dự án.
- [ ] Speaker labels cho subtitle.
- [ ] Recording + replay subtitles.
- [ ] Admin dashboard usage/error.
- [ ] Calendar integrations.
- [ ] SaaS billing/usage limits.

## Lệnh verify chuẩn sau mỗi batch

- [ ] `npm run lint` trong `apps/web`
- [ ] `npm run build` trong `apps/web`
- [ ] `dotnet test tests/AITranslateMeeting.Api.Tests/AITranslateMeeting.Api.Tests.csproj`
- [ ] `python -m compileall -q apps/ai-service/app`
- [ ] `npm audit` trong `apps/web`
