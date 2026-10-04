# 🚀 CẨM NANG TÍNH NĂNG VIRAL & CƠ CHẾ TĂNG TRƯỞNG TỰ NHIÊN (PRODUCT-LED GROWTH) CHO LAYAMEET

> **Triết lý cốt lõi:** Một sản phẩm họp trực tuyến thành công **không thể chỉ dựa vào quảng cáo trả phí (Paid Ads)** mà phải có cơ chế **tự nhân bản (Built-in Virality)**: *Mỗi một cuộc họp diễn ra phải mang lại ít nhất từ 1 đến 5 người dùng tiềm năng mới.*

---

## 1. TÍNH NĂNG VIRAL ĐÃ TÍCH HỢP VÀO CODE: "CHIA SẺ BIÊN BẢN CUỘC HỌP KÈM THƯƠNG HIỆU"

### Cơ chế hoạt động:
* **Vị trí tích hợp:** Component `apps/web/src/components/meeting/PostMeetingModal.tsx`.
* **Hành vi người dùng:** Sau khi cuộc họp kết thúc, người chủ trì (Host) hoặc người tham gia có thói quen tổng hợp lại nội dung để gửi cho sếp hoặc đồng nghiệp.
* **Nút bấm mới:** `[Chia sẻ Zalo / Slack]` (biểu tượng `Share2` màu xanh lá nổi bật).
* **Nội dung sao chép tự động:**
  ```text
  📝 [TÓM TẮT BIÊN BẢN CUỘC HỌP ABC-XYZ]

  ✨ Điểm chính đã thống nhất:
  • Thống nhất chốt phương án kiến trúc hệ thống trước ngày 15/10.
  • Khách hàng đồng ý tăng ngân sách dự án thêm 20%.

  📌 Việc cần làm: 3 đầu việc đã được phân công.

  🚀 Biên bản được tổng hợp & dịch tự động bởi LayaMeet AI.
  👉 Trải nghiệm phòng họp trực tuyến dịch song ngữ thời gian thực miễn phí tại: https://layameet.com
  ```
* **Attribution trong tệp Markdown/PDF xuất ra:**
  ```markdown
  ---
  _Biên bản cuộc họp được tổng hợp & dịch tự động bởi [LayaMeet AI](https://layameet.com) — Nền tảng họp trực tuyến xóa bỏ rào cản ngôn ngữ._
  ```

### Hiệu ứng Viral (K-Factor):
* Khi chủ cuộc họp gửi đoạn tóm tắt này vào nhóm Zalo 20 người hoặc kênh Slack công ty, toàn bộ các thành viên vắng mặt hoặc lãnh đạo đều thấy thương hiệu **LayaMeet.com** với ấn tượng: *"Nền tảng này xịn thế, tự tóm tắt và dịch được cả biên bản họp à?"*.
* Tỷ lệ click thử vào đường link `layameet.com` từ tệp này ước tính đạt **18% - 25%**.

---

## 2. VŨ KHÍ VIRAL CHIẾN LƯỢC: "CỬA SỔ PHỤ ĐỀ NỔI PIP" (PARASITIC GROWTH)

### Vấn đề của người dùng:
Doanh nghiệp lớn hoặc khách hàng nước ngoài đã có sẵn quy định nội bộ: *"Bắt buộc phải họp qua Zoom / Google Meet / Microsoft Teams của khách hàng"*. Người dùng Việt Nam **không thể tự ý đổi link họp sang LayaMeet**.

### Giải pháp LayaMeet:
* Tính năng **`FloatingSubtitleWidget.tsx`** cho phép tách riêng một cửa sổ phụ đề nổi (Picture-in-Picture).
* Người dùng vẫn tham gia Google Meet hoặc Zoom như bình thường, nhưng bật song song LayaMeet ở chế độ cửa sổ phụ đề nổi đè lên trên.
* LayaMeet lắng nghe âm thanh từ loa/mic và hiển thị phụ đề dịch trực tiếp tiếng Anh $\rightarrow$ tiếng Việt, tiếng Nhật $\rightarrow$ tiếng Việt.

### Cách biến tính năng này thành kênh Viral:
1. Đặt dòng watermark nhỏ ở góc dưới phụ đề nổi: `Powered by LayaMeet.com · Thử bản Pro`.
2. Khi người dùng chụp ảnh màn hình hoặc quay clip chia sẻ với đồng nghiệp, thương hiệu LayaMeet luôn xuất hiện trực quan.
3. Hướng phát triển tiếp theo: Đóng gói thành **Chrome Extension** *"LayaMeet AI Subtitles for Google Meet"*, đưa lên Chrome Web Store để hút lượng tìm kiếm organic hàng nghìn lượt mỗi tháng.

---

## 3. CỖ MÁY THU TIỀN TỰ ĐỘNG (MONETIZATION & CONVERSION MATRIX)

Hệ thống đã có sẵn `BillingController.cs` và `CheckoutModal.tsx` hỗ trợ VietQR tự động 100%. Chiến lược định giá được thiết kế để "chuyển đổi không ma sát" (Frictionless Conversion):

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        PHỄU CHUYỂN ĐỔI DOANH THU                       │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ Gói Dịch Vụ       │ Mức Giá (VNĐ)     │ Điểm Kích Hoạt (Trigger Point) │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ Vé Họp Nhanh (1H) │ 29.000 đ          │ Hết 40 phút miễn phí, cuộc họp │
│                   │                   │ đang cao trào cần thêm 1 tiếng │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ Vé 24 Giờ         │ 99.000 đ          │ Dành cho ngày tổ chức Workshop │
│                   │                   │ hoặc phỏng vấn nhiều ứng viên  │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ Team Pro (Tháng)  │ 499.000 đ/tháng   │ Nhóm dự án, công ty Outsourcing│
│                   │                   │ họp cố định hằng ngày          │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ Enterprise        │ Báo giá dự án     │ Cơ quan, ngân hàng cần cài     │
│ On-Premise        │ (15 - 50 triệu)   │ Server riêng qua Docker/Script │
└───────────────────┴───────────────────┴────────────────────────────────┘
```

### Yếu tố then chốt tạo doanh thu nhanh:
1. **Gói "Vé 1 Giờ - 29.000đ":** Mức giá tâm lý cực rẻ (bằng 1 ly trà đá hoặc bánh mì). Khi cuộc họp bị ngắt ở phút 40 và khách hàng đang nói dở, người dùng sẵn sàng quét VietQR ngay trong 3 giây để tiếp tục mà không đắn đo.
2. **VietQR Động Napas 247:** Khách hàng không cần đăng ký thẻ tín dụng Visa/MasterCard. Chỉ cần mở app ngân hàng (Vietcombank, MB, Techcombank...) quét là hệ thống tự động kích hoạt ngay lập tức qua Webhook.

---

## 4. CHIẾN DỊCH TẶNG CREDIT GIỚI THIỆU (REFERRAL LOOP PLAYBOOK)

* **Cơ chế:** *"Tặng bạn 60 phút dịch AI song ngữ chất lượng cao khi mời 1 đồng nghiệp tạo tài khoản hoặc cùng tham gia phòng họp"*.
* **Nút bấm:** Gắn huy hiệu `[🎁 Tặng 60 phút AI]` ngay cạnh thanh điều khiển `MeetingTopBar.tsx`.
* **Hiệu quả:** Khuyến khích người dùng chủ động gửi link giới thiệu cho cả phòng ban công ty để tích lũy thời gian dịch miễn phí.
