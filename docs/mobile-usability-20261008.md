# LayaMeet – kiểm kê và thiết kế mobile (08/10/2026)

## Giả định và phạm vi bằng chứng

- Giữ nguyên code đang sửa dở. Mốc đầu: `output/playwright/mobile-20261008/baseline-source`, `baseline-git-status.txt`.
- Kiểm thử UI đang phát triển trên localhost:5173, kết nối Docker API:5000, AI:8000, LiveKit:7880. Chưa xác nhận bản layameet.com.
- Không dùng audit-report.json hoặc báo cáo cũ. Ảnh “before” chụp mới bằng Chrome với fake media và API/LiveKit thật.
- WebKit trên Windows và thiết bị emulation không phải Safari trên iPhone thật. Bàn phím hệ điều hành, khóa màn hình và thay đổi mạng cần nêu riêng.
- Token phụ đề ký ràng buộc source language (`apps/ai-service/app/main.py:258`). Không giả lập đổi ngôn ngữ nói thành công bằng cách chỉ đổi label; cung cấp đường vào lại PreJoin vì API hiện tại chỉ cập nhật target language.
- Tham chiếu thiết kế: brand, màu xanh, bản mobile/desktop hiện tại; không tải font hay CDN. Quy tắc: một CTA tạo phòng, vào bằng mã là hành động phụ; trong phòng ưu tiên mic/cam/ngôn ngữ; panel có một cách đóng nhất quán.

## A. Kiểm kê trước sửa

Danh sách đầy đủ từng route/control/handler trong `output/playwright/mobile-20261008/inventory-before.md` (tạo từ snapshot nguồn trước sửa). Bảng dưới tổng hợp chức năng; “Dùng được” theo mã không đồng nghĩa E2E thành công.

| Chức năng | PC | Mobile trước | Trạng thái trước | Bằng chứng trước |
|---|---|---|---|---|
| Home `/`, `/ja`, `/en` | Hero, tạo/vào phòng, nav | Canvas riêng, nút Mới nổi | Khó dùng | HomePage.tsx:493,661; before/home-390.png |
| Tạo phòng | CTA trong hero | FAB Mới | Dùng được local | before/trace-390.zip; API trả mã mới |
| Nhập mã/link | Form | Form trên cùng | Dùng được theo nguồn | HomePage.tsx:447,495 |
| Tính năng/bảng giá/FAQ/liên hệ | Nav mở section | Section trong `hidden md:flex` | Hỏng | HomePage.tsx:739,927 |
| Lịch, đặt lịch, lịch sử | Header/drawer/modal | Drawer | Khó dùng | HomePage.tsx:458; ScheduleMeetingModal.tsx |
| Đăng nhập Google, SSO, callback | Auth control/modal | Sheet/control | Chưa chứng minh integration | App.tsx:58; components/auth |
| Theme, ngôn ngữ UI | Header | Account sheet | Dùng được theo nguồn | HomePage.tsx:549,1240 |
| Quyền riêng tư/cookie/điều khoản | Footer/banner/modal | Drawer; banner mặc định ẩn | Khó dùng | CookieConsentBanner.tsx:152; HomePage.tsx:1207 |
| PreJoin `/meeting/:code`, alias `/join/:code`, `/prejoin/:code` | Preview trái, form phải | Preview trước form | Khó dùng | App.tsx:79; before/prejoin-390.png |
| Tên, ngôn ngữ mẹ đẻ | Input/select | Input/select | Dùng được local | PreJoinPage.tsx:933,957; before/trace-390.zip |
| Domain/từ khóa, chọn mic/cam, thử loa | Inline | Sheet riêng không trap focus | Khó dùng | PreJoinPage.tsx:832,1078 |
| Quyền bị từ chối, thiếu thiết bị | Fallback media | Alert bị truncate, không hướng dẫn đầy đủ | Khó dùng | PreJoinPage.tsx:344,819 |
| Mic/cam trong phòng | Split control | Main buttons | Dùng được local join; toggle chưa đo | MeetingBottomBar.tsx:204; before/meeting-390.png |
| Chọn mic/loa/cam trong phòng | Split arrow | Arrow bị ẩn, không menu thay thế | Thiếu | MeetingBottomBar.tsx:270,317 |
| Chia sẻ màn hình | Button | `hidden sm:block` | Thiếu | MeetingBottomBar.tsx:359 |
| Ngôn ngữ nghe/phụ đề | Overlay/select panel | Nút nhỏ; menu phụ | Khó dùng | MeetingShell.tsx:1216; SubtitlePanel.tsx:350 |
| Ngôn ngữ nói | Token từ PreJoin | Không thể đổi trực tiếp | Thiếu API | main.py:258; meetingApi.ts:435 |
| Phụ đề gốc/dịch, cỡ chữ, history | Band + settings/panel | Band + sheet history | Khó dùng | SubtitleOverlay.tsx:66,300 |
| Video 1/2/4/N, pin, layout, self-view | Grid/spotlight/sidebar | Tile min-height 200, tràn khi ngang/N | Khó dùng | MeetingStage.tsx:391; FloatingSelfView.tsx |
| Mời người, copy mã/link, preapprove | Ready card/people | Card phủ video; clipboard không bắt lỗi | Khó dùng | before/meeting-390.png; ParticipantsPanel.tsx:165 |
| Người tham gia/search/waiting room | Sidebar | Overlay absolute | Khó dùng | ParticipantsPanel.tsx:189; before/people-390.png |
| Chat, file attachment, link preview | Sidebar | Nằm trong More; ô input min-width chưa xử lý | Khó dùng | ChatPanel.tsx:64,208 |
| Action Items/tóm tắt/QA/export md/PDF/txt/srt/workflow | Sidecar tabs | Panel riêng fixed, không thống nhất drawer | Khó dùng | SubtitlePanel.tsx:332,377 |
| Giơ tay, reactions | Inline | More | Dùng được theo nguồn | MeetingBottomBar.tsx:371,432 |
| Audio Booth/TTS | Toolbar/More | TTS chiếm ô chính | Khó dùng | MeetingBottomBar.tsx:344,534 |
| Ghi hình | More/Activities | getDisplayMedia không hỗ trợ | Hỏng/thiếu fallback | MeetingShell.tsx:564 |
| Phụ đề nổi/PiP | Floating widget | Di chuyển pointer; PiP có fallback | Khó dùng | FloatingSubtitleWidget.tsx:89,166 |
| Host controls/mute/duyệt vào phòng | Sidebar | More → panel | Khó dùng; logic giữ nguyên | HostControlsPanel.tsx:42; MeetingShell.tsx:311 |
| Rời phòng/biên bản/feedback/rejoin | Post modal/left screen | Modal/screen | Chưa có E2E | MeetingShell.tsx:1397; LeftMeetingScreen.tsx:428 |
| Reconnect/media permission/audio unlock | Status/StartAudio/modal | Status chữ bị ẩn; chưa wake lock/visualViewport | Thiếu | MeetingTopBar.tsx:154; MeetingShell.tsx:1834 |
| `/settings`, `/cai-dat` | Sidebar 4 tab | Horizontal nav | Khó dùng | SettingsPage.tsx:508 |
| `/developers` | API/code/copy | Responsive code blocks | Chưa kiểm chứng | App.tsx:60; DevelopersPage.tsx:114 |
| `/admin` | Auth, dashboard, tables/forms | Nhiều bảng/control | Chưa kiểm chứng integration | App.tsx:59; AdminDashboardPage.tsx |
| Cẩm Nang `/cam-nang`, `/vi/guide`, `/en/guide`, `/ja/guide` và `/:slug` | Listing/search/article/TOC/share | Responsive article | Chưa kiểm chứng | App.tsx:63–70; BlogPostPage.tsx:288 |
| 4 landing ngôn ngữ `/hop-song-ngu-tieng-{nhat,anh,trung,han}` | Nav/CTA/nội dung | Nav ẩn ở mobile | Khó dùng | App.tsx:71–74; LanguagePairLandingPage.tsx:307 |
| 2 comparison `/so-sanh/layameet-vs-{zoom,google-meet}` | Bảng/CTA/nav | Một link ẩn | Khó dùng | App.tsx:75–76; ComparisonLandingPage.tsx:428 |
| Public recap `/recap/:code` | Read/copy/share | Same | Chưa có dữ liệu chứng minh | App.tsx:81; PublicRecapPage.tsx:65 |
| Billing/upgrade, enterprise demo, contact | Modal/forms | Modal/forms | Chưa chứng minh thanh toán/gửi thật | CheckoutModal.tsx; EnterpriseDemoModal.tsx; ContactSection.tsx |

## B. Quyết định bố cục trước triển khai

1. **Phòng họp:** toolbar sáu ô có label; TTS/share/thiết bị/reactions/host/ghi hình vào More có cuộn. Panel một wrapper native dialog trên mobile/tablet, tab mọi người/chat/AI/hoạt động/host; desktop dock phải ở >=1024. Đánh đổi: thêm một tap cho tính năng ít dùng; loại bỏ nhiều lớp phủ chồng nhau.
2. **Video/phụ đề:** card mời thu gọn, grid có cuộn cho N người, band phụ đề tách video. Cỡ chữ thay đổi bằng cài đặt đã có; giữ cả gốc/dịch khi chọn song ngữ.
3. **PreJoin:** form tên/ngôn ngữ trước video trên mobile; sheet thiết bị/từ điển dùng native dialog, cuộn theo visualViewport, close/Esc/swipe. Desktop giữ hai cột.
4. **Home:** CTA Mới hiển thị trong nội dung; form vào phòng gần CTA; section tính năng/bảng giá/FAQ/liên hệ render cho mobile, giữ toàn bộ copy. Container 1280px.
5. **Runtime UI:** viewport hook dùng visualViewport/dvh; wake lock có capability/error trạng thái, reacquire sau visibility; status mạng rõ. iOS không có capture được thông báo và dùng chat gửi tài liệu/mở cùng phòng trên PC.

Ảnh trước mới: `output/playwright/mobile-20261008/before/{home,prejoin,meeting,people}-{390,1440}.png`.

## C–E. Kết quả và việc chưa làm được

Đang thực hiện. Chỉ đánh dấu đạt khi có trace/ảnh/số đo tương ứng. Kết quả cuối được bổ sung sau các lần chạy.
