# Phân Tích Chuyên Sâu Bố Cục, UX & UI Từng Ảnh Trong `\ui-screenshots\` (`ui-ux-pro-max`)

Tài liệu này phân tích **chi tiết từng cặp ảnh từ `#01` đến `#37`** (tổng cộng **79 file ảnh**: 40 ảnh PC `1440x900` và 39 ảnh Mobile `390x844`) trong thư mục [ui-screenshots](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots), đối chiếu theo bộ tiêu chuẩn **`ui-ux-pro-max`** (Touch Target `>= 44px`, Compact Label Overflow, Focus Not Obscured, Scrim & Layering, No Emoji as Structural Icons, Visual Hierarchy).

---

## Nhóm I: Trang Chủ, Cookie Consent & Ngăn Kéo Điều Hướng (`#01` – `#03`)

### 1. Ảnh `#01` & `#02`: Trang Chủ Chính & Cookie Consent
- **File ảnh**:
  - [shot_pc_01_home_cookie.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_01_home_cookie.png)
  - [shot_pc_02_home_main.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_02_home_main.png)
  - [shot_mobile_02_home_main.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_02_home_main.png)
- **Phân tích Bố cục & UX/UI**:
  - **Điểm tốt**:
    - Trên PC (`#01`, `#02`), bố cục 2 cột bất đối xứng (Hero CTA bên trái + Khung mô phỏng phòng họp song ngữ trực tiếp bên phải) rất cân đối, đúng chuẩn SaaS hiện đại.
    - Nút chính `+ Tạo cuộc họp mới` nổi bật rõ ràng so với nút phụ `Đặt lịch họp`.
  - **Vấn đề phát hiện trên ảnh**:
    1. **Cookie Banner che khuất nội dung tương tác (`Focus Not Obscured` - WCAG 2.2)**:
       - Trên PC (`#01`), hộp `Quyền Riêng Tư & Cookie` góc dưới phải đè trực tiếp lên thanh chọn ngôn ngữ thử nghiệm (`VI | EN | JA`) của thẻ mô phỏng phòng họp.
       - Trên Mobile (`#02`), hộp Cookie cố định ở đáy che mất ô nhập `NHẬP MÃ PHÒNG` và nút `Vào phòng họp ->`, buộc người dùng phải đóng Cookie mới bấm vào phòng được.
    2. **Header Mobile (`#02`) thiếu lối tắt Lịch / Cài đặt nhưng còn dư khoảng trống**:
       - Trên PC có 3 icon nhanh (`Lịch`, `Lịch sử`, `Cài đặt`), còn trên Mobile chỉ còn Hamburger, Logo, nút Sáng/Tối và `Đăng nhập`.
- **Đề xuất cải tiến ([HomePage.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/pages/HomePage.tsx))**:
  - Thu gọn Cookie Banner thành thanh ngang mảnh (1 dòng trên PC, 2 dòng gọn ở sát đáy trên Mobile) và hạ `z-index` xuống `z-30` để không bao giờ nổi đè lên Drawer hoặc Modal.

---

### 2. Ảnh `#03`: Ngăn Kéo Điều Hướng (Navigation Drawer)
- **File ảnh**:
  - [shot_pc_03_nav_drawer.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_03_nav_drawer.png)
  - [shot_mobile_03_nav_drawer.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_03_nav_drawer.png)
- **Phân tích Bố cục & UX/UI**:
  - **Điểm tốt**:
    - Sau khi tinh gọn theo yêu cầu trước đó, danh sách điều hướng chỉ còn đúng **5 mục cốt lõi** (`Trang chủ`, `Lịch cuộc họp`, `Lịch sử cuộc họp`, `Bảng giá`, `Cài đặt & Giao diện`), rất sạch sẽ và thoáng.
  - **Vấn đề phát hiện trên ảnh**:
    1. **Lỗi Z-Index nghiêm trọng**: Trong cả 2 ảnh [shot_pc_03_nav_drawer.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_03_nav_drawer.png) và [shot_mobile_03_nav_drawer.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_03_nav_drawer.png), hộp **Cookie Consent vẫn sáng rõ và nằm ĐÈ LÊN TRÊN lớp phủ tối (`backdrop`) lẫn ngăn kéo điều hướng**!
- **Đề xuất cải tiến ([HomePage.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/pages/HomePage.tsx) & [index.css](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/index.css))**:
  - Đặt `.cookie-consent { z-index: 30; }` (thấp hơn `z-50` của Drawer/Modal) hoặc ẩn hoàn toàn `.cookie-consent` khi `isMobileNavOpen || activeModal !== null`.

---

## Nhóm II: Các Modal Trang Chủ & Luồng Thương Mại (`#04` – `#08`)

### 3. Ảnh `#04`: Modal Lịch Cuộc Họp (`CalendarModal`)
- **File ảnh**:
  - [shot_pc_04_calendar_modal.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_04_calendar_modal.png)
  - [shot_mobile_04_calendar_modal.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_04_calendar_modal.png)
- **Phân tích Bố cục & UX/UI**:
  - **Điểm tốt**:
    - Bố cục 2 cột trên PC (Lịch tháng bên trái + Danh sách sự kiện trong ngày bên phải) rất trực quan. Empty state có viền nét đứt, icon lịch và nút CTA `+ Đặt lịch mới` rõ ràng.
  - **Vấn đề phát hiện trên ảnh**:
    1. **Trùng lặp nút CTA trên PC (`#04`)**: Có tới **2 nút xanh đậm `+ Đặt lịch mới`** cùng xuất hiện một lúc (1 nút ở góc trên phải header, 1 nút ở chính giữa vùng trống). Khiến mắt người dùng bị phân tán bởi 2 nút Primary cùng màu.
    2. **Trên Mobile (`shot_mobile_04_calendar_modal.png`)**: Lịch tháng chiếm gần hết màn hình đầu tiên, khiến vùng danh sách cuộc họp bên dưới (`THỨ BẢY, 10/10/2026`) bị đẩy tụt xuống đáy và mất nút CTA ở phần nhìn thấy được.
- **Đề xuất cải tiến ([HomePage.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/pages/HomePage.tsx))**:
  - Đổi nút `+ Đặt lịch mới` ở giữa vùng trống thành style Secondary/Outline (hoặc chỉ hiện nút ở giữa khi danh sách trống), và thu gọn chiều cao hàng ngày trong lịch trên Mobile (`h-9` thay vì `h-11`) để thấy trọn danh sách cuộc họp bên dưới mà không cần cuộn.

---

### 4. Ảnh `#05`: Modal Đặt Lịch Cuộc Họp Mới (`ScheduleModal`)
- **File ảnh**:
  - [shot_pc_05_schedule_modal.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_05_schedule_modal.png)
  - [shot_mobile_05_schedule_modal.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_05_schedule_modal.png)
- **Phân tích Bố cục & UX/UI**:
  - **Vấn đề phát hiện trên ảnh**:
    1. **Lỗi "Hộp lồng hộp lệch trái" trên PC ([shot_pc_05_schedule_modal.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_05_schedule_modal.png))**:
       - Quan sát kỹ ảnh PC `#05`: phía bên phải khung `Đặt lịch cuộc họp` có một **mảng hộp màu tối thứ hai thừa ra ngoài khoảng `120px`**! Nguyên nhân là thẻ bọc `.meeting-dialog` đã có khung nền + viền (`max-w-lg`), nhưng thẻ con bên trong lại khai báo thêm `max-w-md` không căn giữa (`mx-auto`), tạo ra 2 lớp khung chồng lệch nhau.
    2. **Lỗi hiển thị Emoji Cờ Quốc Gia trong `<select>` (`[V][N]`)**:
       - Ở ô `Ngôn ngữ phụ đề mặc định`, chuỗi `🇻🇳 Tiếng Việt (VI)` bị trình duyệt trên Windows hiển thị thành 2 chữ cái đóng khung **`[V][N] Tiếng Việt (VI)`** (vi phạm quy tắc **No Emoji as Structural Icons** của `ui-ux-pro-max`).
    3. **Placeholder bị cắt cụt trong ô Tiêu đề**:
       - `"Ví dụ: Họp tuần Vietnam – Japan (để trống sẽ lấy tên ı"` bị cắt dở chữ ở cuối input.
- **Đề xuất cải tiến ([HomePage.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/pages/HomePage.tsx))**:
  - Bỏ khung lồng nhau (đồng nhất kích thước modal hoặc thêm `mx-auto` và xóa viền trùng của lớp ngoài).
  - Xóa ký tự emoji cờ trong thẻ `<option>` (dùng `Tiếng Việt (VI)`, `English (EN)`, `日本語 (JA)` sạch sẽ trên mọi hệ điều hành).
  - Rút gọn placeholder thành `"Ví dụ: Họp tuần Vietnam – Japan"`.

---

### 5. Ảnh `#06`: Modal Lịch Sử Cuộc Họp (`HistoryModal`)
- **File ảnh**:
  - [shot_pc_06_history_modal.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_06_history_modal.png)
  - [shot_mobile_06_history_modal.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_06_history_modal.png)
- **Phân tích Bố cục & UX/UI**:
  - **Vấn đề phát hiện trên ảnh**:
    1. **Empty State quá sơ sài & lệch bố cục trên Mobile**:
       - Trên PC (`#06`), hộp chỉ có 1 dòng chữ xám nhỏ `"Chưa có lịch sử cuộc họp nào."`.
       - Trên Mobile (`shot_mobile_06_history_modal.png`), bottom sheet mở cao `90vh` nhưng nội dung chỉ cao `160px` ở trên đỉnh, để lại **75% màn hình bên dưới là một mảng đen trống rỗng**!
- **Đề xuất cải tiến ([HomePage.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/pages/HomePage.tsx))**:
  - Thiết kế Empty State đồng bộ với `CalendarModal`: có icon đồng hồ/biên bản, giải thích ngắn (`"Biên bản họp AI, phụ đề song ngữ và danh sách việc cần làm sẽ tự động lưu tại đây sau mỗi cuộc họp"`), kèm nút CTA `+ Tạo cuộc họp ngay`.
  - Trên Mobile, đặt `h-auto max-h-[85vh]` thay vì ép chiều cao cố định khi danh sách trống.

---

### 6. Ảnh `#07`: Khu Vực Bảng Giá (`PricingSection`)
- **File ảnh**:
  - [shot_pc_07_pricing_section.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_07_pricing_section.png)
  - [shot_mobile_07_pricing_section.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_07_pricing_section.png)
- **Phân tích Bố cục & UX/UI**:
  - **Điểm tốt**:
    - Phân cấp 2 gói `Free (0đ)` và `Gói Tháng Pro (99.000đ)` rất rõ ràng; viền xanh nổi bật trên gói khuyên dùng tạo hiệu ứng neo thị giác tốt.
  - **Vấn đề phát hiện trên ảnh**:
    1. **Trên Mobile (`shot_mobile_07_pricing_section.png`)**:
       - Cụm công tắc `Thanh toán tháng [O] Thanh toán năm [Tiết kiệm 20%]` bị ép hẹp khiến chữ gãy thành 2 dòng trên cả 2 vế và badge `Tiết kiệm 20%` cũng bị gãy thành 2 dòng.
       - Thẻ `Free` xuất hiện trước làm đẩy thẻ `Gói Tháng Pro` (gói cần chuyển đổi doanh thu) xuống sâu bên dưới màn hình thứ 2 trên Mobile.
- **Đề xuất cải tiến ([HomePage.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/pages/HomePage.tsx))**:
  - Chuyển bộ chọn chu kỳ thanh toán (`Tháng` / `Năm -20%`) sang dạng **Segmented Pill Control** nằm gọn trên 1 dòng duy nhất (`whitespace-nowrap`).

---

### 7. Ảnh `#08`: Modal Thanh Toán Nâng Cấp Pro (`CheckoutModal`)
- **File ảnh**:
  - [shot_pc_08_checkout_modal.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_08_checkout_modal.png)
  - [shot_mobile_08_checkout_modal.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_08_checkout_modal.png)
- **Phân tích Bố cục & UX/UI**:
  - **Điểm tốt**:
    - Thanh tiến trình 3 bước (`1. Tài khoản` -> `2. Thanh toán` -> `3. Kích hoạt Pro`) rõ ràng, tạo sự tin cậy.
  - **Vấn đề phát hiện trên ảnh**:
    1. **Trên Mobile (`shot_mobile_08_checkout_modal.png`)**:
       - Bước 3 bị gãy dòng thành `3. Kích hoạt / Pro` khiến chiều cao 3 ô bước không đều nhau.
       - Nút `Đăng nhập bằng Google để tiếp tục` bị gãy chữ `"tục"` rơi xuống dòng thứ 2 lẻ loi (vi phạm quy tắc **Orphan Heading / Line Balance** của `ui-ux-pro-max`).
- **Đề xuất cải tiến ([HomePage.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/pages/HomePage.tsx))**:
  - Rút gọn nhãn bước 3 thành `3. Kích hoạt` và nút CTA thành `Đăng nhập Google để tiếp tục` (`whitespace-nowrap`).

---

## Nhóm III: Trang Cài Đặt Hệ Thống Toàn Cục `/settings` (`#09` – `#12`)

### 8. Ảnh `#09`, `#10`, `#11`, `#12`: Cài Đặt Hệ Thống (4 Tabs)
- **File ảnh**:
  - [shot_pc_09_settings_subtitles.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_09_settings_subtitles.png) | [shot_mobile_09_settings_subtitles.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_09_settings_subtitles.png)
  - [shot_pc_10_settings_audio.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_10_settings_audio.png) | [shot_mobile_10_settings_audio.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_10_settings_audio.png)
  - [shot_pc_11_settings_byok.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_11_settings_byok.png) | [shot_mobile_11_settings_byok.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_11_settings_byok.png)
  - [shot_pc_12_settings_plan.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_12_settings_plan.png) | [shot_mobile_12_settings_plan.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_12_settings_plan.png)

> [!CAUTION]
> **Lỗi Hiển Thị Nghiêm Trọng Nhất Trên Mobile (`#09`, `#10`, `#11`, `#12`)**:
> Quan sát trực tiếp [shot_mobile_09_settings_subtitles.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_09_settings_subtitles.png), [shot_mobile_10_settings_audio.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_10_settings_audio.png), [shot_mobile_11_settings_byok.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_11_settings_byok.png) và [shot_mobile_12_settings_plan.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_12_settings_plan.png):
> Thanh 4 tab (`Phụ đề & Ngôn ngữ`, `Âm thanh & Giọng nói`, `Động cơ AI & API Key`, `Gói dịch vụ & Hạn mức`) trên Mobile bị **ĐÈ CHỮ CHỒNG LÊN NHAU** thành một chuỗi hỗn loạn:
> **`"Phụ đề & NgônÂm thanh & GiọĐộng cơ AI & AGói dịch"`**!

- **Phân tích nguyên nhân & chi tiết bổ sung**:
  1. **Tại sao chữ của 4 tab đè lên nhau trên Mobile?**:
     - Trong [SettingsPage.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/pages/SettingsPage.tsx), trên màn hình `< 768px`, cột nav bên trái chuyển thành hàng ngang (`flex` hoặc `grid-cols-4`) nhưng các nút con dùng `whitespace-nowrap` mà không có `overflow-x-auto` hay `grid-cols-2`, dẫn đến chữ của tab trước tràn thẳng sang nền trong suốt của tab sau!
  2. **Trên PC (`shot_pc_09_settings_subtitles.png`)**:
     - Nút `Tiêu chuẩn (80%)` trong phần `Độ đậm nền phụ đề` bị gãy thành 2 dòng trong khi `Mờ (50%)` và `Đậm (95%)` nằm trên 1 dòng.
     - Ô `<select>` `Từ điển chuyên ngành` bị cắt chữ `"Tổng quát (Họp chung & giao tiếp hàn..."` sát mép mũi tên.
- **Đề xuất cải tiến ([SettingsPage.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/pages/SettingsPage.tsx))**:
  - Chuyển thanh điều hướng 4 tab trên Mobile thành **Lưới `grid-cols-2 gap-2`** (hoặc thanh cuộn ngang `flex overflow-x-auto` với nhãn ngắn gọn: `Phụ đề`, `Âm thanh`, `API Key`, `Gói cước`) để chấm dứt hoàn toàn hiện tượng đè chữ.
  - Mở rộng `min-w-[260px]` cho `<select>` Từ điển chuyên ngành và đồng nhất 1 dòng cho nút `Tiêu chuẩn (80%)`.

---

## Nhóm IV: Các Trang Nội Dung, Quản Trị & Phòng Chờ Pre-Join (`#13` – `#18`)

### 9. Ảnh `#13`: Trang Developers (`/developers`)
- **File ảnh**:
  - [shot_pc_13_developers_page.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_13_developers_page.png)
  - [shot_mobile_13_developers_page.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_13_developers_page.png)
- **Phân tích Bố cục & UX/UI**:
  - **Điểm tốt**: Bố cục 4 thẻ công nghệ (`LiveKit WebRTC`, `Whisper int8 STT`, `Redis Polyglot Cache`, `Laya AI Sidecar`) và khung code snippet rất sắc nét, chuyên nghiệp.
  - **Vấn đề phát hiện trên ảnh**:
    - Trên Mobile (`shot_mobile_13_developers_page.png`), thanh header bị gãy làm **2 hàng rời rạc**: hàng 1 có `<- | LayaMeet | DevHub`, hàng 2 có nút mặt trời + nút `GitHub` trắng quá to nằm lệch bên trái, để trống 60% bên phải.
- **Đề xuất cải tiến ([DevelopersPage.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/pages/DevelopersPage.tsx))**:
  - Giữ toàn bộ header `/developers` nằm gọn trên **1 hàng duy nhất** (`justify-between flex-nowrap`) bằng cách ẩn badge phụ `DevHub` trên màn hình `< 480px`.

---

### 10. Ảnh `#14`: Trang Trạng Thái Hệ Thống (`/system-status`)
- **File ảnh**:
  - [shot_pc_14_system_status.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_14_system_status.png)
  - [shot_mobile_14_system_status.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_14_system_status.png)
- **Phân tích Bố cục & UX/UI**:
  - **Điểm tốt**: Danh sách trạng thái `PostgreSQL`, `Redis`, `LiveKit SFU` rõ ràng, độ tương phản tốt.
  - **Vấn đề phát hiện trên ảnh & DOM**:
    1. **Touch Target `< 44px`**: 5 nút trên thanh header (`Trang chủ`, `LayaMeet`, `VI`, `Sáng/Tối`, `Đăng nhập`) chỉ cao `28px–30px` vì thiếu class `.content-page`.
    2. **Trên Mobile (`shot_mobile_14_system_status.png`)**: Nút `Đăng nhập` bị bóp hẹp nên chữ gãy thành 2 dòng (`Đăng / nhập`).
- **Đề xuất cải tiến ([SystemStatusPage.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/pages/SystemStatusPage.tsx))**:
  - Thêm class `.content-page` vào container gốc và thêm `whitespace-nowrap` cho nút `Đăng nhập`.

---

### 11. Ảnh `#15`: Trang Hướng Dẫn & Blog Kỹ Thuật (`/guide`)
- **File ảnh**:
  - [shot_pc_15_guide_blog.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_15_guide_blog.png)
  - [shot_mobile_15_guide_blog.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_15_guide_blog.png)
- **Phân tích Bố cục & UX/UI**:
  - **Vấn đề phát hiện trên ảnh**:
    1. **Trên PC (`shot_pc_15_guide_blog.png`)**: Ở góc dưới phải của mỗi thẻ bài viết, liên kết `Đọc bài ->` bị ép cột hẹp nên chữ `->` rớt xuống dòng thứ 2 bên dưới chữ `Đọc bài`.
    2. **Trên Mobile (`shot_mobile_15_guide_blog.png`)**: Header bị gãy thành **3 hàng** (Hàng 1: `LayaMeet`, Hàng 2: `Developers API | VI | Sáng/Tối`, Hàng 3: `Tạo phòng họp`), chiếm mất 170px chiều cao đầu trang!
- **Đề xuất cải tiến ([GuidePage.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/pages/GuidePage.tsx))**:
  - Thêm `whitespace-nowrap shrink-0` cho nút `Đọc bài ->`.
  - Tối ưu header Mobile nằm gọn trên 1 hàng (`Logo` bên trái, `VI` + `Sáng/Tối` + `Tạo phòng` bên phải).

---

### 12. Ảnh `#16`: Trang Quản Trị (`/admin`)
- **File ảnh**:
  - [shot_pc_16_admin_dashboard.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_16_admin_dashboard.png)
  - [shot_mobile_16_admin_dashboard.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_16_admin_dashboard.png)
- **Phân tích Bố cục & UX/UI**:
  - **Điểm tốt**: Thẻ đăng nhập Admin căn giữa cân đối trên cả PC và Mobile, đạt 100% tiêu chí touch target và tương phản.
  - **Vấn đề nhỏ**: Ô nhập `Admin Secret Key` không có nút con mắt ẩn/hiện khóa giống trang BYOK (`#11`).
- **Đề xuất cải tiến ([AdminDashboardPage.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/pages/AdminDashboardPage.tsx))**:
  - Bổ sung nút toggle hiện/ẩn mật khẩu (`Eye` / `EyeOff`) bên phải ô input.

---

### 13. Ảnh `#17` & `#18`: Phòng Chờ Pre-Join Lobby & Tùy Chọn Nâng Cao
- **File ảnh**:
  - [shot_pc_17_prejoin_lobby.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_17_prejoin_lobby.png) | [shot_mobile_17_prejoin_lobby.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_17_prejoin_lobby.png)
  - [shot_pc_18_prejoin_advanced.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_18_prejoin_advanced.png) | [shot_mobile_18_prejoin_advanced.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_18_prejoin_advanced.png)
- **Phân tích Bố cục & UX/UI**:
  - **Điểm tốt**:
    - Trên PC (`#17`), bố cục 2 cột (Khung thử Camera/Mic bên trái + Form Tên & Ngôn ngữ bên phải) rất gọn gàng.
  - **Vấn đề phát hiện trên ảnh**:
    1. **Header Mobile (`shot_mobile_17_prejoin_lobby.png`) bị nhồi nhét & gãy dòng**:
       - Cùng một hàng ngang `390px` chứa Logo, tiêu đề `"Chuẩn bị tham gia"`, badge `"Phòng họp: / GW7XQM"` (gãy 2 dòng), nút Cài đặt, nút Sáng/Tối, và nút `"<- Quay / lại"` (gãy 2 dòng).
    2. **Trên Mobile (`shot_mobile_17_prejoin_lobby.png`), nút CTA `Tham gia ngay` bị đẩy khuất khỏi màn hình đầu tiên**:
       - Do khung preview camera `16:9` + hộp thanh âm lượng Mic + tiêu đề form chiếm hết chiều cao `844px`, người dùng trên điện thoại mở link phòng họp **không nhìn thấy nút `Tham gia ngay`** nếu không cuộn xuống!
    3. **Lỗi "Hộp lồng hộp lệch trái" trong Modal `Thiết lập phòng họp & AI` trên PC ([shot_pc_18_prejoin_advanced.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_18_prejoin_advanced.png))**:
       - Giống hệt ảnh `#05` và `#31`, hộp thoại `Thiết lập phòng họp & AI` trên PC có một lớp khung nền thứ hai rộng hơn thừa ra bên phải khoảng `120px`!
- **Đề xuất cải tiến ([PreJoinPage.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/pages/PreJoinPage.tsx))**:
  - Trên Mobile (`< 640px`), ẩn chữ `"Chuẩn bị tham gia"` và chữ `"Quay lại"` (chỉ giữ icon `<-` + Logo + mã phòng `GW7XQM` trên 1 dòng), đồng thời giảm chiều cao khung preview camera xuống `max-h-[200px]` để nút **`Tham gia ngay` luôn hiển thị ngay trong màn hình đầu tiên (Above the Fold)**.
  - Xóa lớp khung thừa trong modal `Thiết lập phòng họp & AI` (`#18`).

---

## Nhóm V: Sân Khấu Phòng Họp Chính & Các Hộp Thoại Nhanh (`#19` – `#21`, `#29` – `#31`, `#33` – `#35`)

### 14. Ảnh `#19`: Sân Khấu Phòng Họp Chính (`MeetingStage`)
- **File ảnh**:
  - [shot_pc_19_meeting_stage.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_19_meeting_stage.png)
  - [shot_mobile_19_meeting_stage.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_19_meeting_stage.png)
- **Phân tích Bố cục & UX/UI**:
  - **Điểm tốt**:
    - Tỷ lệ sân khấu video rất thoáng, thanh điều khiển dưới cùng có nhãn tiếng Việt rõ ràng (`Tắt mic`, `Tắt cam`, `Phụ đề`, `Ngôn ngữ`, `Thêm`, `Rời`).
  - **Vấn đề phát hiện trên ảnh**:
    1. **Thanh `SubtitleOverlay` nổi ngay phía trên thanh công cụ dưới cùng tạo ra 2 thanh điều khiển xếp chồng**:
       - Ở góc dưới trái sân khấu có cụm `[Tiếng Việt v] [Song ngữ]`, còn ở góc dưới phải có `TT` và icon bánh răng `Cài đặt` lơ lửng không có nền rõ ràng (`TT` nhìn như chữ bị lỗi).
       - Trong khi đó, ngay bên dưới đã có nút `Phụ đề` và `Ngôn ngữ` trên thanh công cụ chính!
- **Đề xuất cải tiến ([SubtitleOverlay.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/components/SubtitleOverlay.tsx))**:
  - Khi chưa có câu phụ đề nào đang hiển thị, ẩn thanh công cụ phụ (`Tiếng Việt`, `Song ngữ`, `TT`, `Bánh răng`) hoặc gom vào một pill mảnh duy nhất khi di chuột/chạm vào vùng phụ đề để sân khấu video sạch 100%.

---

### 15. Ảnh `#20`: Hộp Thoại Ngôn Ngữ & Phụ Đề (`LanguageDialog`)
- **File ảnh**:
  - [shot_pc_20_meeting_language_dialog.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_20_meeting_language_dialog.png)
  - [shot_mobile_20_meeting_language_dialog.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_20_meeting_language_dialog.png)
- **Phân tích Bố cục & UX/UI**:
  - **Vấn đề phát hiện trên ảnh**:
    1. **4 nút `Kích thước chữ phụ đề` (`Nhỏ`, `Vừa`, `Lớn`, `Rất lớn`) không có trạng thái đang chọn (Missing Active State)**:
       - Nhìn vào cả ảnh PC và Mobile `#20`, cả 4 nút đều có viền xám mờ giống hệt nhau — người dùng không biết mình đang ở cỡ chữ nào!
- **Đề xuất cải tiến ([MeetingBottomBar.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/components/meeting/MeetingBottomBar.tsx))**:
  - Bổ sung style active (`bg-sky-500/20 border-sky-400 text-sky-200 font-semibold`) và `aria-pressed={subtitleFontSize === size}` cho nút cỡ chữ đang được chọn.

---

### 16. Ảnh `#21`: Menu Tùy Chọn Cuộc Họp (`...` More Menu)
- **File ảnh**:
  - [shot_pc_21_meeting_more_menu.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_21_meeting_more_menu.png)
  - [shot_mobile_21_meeting_more_menu.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_21_meeting_more_menu.png)
- **Phân tích Bố cục & UX/UI**:
  - **Vấn đề phát hiện trên ảnh**:
    1. **Quá tải danh sách (16 nút xếp dọc tràn khỏi chiều cao màn hình)**:
       - Trên cả PC (`#21`) và Mobile (`#21`), danh sách nút kéo dài chạm đáy modal và bị cắt ngang ở nút `Ghi hình cuộc họp` / `Đổi bố cục hiển thị`.
    2. **Trùng lặp chức năng trên PC**:
       - Các nút `Mọi người (1)`, `Chat`, `Action Items` đã nằm ngay trên thanh công cụ dưới cùng của PC nhưng vẫn lặp lại trong menu `Thêm (...)`.
    3. **Nút `Giao diện sáng` lệch chuẩn thiết kế**:
       - Nằm lẻ loi một hàng dài với cỡ chữ nhỏ hơn hẳn (`text-xs`) và viền vàng nhạt, không ăn nhập với các nút `text-sm` màu xanh bên dưới.
- **Đề xuất cải tiến ([MeetingBottomBar.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/components/meeting/MeetingBottomBar.tsx))**:
  - Chuyển nhóm `THIẾT BỊ & TÍNH NĂNG AI` sang **Lưới 2 cột (`grid-cols-2 gap-2`)** giống nhóm trên để giảm một nửa chiều cao modal, hiển thị trọn vẹn mọi tính năng trong 1 màn hình mà không cần cuộn!
  - Đồng bộ kích thước chữ/icon của nút `Giao diện sáng/tối` với các ô còn lại.

---

## Nhóm VI: Hệ Thống Sidecar Panels Trong Phòng Họp (`#22` – `#28`)

### 17. Ảnh `#22`, `#23`, `#24`, `#25`, `#26`, `#27`, `#28`: Kiến Trúc Chung Của Cột Sidecar Phải
- **File ảnh**:
  - `Mọi người`: [shot_pc_22_panel_people.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_22_panel_people.png) | [shot_mobile_22_panel_people.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_22_panel_people.png)
  - `Chat`: [shot_pc_23_panel_chat.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_23_panel_chat.png) | [shot_mobile_23_panel_chat.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_23_panel_chat.png)
  - `Trợ lý AI - Phụ đề`: [shot_pc_24_panel_ai_subtitles.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_24_panel_ai_subtitles.png) | [shot_mobile_24_panel_ai_subtitles.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_24_panel_ai_subtitles.png)
  - `Trợ lý AI - Việc làm`: [shot_pc_25_panel_ai_actions.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_25_panel_ai_actions.png) | [shot_mobile_25_panel_ai_actions.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_25_panel_ai_actions.png)
  - `Trợ lý AI - Tóm tắt`: [shot_pc_26_panel_ai_recap.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_26_panel_ai_recap.png) | [shot_mobile_26_panel_ai_recap.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_26_panel_ai_recap.png)
  - `Hoạt động`: [shot_pc_27_panel_activities.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_27_panel_activities.png) | [shot_mobile_27_panel_activities.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_27_panel_activities.png)
  - `Chủ phòng`: [shot_pc_28_panel_host_controls.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_28_panel_host_controls.png) | [shot_mobile_28_panel_host_controls.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_28_panel_host_controls.png)

- **Phân tích từng Panel cụ thể**:
  1. **Thanh `.meeting-panel-tabs` ở đỉnh mọi Panel (`#22` – `#28`)**:
     - Trong **tất cả 14 bức ảnh từ `#22` đến `#28`**, tab thứ 5 (`Chủ phòng`) đều bị cắt cụt chữ thành **`"Chủ p"`** (PC) hoặc **`"Chủ pl"`** (Mobile)!
     - Ngoài ra, thanh tab này có nút đóng `X` ngay bên dưới ở từng panel, gây ra 2 tầng điều hướng trùng lặp.
  2. **Panel `Mọi người` (`#22`)**:
     - Hộp `Sao chép liên kết mời` hiển thị thêm một ô input chứa URL đầy đủ `http://localhost:5173/meeting/6MMKXK` ngay bên dưới nút `Sao chép liên kết mời`, chiếm khá nhiều diện tích dọc. Có thể gộp URL và nút Copy vào cùng 1 dòng компакт.
  3. **Panel `Chat` (`#23`)**:
     - **3 hộp thông báo tĩnh** (`Để mọi người gửi tin nhắn`, `Chỉ những người trong cuộc gọi mới có thể xem tin nhắn...`, và dòng chữ to `Tệp đính kèm hiện chỉ gửi tên và kích thước...`) chiếm mất **40% chiều cao khung chat**, đẩy tin nhắn thực tế xuống dưới.
  4. **Panel `Trợ lý AI` — Tab `Phụ đề` (`#24`), `Việc làm` (`#25`), `Tóm tắt` (`#26`)**:
     - Khi chuyển sang tab `Việc làm` (`#25`) hoặc `Tóm tắt` (`#26`), phần đầu vẫn cố định tiêu đề **`"Phụ đề trực tiếp - Tự động theo dõi nội dung mới nhất"`** và **ô chọn ngôn ngữ dịch + nút `Gốc`** (vốn chỉ có tác dụng cho tab `Phụ đề`!).
     - Ở tab `Việc làm` (`#25`), khi chưa có dữ liệu, thông báo ghi `"Không có mục nào phù hợp bộ lọc."` dù người dùng chưa hề bật bộ lọc nào.
     - Ở tab `Tóm tắt` (`#26`), bên dưới nút `Tạo tóm tắt cuộc họp` là một khoảng đen trống hoàn toàn (`~500px`), không có hướng dẫn hay khung Hỏi đáp AI (Ask AI).
  5. **Panel `Hoạt động` (`#27`)**:
     - Bố cục 5 thẻ công cụ (`Bảng trắng`, `Ghi lại cuộc họp`, `Dịch lời nói & Phụ đề AI`, `Biên bản họp & Laya AI`, `Cabin phiên dịch tai nghe`) có màu sắc icon đẹp, nhưng phần mô tả phụ ở 4/5 thẻ đều bị cắt `...` (`"Vẽ, phác thảo ý tưởng và ghi chú với mọi n..."`, `"Đọc bản dịch trực tiếp (TTS) kèm duckin..."`). Nên cho phép mô tả hiển thị tối đa 2 dòng (`line-clamp-2`) thay vì `truncate` 1 dòng.
  6. **Panel `Chủ phòng` (`#28`)**:
     - Bố cục các thẻ radio `Mở`, `Đáng tin cậy`, `Hạn chế` rõ ràng, dễ hiểu. Tuy nhiên nút radio `<input type="radio">` mặc định có kích thước nhỏ (`13x13px`), nên bọc পুরো thẻ bằng `<label>` có `cursor-pointer` để toàn bộ thẻ đều nhận thao tác chạm.

---

## Nhóm VII: Hộp Thoại Thiết Bị, Bố Cục, Cài Đặt Phòng Họp & Kết Thúc (`#29` – `#37`)

### 18. Ảnh `#29` & `#30`: Hộp Thoại Thiết Bị Âm Thanh & Camera
- **File ảnh**:
  - [shot_pc_29_dialog_audio_devices.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_29_dialog_audio_devices.png) | [shot_mobile_29_dialog_audio_devices.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_29_dialog_audio_devices.png)
  - [shot_pc_30_dialog_video_devices.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_30_dialog_video_devices.png) | [shot_mobile_30_dialog_video_devices.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_30_dialog_video_devices.png)
- **Phân tích Bố cục & UX/UI**:
  - **Vấn đề phát hiện trên ảnh**:
    1. **Thiếu nút Đóng (`X` hoặc `Xong`) trên cả 2 hộp thoại (`#29`, `#30`)**:
       - Đặc biệt trên Mobile ([shot_mobile_30_dialog_video_devices.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_30_dialog_video_devices.png)), hộp thoại `CHỌN CAMERA` mở ra một tấm bottom sheet cao **90% màn hình** chỉ để hiển thị 1 dòng `fake_device_0`, phần dưới trống đen hoàn toàn và **không có nút `X` nào để đóng lại**!
- **Đề xuất cải tiến ([MeetingBottomBar.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/components/meeting/MeetingBottomBar.tsx))**:
  - Bổ sung header có nút đóng `X` cho cả hộp thoại Audio và Camera, đồng thời trên Mobile đặt chiều cao tự động (`h-auto`) thay vì chiếm cứng `90vh`.

---

### 19. Ảnh `#31`: Hộp Thoại Chọn Bố Cục (`LayoutDialog`)
- **File ảnh**:
  - [shot_pc_31_dialog_layout.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_31_dialog_layout.png)
  - [shot_mobile_31_dialog_layout.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_31_dialog_layout.png)
- **Phân tích Bố cục & UX/UI**:
  - **Vấn đề phát hiện trên ảnh**:
    1. **100% tiếng Anh chưa được Việt hóa**: Tiêu đề `"Change Meeting Layout"` và 4 mô tả (`"Auto — Automatically chooses..."`, `"Tiled"`, `"Spotlight"`, `"Sidebar"`) đang viết bằng tiếng Anh trong khi toàn bộ ứng dụng đang ở chế độ Tiếng Việt.
    2. **Lỗi "Hộp lồng hộp lệch trái" trên PC ([shot_pc_31_dialog_layout.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_31_dialog_layout.png))**: Khung ngoài rộng hơn khung trong tạo ra một mảng hộp tối dư ở bên phải.
- **Đề xuất cải tiến ([MeetingBottomBar.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/components/meeting/MeetingBottomBar.tsx))**:
  - Việt hóa toàn bộ hộp thoại (`Đổi bố cục hiển thị`, `Tự động`, `Lưới ô vuông (Tiled)`, `Tiêu điểm (Spotlight)`, `Thanh bên (Sidebar)`) và xóa lớp hộp lồng nhau.

---

### 20. Ảnh `#32a`, `#32b`, `#32c`, `#32d`: Hộp Thoại Cài Đặt Cuộc Họp (`MeetingSettingsDialog`)
- **File ảnh**:
  - `Âm thanh`: [shot_pc_32a_meeting_settings_audio.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_32a_meeting_settings_audio.png) | [shot_mobile_32a_meeting_settings_audio.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_32a_meeting_settings_audio.png)
  - `Phụ đề`: [shot_pc_32b_meeting_settings_subtitles.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_32b_meeting_settings_subtitles.png) | [shot_mobile_32b_meeting_settings_subtitles.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_32b_meeting_settings_subtitles.png)
  - `Tiện ích`: [shot_pc_32c_meeting_settings_sidecar.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_32c_meeting_settings_sidecar.png) | [shot_mobile_32c_meeting_settings_sidecar.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_32c_meeting_settings_sidecar.png)
  - `Kỹ năng AI`: [shot_pc_32d_meeting_settings_skills.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_32d_meeting_settings_skills.png) | [shot_mobile_32d_meeting_settings_skills.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_32d_meeting_settings_skills.png)
- **Phân tích Bố cục & UX/UI**:
  - **Vấn đề phát hiện trên ảnh**:
    1. **Cắt chữ nút bấm trên cả PC lẫn Mobile**:
       - Trên PC `#32b` ([shot_pc_32b_meeting_settings_subtitles.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_32b_meeting_settings_subtitles.png)): nút thứ 4 cỡ chữ bị cắt thành **`"Cực lớn (..."`**, và các nút độ mờ nền bị cắt thành **`"Trong suốt (5..."`** và **`"Tiêu chuẩn (8..."`**!
       - Trên Mobile `#32a` ([shot_mobile_32a_meeting_settings_audio.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_32a_meeting_settings_audio.png)): nút độ nhạy VAD bị cắt thành **`"Mạnh (Lọc ca..."`**, tốc độ đọc bị cắt thành **`"1.0x (Chu..."`** và **`"1.4x (Nha..."`**, và thanh tab trên cùng cắt mất tab **`"Tiện í"`** (còn tab thứ 5 `Kỹ năng AI` bị khuất hoàn toàn)!
    2. **Trên Mobile `#32d` ([shot_mobile_32d_meeting_settings_skills.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_32d_meeting_settings_skills.png))**:
       - Nút `+ Thêm kỹ năng` bị bóp hẹp nên chữ gãy thành **3 dòng dọc (`Thêm / kỹ / năng`)** rất xấu!
- **Đề xuất cải tiến ([MeetingSettingsDialog.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/components/meeting/MeetingSettingsDialog.tsx))**:
  - Rút gọn nhãn các nút chọn để hiển thị trọn vẹn 100% trên cả PC và Mobile (`Nhỏ`, `Vừa`, `Lớn`, `Rất lớn`; `Mờ 50%`, `Chuẩn 80%`, `Đậm 95%`; `Nhẹ`, `Chuẩn`, `Mạnh`; `0.8x`, `1.0x`, `1.2x`, `1.4x`).
  - Thêm `whitespace-nowrap shrink-0` cho nút `+ Thêm kỹ năng` trong tab `Kỹ năng AI`.

---

### 21. Ảnh `#33`, `#34`, `#35`: Floating PiP, Thẻ Thông Tin Họp & Offline Banner
- **File ảnh**:
  - [shot_pc_33_floating_pip_and_hand.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_33_floating_pip_and_hand.png) | [shot_mobile_33_floating_pip_and_hand.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_33_floating_pip_and_hand.png)
  - [shot_pc_34_meeting_info_card.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_34_meeting_info_card.png) | [shot_mobile_34_meeting_info_card.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_34_meeting_info_card.png)
  - [shot_pc_35_offline_banner.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_35_offline_banner.png) | [shot_mobile_35_offline_banner.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_35_offline_banner.png)
- **Phân tích Bố cục & UX/UI**:
  - **Vấn đề phát hiện trên ảnh**:
    1. **Ảnh `#34` (`shot_pc_34_meeting_info_card.png`)**: Thẻ nổi `Cuộc họp đã sẵn sàng` ở góc dưới trái đè một nửa lên huy hiệu tên người tham gia `Hieu (PC)` trong khung video.
    2. **Ảnh `#35` (`shot_pc_35_offline_banner.png` & `shot_mobile_35_offline_banner.png`)**: Khi thanh cảnh báo `Mất mạng — đang chờ kết nối lại` xuất hiện, huy hiệu ở góc trên phải **vẫn báo chấm xanh `• Đã kết nối` và `• Excellent`** — gây mâu thuẫn trạng thái trực tiếp cho người dùng!
- **Đề xuất cải tiến ([MeetingShell.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/components/meeting/MeetingShell.tsx) & [MeetingTopBar.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/components/meeting/MeetingTopBar.tsx))**:
  - Đồng bộ trạng thái mạng trên `MeetingTopBar` với sự kiện `isOffline` để hiển thị `Mất kết nối` màu vàng/đỏ nhất quán.

---

### 22. Ảnh `#36` & `#37`: Biên Bản Cuộc Họp Khi Rời Phòng & Màn Hình Đã Rời Cuộc Họp
- **File ảnh**:
  - [shot_pc_36_post_meeting_modal.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_36_post_meeting_modal.png) | [shot_mobile_36_post_meeting_modal.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_36_post_meeting_modal.png)
  - [shot_pc_37_left_meeting_screen.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_pc_37_left_meeting_screen.png) | [shot_mobile_37_left_meeting_screen.png](file:///d:/MyProject/AI-Translate-Meeting/ui-screenshots/shot_mobile_37_left_meeting_screen.png)
- **Phân tích Bố cục & UX/UI**:
  - **Điểm tốt**:
    - Màn hình `#37` (`Bạn đã rời khỏi cuộc họp`) là một trong những màn hình đẹp và cân đối nhất toàn hệ thống trên cả PC lẫn Mobile.
  - **Vấn đề phát hiện trên ảnh `#36` (`shot_mobile_36_post_meeting_modal.png`)**:
    1. Hàng nút dưới cùng của `Biên bản cuộc họp` trên Mobile có 5 nút (`Sao chép tóm tắt`, `Xuất biên bản PDF`, `.MD`, `Đóng`, `Rời cuộc họp`) bị gãy thành 2 hàng lộn xộn, trong đó nút `Đóng` chỉ là chữ trần không có khung viền nằm cạnh nút đỏ `Rời cuộc họp`.
- **Đề xuất cải tiến ([MeetingRoomPage.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/pages/MeetingRoomPage.tsx))**:
  - Trên Mobile, gom 3 nút xuất dữ liệu (`Sao chép`, `PDF`, `.MD`) thành 1 hàng 3 cột đều nhau ở trên, và hàng dưới gồm 2 nút hành động rõ ràng (`Quay lại phòng` & `Rời cuộc họp`).

---

## Tổng Hợp Ma Trận Ưu Tiên Thực Thi (Action Plan)

| Mức ưu tiên | Hạng mục sửa lỗi UI/UX | Ảnh bị ảnh hưởng | File mã nguồn |
|---|---|---|---|
| **P0 (Critical)** | **Sửa lỗi 4 tab đè chữ chồng lên nhau** trên trang `/settings` Mobile | `shot_mobile_09`, `10`, `11`, `12` | [SettingsPage.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/pages/SettingsPage.tsx) |
| **P0 (Critical)** | **Sửa lỗi "Hộp lồng hộp lệch trái"** trên 3 Modal PC (`Đặt lịch`, `Thiết lập Pre-Join`, `Đổi bố cục`) & Việt hóa 100% hộp thoại `Change Meeting Layout` | `shot_pc_05`, `18`, `31`, `shot_mobile_31` | [HomePage.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/pages/HomePage.tsx), [PreJoinPage.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/pages/PreJoinPage.tsx), [MeetingBottomBar.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/components/meeting/MeetingBottomBar.tsx) |
| **P0 (Critical)** | **Sửa lỗi cắt chữ `"Chủ p..."` trên `.meeting-panel-tabs`** và ẩn Header/Ngôn ngữ phụ đề dư thừa khi đang ở tab `Việc làm` / `Tóm tắt` | `shot_pc/mobile_22` đến `28` | [MeetingShell.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/components/meeting/MeetingShell.tsx), [SubtitlePanel.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/components/meeting/SubtitlePanel.tsx) |
| **P1 (High)** | **Sửa toàn bộ lỗi cắt chữ (`...`) và gãy chữ 3 dòng** trong `MeetingSettingsDialog` trên cả PC và Mobile | `shot_pc/mobile_32a`, `32b`, `32d` | [MeetingSettingsDialog.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/components/meeting/MeetingSettingsDialog.tsx) |
| **P1 (High)** | **Hạ `z-index` Cookie Banner** (không đè lên Navigation Drawer `#03`), thêm nút `X` cho hộp thoại Audio/Video (`#29`, `#30`), và thêm trạng thái Active cho nút cỡ chữ (`#20`) | `shot_pc/mobile_03`, `20`, `29`, `30` | [HomePage.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/pages/HomePage.tsx), [MeetingBottomBar.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/components/meeting/MeetingBottomBar.tsx) |
| **P1 (High)** | **Thu gọn 3 hộp thông báo tĩnh trong `ChatPanel` (`#23`)** và chuyển menu `Thêm (...)` (`#21`) sang lưới 2 cột để không bị tràn chiều dọc | `shot_pc/mobile_21`, `23` | [ChatPanel.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/components/meeting/ChatPanel.tsx), [MeetingBottomBar.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/components/meeting/MeetingBottomBar.tsx) |
| **P2 (Medium)** | **Tối ưu Header Mobile** trên `PreJoinPage` (`#17`), `DevelopersPage` (`#13`), `SystemStatusPage` (`#14`), `GuidePage` (`#15`) và xóa emoji cờ `[V][N]` trong `<select>` (`#05`) | `shot_mobile_05`, `13`, `14`, `15`, `17` | [PreJoinPage.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/pages/PreJoinPage.tsx), [DevelopersPage.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/pages/DevelopersPage.tsx), [SystemStatusPage.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/pages/SystemStatusPage.tsx), [GuidePage.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/pages/GuidePage.tsx) |
