# Audio Booth: Cabin Phiên Dịch Giọng Nói Thời Gian Thực (Simultaneous Voice Interpretation)

## Problem Statement
How Might We cho phép người tham gia cuộc họp song ngữ (Việt - Nhật - Anh) nghe trực tiếp giọng dịch tự nhiên qua tai nghe với độ trễ thấp (<600ms) kèm tính năng tự động giảm âm lượng người nói gốc (Audio Ducking), để họ không phải mỏi mắt đọc phụ đề chữ suốt 60 phút?

## Recommended Direction
**Client-Side Zero-Cost Hybrid Audio Booth**:
Tận dụng kiến trúc đã có của LiveKit WebRTC và kết hợp Web Speech API + Web Audio GainNode Ducking ngay trên trình duyệt:
1. **Audio Ducking (-18dB)**: Khi câu dịch được phát vào tai nghe, âm thanh người nói gốc từ LiveKit tự động hạ nhỏ xuống 18% (-15dB đến -18dB) giống hệt cabin phiên dịch truyền hình trực tiếp (BBC/CNN/Liên Hợp Quốc), giúp người nghe nghe rõ tiếng dịch mà vẫn cảm nhận được ngữ điệu gốc.
2. **Dynamic Speech Rate**: Tự động điều chỉnh tốc độ đọc (1.0x - 1.25x) dựa trên độ dài câu để bắt kịp nhịp nói tự nhiên, triệt tiêu độ trễ tích lũy.
3. **Zero Server Bandwidth**: Thực thi tổng hợp giọng nói trực tiếp tại Client qua Web Speech API (0ms độ trễ mạng, 0 chi phí máy chủ GPU/TTS).

## Key Assumptions to Validate
- [ ] **Assumption 1**: Trình duyệt của người dùng (Chrome, Edge, Safari) có sẵn voice pack chất lượng cao cho `vi-VN`, `ja-JP`, `en-US`.
  - *Cách kiểm chứng*: Viết hàm kiểm tra và benchmark voice synthesis trên các nền tảng phổ biến.
- [ ] **Assumption 2**: Audio Ducking 180ms ramp volume không gây giật tiếng hay click-noise trên WebRTC Remote Audio Stream.
  - *Cách kiểm chứng*: Kiểm thử nghe thực tế qua tai nghe với `audioDuckingRegistry.ts`.
- [ ] **Assumption 3**: Khi người nói nói nhanh, hàng đợi không bị trôi dạt (queue drift) quá 2 giây.
  - *Cách kiểm chứng*: Stress-test với luồng nói liên tục 150 từ/phút.

## MVP Scope (What's IN)
- Toggle nút "Cabin Phiên Dịch" (Headphone icon) trên thanh điều khiển [MeetingBottomBar.tsx](file:///d:/MyProject/AI-Translate-Meeting/apps/web/src/components/meeting/MeetingBottomBar.tsx).
- Thanh trượt Volume Balance: Điều chỉnh tỷ lệ Giọng dịch (0 - 100%) và Giọng gốc (0 - 100%).
- Bộ điều khiển hàng đợi thông minh: Tự động drop câu cũ nếu lag > 2.5s, chỉ đọc câu `isFinal=true`, chặn tự đọc lại tiếng của chính mình.
- Tự động hạ âm lượng giọng gốc xuống 18% khi TTS đang đọc và phục hồi 100% khi đọc xong.

## Not Doing (and Why)
- **Server-side Neural TTS (ElevenLabs / Coqui / Piper trên server)**: Tạm hoãn ở V1 vì tốn băng thông WebRTC audio track, chi phí GPU cao và độ trễ mạng phát sinh thêm 200-400ms. V1 dùng Web Speech API nhẹ tênh.
- **Voice Cloning (Nhái giọng người nói gốc)**: Phức tạp, độ trễ cao và chi phí lớn, không phù hợp cho bản MVP thời gian thực.
- **Dịch âm thanh Partial (Interim TTS)**: Tuyệt đối KHÔNG đọc câu dở dang để tránh nói ngắc ngứ đè lên nhau.

## Open Questions
- Trên các thiết bị di động (iOS Safari), chính sách autoplay audio của Apple có yêu cầu tương tác chạm (user gesture) để khởi chạy `speechSynthesis` không?
- Nên chọn giọng mặc định Nam hay Nữ cho tiếng Việt và tiếng Nhật?
