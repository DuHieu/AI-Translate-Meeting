# VPS Docker Deployment

Trạng thái: cấu hình sẵn sàng để deploy; chưa kết nối hoặc thay đổi VPS thật.

## 1. Kiến trúc production

- `Caddy`: cổng public `80/443`, tự cấp và gia hạn TLS.
- `web`: React/Nginx, proxy `/api`, `/ws` và AI readiness trong Docker network.
- `LiveKit`: signaling qua `wss://LIVEKIT_DOMAIN`; media public qua `7881/TCP` và `7882/UDP`.
- `api`, `ai-service`, `laya`, PostgreSQL và Redis: không publish cổng ra Internet.
- Image ứng dụng lấy từ GHCR bằng immutable Git SHA.
- PostgreSQL, Redis, Whisper/Laya cache và certificate Caddy dùng named volume.

Với Whisper `small` chạy CPU và LiveKit cùng máy, nên bắt đầu từ 8 vCPU/16 GB RAM cho closed beta. VPS 4 vCPU/8 GB chỉ phù hợp thử nghiệm với model `tiny`; đây là ước lượng vận hành, phải xác nhận bằng soak test thực tế.

## 2. DNS và firewall

Tạo hai DNS record trỏ vào IPv4 public của VPS:

- `APP_DOMAIN`, ví dụ `meet.example.com`.
- `LIVEKIT_DOMAIN`, ví dụ `rtc.example.com`.

Chỉ mở:

```text
22/tcp       SSH, nên giới hạn theo IP quản trị
80/tcp       ACME và redirect HTTPS
443/tcp      HTTPS/WSS
443/udp      HTTP/3
7881/tcp     LiveKit WebRTC TCP fallback
7882/udp     LiveKit WebRTC media
```

Không mở PostgreSQL `5432`, Redis `6379`, API `5000`, AI `8000`, web `3000` hoặc LiveKit signaling `7880`.

## 3. Chuẩn bị VPS một lần

1. Cài Docker Engine và Compose plugin từ repository chính thức của Docker.
2. Tạo user deploy riêng, chỉ cấp quyền Docker và thư mục `/opt/ai-translate-meeting`.
3. Tạo cấu trúc:

```bash
sudo install -d -o deploy -g deploy /opt/ai-translate-meeting/{releases,shared,shared/backups}
sudo -u deploy cp .env.production.example /opt/ai-translate-meeting/shared/.env.production
sudo -u deploy chmod 600 /opt/ai-translate-meeting/shared/.env.production
```

4. Điền `.env.production` trực tiếp trên VPS. Tạo bốn secret độc lập bằng công cụ sinh số ngẫu nhiên an toàn, ví dụ `openssl rand -base64 48`. Không gửi chúng qua chat hoặc commit Git.
5. Nếu GHCR package là private, đăng nhập một lần trên VPS bằng token chỉ có `read:packages`:

```bash
printf '%s' "$GHCR_READ_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
```

## 4. GitHub Environment và secrets

Tạo Environment tên `production`, bật required reviewer và deployment branch chỉ cho `main` hoặc release tag.

Repository/Environment secrets:

| Tên | Nội dung |
| --- | --- |
| `VPS_HOST` | IP hoặc hostname SSH của VPS |
| `VPS_PORT` | Cổng SSH, thường là `22` |
| `VPS_USER` | User deploy không phải root |
| `VPS_SSH_KEY` | Private key riêng cho CI/CD |
| `VPS_KNOWN_HOSTS` | Host key đã xác minh ngoài băng, lấy từ quản trị VPS |

Environment variable:

| Tên | Giá trị |
| --- | --- |
| `VPS_DEPLOY_PATH` | `/opt/ai-translate-meeting` |

Không dùng `StrictHostKeyChecking=no`. Public key tương ứng chỉ nên được phép đăng nhập user deploy.

## 5. Luồng CI/CD

### CI — `.github/workflows/ci.yml`

Chạy khi push/PR:

- Frontend `npm ci`, audit, lint và build/bundle gate.
- .NET restore, vulnerability scan, Release build và tests.
- Python dependency audit, compile và toàn bộ pytest.
- Validate development và production Docker Compose.

### CD — `.github/workflows/deploy-production.yml`

Chỉ chạy thủ công bằng `workflow_dispatch`:

1. Chạy lại toàn bộ CI.
2. Build bốn image `api`, `ai-service`, `laya`, `web`.
3. Push GHCR bằng tag Git SHA, kèm SBOM và provenance.
4. Chờ approval của GitHub Environment `production`.
5. Upload manifest qua SSH có pinned host key.
6. Backup database, pull image, chạy migration one-shot, khởi động service.
7. Chỉ đánh dấu release thành công sau khi API, AI, web HTTPS và LiveKit HTTPS đều healthy.
8. Nếu gate thất bại, tự động chạy rollback về release trước.

## 6. Deploy và rollback

### 6.1. Triển khai Turnkey Trực tiếp trên Ubuntu VPS (Khuyến nghị cho Self-Hosted)

Thay vì cấu hình từng bước thủ công, quản trị viên có thể chạy script cài đặt trọn gói tự động hóa 8 bước (kiểm tra phần cứng, tạo cấu hình bí mật biệt lập 0600, tiền kiểm DNS/port, di trú database, kích hoạt Docker Compose, chạy smoke test và cài đặt systemd autostart):

```bash
# Triển khai tương tác (interactive wizard)
sudo ./scripts/setup-self-hosted.sh

# Hoặc triển khai tự động không cần can thiệp (unattended/headless)
sudo ./scripts/setup-self-hosted.sh \
  --app-domain "meet.yourdomain.com" \
  --livekit-domain "rtc.yourdomain.com" \
  --profile "pilot" \
  --image-tag "latest" \
  --non-interactive
```

### 6.2. Triển khai qua GitHub Actions CD

Deploy tự động: vào GitHub Actions, chọn **Build and Deploy Production**, kiểm tra đúng commit rồi chọn **Run workflow**. Reviewer phải phê duyệt job `production`.

### 6.3. Sao lưu & Phục hồi Dữ liệu trên VPS (Linux Native)

Sao lưu database an toàn (tự động nén gzip, đặt quyền 0600, không lộ mật khẩu):
```bash
sudo bash /opt/ai-translate-meeting/current/scripts/backup-database.sh
```

Thử nghiệm phục hồi dump vào database cô lập kiểm thử (`_restore_test`):
```bash
sudo bash /opt/ai-translate-meeting/current/scripts/restore-database.sh \
  /opt/ai-translate-meeting/shared/backups/ai_translate_meeting_backup_*.sql.gz \
  ai_translate_restore_test
```

### 6.4. Rollback thủ công trên VPS

```bash
sudo bash /opt/ai-translate-meeting/current/scripts/rollback-production.sh /opt/ai-translate-meeting
```

Rollback chỉ đổi image/manifests về release trước. Migration hiện tại là additive nên không xóa dữ liệu. Không xóa named volume khi rollback.

## 7. Kiểm tra sau deploy

- Chạy bộ kiểm thử tự động 20 điểm trên domain thật:
  ```bash
  sudo bash /opt/ai-translate-meeting/current/scripts/smoke-test.sh --domain meet.yourdomain.com
  ```
- Kiểm tra bảng quản trị và license:
  ```bash
  sudo bash /opt/ai-translate-meeting/current/scripts/bootstrap-admin.sh
  ```
- Mở `https://APP_DOMAIN` và tạo phòng host.
- Join bằng invite từ thiết bị/mạng khác.
- Kiểm tra mic/camera và phụ đề final.
- Xác nhận `wss://LIVEKIT_DOMAIN` kết nối được.
- Theo dõi `docker compose ps`, CPU/RAM/disk và log không chứa token/transcript.
- Chạy meeting soak 30–60 phút trước khi mở beta.

## 8. Blocker trước lần deploy đầu

- IP/hostname VPS và user SSH.
- Hai domain đã trỏ DNS (A/AAAA record tới IP của VPS).
- Mở các port firewall: 22 (SSH), 80/tcp, 443/tcp, 443/udp, 7881/tcp, 7882/udp.
- GitHub repository có quyền dùng Actions và GHCR (nếu dùng CD).
- `.env.production` đã tạo trên VPS với secrets độc lập (được tự động sinh bởi `setup-self-hosted.sh` hoặc `generate-config.sh`).
- Human review cho working tree hiện đang có nhiều thay đổi chưa commit.

