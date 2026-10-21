# Design contract: Trang chủ + tải app (LayaMeet web)

## Audit hiện trạng (localhost:5173, 1440x900)
- Thông tin sai/lỗi thời: badge "Desktop Companion v1.0.0", "15MB" ở HomePage.tsx:50-124 và DesktopLandingSections.tsx; nút "Download for macOS" trong khi chỉ có bản Windows.
- Bộ cài thật: v1.6.0, ~10 MB, đã ký, có link chứng chỉ.
- Banner cookie che nội dung và nằm đè lên các thẻ; khu "Compatible with all video apps" hiển thị các thẻ trắng trống (logo không tải).
- Chữ quá nhỏ (9–11px) ở badge/chú thích, tương phản thấp trên nền tối; cả trang một tông tối + gradient xanh/tím/lục.
- Cấu trúc: hero → thẻ tính năng đồng dạng → bảng so sánh → FAQ → CTA; không có phần "cài đặt thế nào" rõ ràng và không có thông tin tin cậy (nhà phát hành, chữ ký, SHA-256).

## Công việc của màn hình
Người truy cập hiểu LayaMeet làm gì trong 5 giây, tải bản Windows và cài thành công mà không lo ngại; người muốn họp ngay trên web vào được phòng.

## Hành động chính
1. "Tải cho Windows" (v1.6.0 · 10 MB) 2. "Họp ngay trên web" (tạo/nhập mã phòng).

## Hướng thiết kế (đề xuất)
- Nền sáng trung tính (#F7F9FC / trắng), chữ gần đen, một màu nhấn xanh thương hiệu #0B56F0 theo icon. Bỏ gradient tím/lục, bỏ glow. Có dark mode giữ qua token (`darkMode: class` đã có).
- Typography: Plus Jakarta Sans (đã dùng); thang 14/16/18/24/36/56; không dùng chữ dưới 12px.
- Bo góc 8/12px nhất quán, đổ bóng chỉ ở modal; viền 1px thay cho nhiều lớp shadow.
- Hero 2 cột: trái là tiêu đề + 2 CTA + dòng tin cậy (nhà phát hành đã ký · không cần Admin · v1.6.0); phải là mockup phụ đề song ngữ thật (giữ InteractiveMeetingPreview, bỏ khung giả cửa sổ rối).
- Khối "Cài đặt trong 3 bước" kèm ảnh màn hình installer thật (sidebar mới), thông tin SmartScreen và link `.cer`, SHA-256 hiển thị/copy được.
- Tính năng thành danh sách 2 cột có thứ bậc (1 tính năng nổi bật + các tính năng phụ), không phải lưới thẻ đồng dạng.
- Bảng so sánh giữ, đổi sang bảng sáng, cuộn ngang an toàn trên mobile.
- Cookie banner: thanh gọn dưới đáy, không che nội dung chính.
- Bỏ nút macOS cho tới khi có bản build; thay bằng "Bản macOS: đăng ký nhận tin".

## Trạng thái bắt buộc
Loading/lỗi khi tạo phòng, mã phòng sai, tải về (đang tải/đã xong), mobile không có bản desktop (hiện hướng dẫn gửi link về máy tính), focus ring thấy rõ, tôn trọng prefers-reduced-motion.

## Responsive
320 / 768 / 1024 / 1440. Mobile: CTA tải thay bằng "Gửi link cho máy tính" + "Họp trên web".

## Loại bỏ
Gradient chữ nhiều màu, thẻ tính năng đồng dạng, số liệu hứa hẹn không kiểm chứng (<350ms, 100%) đặt thành badge lớn trừ khi có nguồn; mọi con số phiên bản/dung lượng lấy từ một hằng số duy nhất.

## Phạm vi file dự kiến
`pages/HomePage.tsx`, `components/home/{HomeHero,HomeHeader,HomeFeatures,HomeFooter,DesktopLandingSections,DownloadModal}.tsx`, `index.css` (token), cookie banner component, thêm `config/desktopRelease.ts` (version, size, filename, sha256).

## Tiêu chí xong
Lint + build web xanh; không lỗi console; Tab qua toàn trang; kiểm 4 breakpoint bằng ảnh chụp; các con số phiên bản khớp installer thật.
