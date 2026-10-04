# Live-first Sidecar

**Trạng thái:** Chốt hướng sản phẩm  
**Ngày:** 2026-10-04  
**Đối tượng ưu tiên:** Host cuộc họp

## Problem Statement

Làm sao để host theo dõi phụ đề dịch trực tiếp mà không bị phân tâm bởi lịch sử dài, nhiều tab và các công cụ phụ, trong khi vẫn có thể tải toàn bộ dữ liệu đã ghi nhận tại bất kỳ thời điểm nào?

## Recommended Direction

Phụ đề live phải xuất hiện trực tiếp trên vùng video. Sidecar chỉ là công cụ hỗ trợ cho host, không phải nơi bắt buộc phải nhìn để hiểu cuộc họp.

- Mỗi user chọn một ngôn ngữ phụ đề đích; hệ thống tự dịch theo lựa chọn đó.
- Overlay hiển thị tối đa hai dòng bản dịch và nằm phía trên thanh điều khiển cuộc họp.
- Sidecar chỉ render 8-12 câu final gần nhất và luôn tự cuộn xuống câu mới.
- Câu gốc mặc định ẩn; host có thể bật bằng một nút `Gốc` nhỏ ở header.
- Export nằm trong menu `...`; host có thể tải TXT hoặc SRT bất kỳ lúc nào, có bao nhiêu dữ liệu thì xuất bấy nhiêu.
- Việc làm, Tóm tắt, Tin nhắn và Audio Booth là module tùy chọn. Module bị tắt không xuất hiện thành tab.

### Bố cục sidecar

```text
┌─────────────────────────────────────┐
│ Phụ đề      [日本語 ▼] [Gốc] [•••] │
├─────────────────────────────────────┤
│ HIEU · 01:58                        │
│ おはようございます。                │
│                                     │
│ Tanaka · 01:59                      │
│ 資料を今日中に送ります。            │
│                                     │
│       Chỉ giữ 8-12 câu gần nhất     │
└─────────────────────────────────────┘
```

### Khi không đủ không gian

- Desktop: overlay ở giữa phía dưới vùng video, không căn theo toàn viewport khi sidecar đang mở.
- Mobile hoặc màn hình hẹp: overlay toàn chiều ngang, tối đa hai dòng, nằm trên thanh điều khiển.
- Chạm overlay trên mobile sẽ mở bottom sheet chứa 8-12 câu gần nhất.
- Đóng sidecar không được làm mất phụ đề live.

## Success Criteria

- Host hiểu nội dung dịch mà không cần mở sidecar.
- Sau khi chọn ngôn ngữ, host không phải thực hiện thao tác cuộn thủ công.
- Live view không render quá 12 câu final.
- Overlay không che thanh điều khiển hoặc khuôn mặt chính trong video.
- File tải xuống chứa toàn bộ transcript mà client hoặc server đã nhận tới thời điểm bấm tải.
- Module bị tắt không chiếm không gian điều hướng.

## Key Assumptions to Validate

- [ ] Host chủ yếu nhìn video và chỉ mở sidecar khi cần kiểm tra hoặc tải dữ liệu.
- [ ] 8-12 câu gần nhất đủ cho nhu cầu theo dõi trong cuộc họp.
- [ ] Câu gốc không cần hiển thị mặc định.
- [ ] Transcript chưa hoàn chỉnh vẫn hữu ích khi tải giữa cuộc họp.
- [ ] Giới hạn số item render giúp UI ổn định trong cuộc họp dài.
- [ ] Nguồn dữ liệu export có thể tách khỏi danh sách đang render mà không mất câu cũ.

## MVP Scope

- Language selector theo từng user.
- Overlay tối đa hai dòng bản dịch.
- Nút `Gốc` bật/tắt câu nguyên bản cho toàn bộ live view.
- Sidecar tự cuộn và chỉ render tối đa 12 câu final.
- Menu export TXT/SRT từ toàn bộ dữ liệu hiện có.
- Settings bật/tắt Việc làm, Tóm tắt, Tin nhắn và Audio Booth.
- Mobile bottom sheet cho lịch sử gần nhất.
- Accessibility label cho language selector, source toggle, menu export và trạng thái module.

## Data and Performance Boundary

Không được dùng cùng một danh sách cho cả render và export:

- `visibleHistory`: tối đa 12 câu final, dùng để render sidecar.
- `exportHistory`: dữ liệu transcript đầy đủ của session, không map trực tiếp ra DOM.
- Nếu transcript đã được lưu phía server, download nên lấy server làm nguồn chuẩn.
- Nếu MVP chưa có persistence phù hợp, dùng buffer không kích hoạt React render cho từng câu cũ; phải ghi rõ dữ liệu sẽ mất khi reload hoặc reconnect.

Giới hạn DOM là tối ưu chính. Không được xóa lịch sử nguồn chỉ để đạt UI mượt nếu việc đó làm file export mất nội dung.

## Optional Modules

Trong `Cài đặt -> Tiện ích panel`:

| Module | Mặc định | Hành vi |
|---|---:|---|
| Phụ đề | Bật, không thể tắt | Luôn có overlay và live view |
| Việc làm | Tắt | Bật mới xuất hiện tab |
| Tóm tắt AI | Tắt | Bật mới xuất hiện tab |
| Tin nhắn | Tắt | Bật mới xuất hiện tab |
| Audio Booth | Tắt | Không đặt nút trong toolbar phụ đề |
| Hiện câu gốc | Tắt | Dùng nút gọn ở header |

Quyết định tắt module chỉ ẩn UI hay tắt luôn xử lý backend phải được cấu hình riêng. Không âm thầm thay đổi hành vi backend chỉ từ trạng thái hiển thị.

## Not Doing

- Không render toàn bộ transcript trong sidecar.
- Không có tìm kiếm transcript trong live view.
- Không hiển thị tổng số câu.
- Không dùng card lớn cho từng câu.
- Không lặp badge ngôn ngữ `VI -> JA` trên từng item.
- Không có nút copy hoặc phát âm trên từng dòng trong MVP.
- Không có nút “Cuộn xuống mới nhất”; live view luôn bám câu mới.
- Không hiển thị speech simulation bar trong giao diện production.
- Không bật mặc định Audio Booth hoặc module AI.
- Không làm post-meeting transcript editor trong slice này.

## Thin-Slice Implementation Plan

### Slice 0 - Data Boundary and Tests

- Tách `visibleHistory` khỏi nguồn dữ liệu export.
- Đặt giới hạn live view là 12 final subtitle.
- Viết test chứng minh câu cũ không còn trong DOM nhưng vẫn có trong file export.
- Chốt hành vi khi reload, reconnect và host đổi ngôn ngữ.

### Slice 1 - Minimal Host Sidecar

- Rút header còn language selector, `Gốc` và menu `...`.
- Bỏ search, tổng số câu, per-row language badge, replay, copy và simulation bar khỏi live view.
- Luôn tự cuộn và chỉ hiển thị final subtitle.
- Dùng list compact thay cho card lớn.

### Slice 2 - Responsive Live Overlay

- Chỉ hiển thị bản dịch theo ngôn ngữ user chọn.
- Giới hạn hai dòng và đặt phía trên thanh điều khiển.
- Khi sidecar mở, căn overlay theo vùng video còn lại.
- Mobile mở bottom sheet khi chạm overlay.

### Slice 3 - Configurable Modules

- Thêm `Tiện ích panel` trong Settings.
- Chỉ render tab của module đang bật.
- Lưu preference theo user hoặc browser.
- Tách rõ “ẩn UI” và “tắt backend processing”.

### Slice 4 - Progressive Export

- Gom TXT/SRT vào menu `...`.
- Cho phép tải trong khi cuộc họp vẫn diễn ra.
- File phản ánh đúng dữ liệu đã nhận tới thời điểm tải.
- Kiểm thử Unicode Việt, Nhật, Anh và timestamp SRT.

### Slice 5 - UX and Performance Verification

- Kiểm thử desktop, tablet và mobile.
- Kiểm tra cuộc họp dài không làm số DOM node tăng vô hạn.
- Kiểm tra overlay không che controls và không mất khi đóng sidecar.
- Chạy frontend lint/build và browser smoke test.

## Open Questions

- Tắt Việc làm hoặc Tóm tắt chỉ ẩn UI hay tắt luôn Laya/backend processing?
- Full transcript hiện tại có nguồn server đủ tin cậy cho reconnect và tải lại trang chưa?
- Khi host đổi ngôn ngữ giữa cuộc họp, file export giữ nhiều ngôn ngữ hay chỉ ngôn ngữ hiện tại?
- Tin nhắn có thực sự thuộc sidecar này hay nên dùng panel riêng?
