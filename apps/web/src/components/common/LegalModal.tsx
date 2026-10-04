import React from 'react';
import { X, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  type: 'privacy' | 'terms' | null;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, type, onClose }) => {
  if (!isOpen || !type) return null;

  const isPrivacy = type === 'privacy';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#333336] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-all"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-[#2b2b2e] flex items-center justify-between bg-zinc-50 dark:bg-[#121214]">
          <div className="flex items-center gap-2.5">
            {isPrivacy ? (
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                {isPrivacy ? 'Chính Sách Quyền Riêng Tư & Bảo Mật Dữ Liệu' : 'Điều Khoản Dịch Vụ, Thanh Toán & Hoàn Tiền'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isPrivacy ? 'Bảo vệ dữ liệu theo chuẩn Zero Raw Audio & Nghị định 13/2023/NĐ-CP' : 'Quy định sử dụng, kích hoạt dịch vụ số và cam kết hoàn tiền (SLA)'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {isPrivacy ? (
            <>
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-1">
                <div className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Nguyên Tắc Cốt Lõi: Không Bao Giờ Lưu Trữ File Âm Thanh</span>
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  LayaMeet xử lý luồng âm thanh theo các audio chunk 350ms trực tiếp trong bộ nhớ RAM, giải phóng ngay lập tức sau khi mô hình Whisper tạo phụ đề. Không có bất kỳ bản ghi âm nào được ghi xuống ổ cứng hoặc gửi tới các dịch vụ đám mây bên thứ ba.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-zinc-950 dark:text-white text-sm mb-1.5">1. Thu Thập Dữ Liệu Tối Thiểu</h4>
                <p>
                  Hệ thống chỉ xử lý các thông tin cần thiết phục vụ phiên họp: Tên hiển thị người tham gia, mã phòng họp (Room Code), cài đặt ngôn ngữ đích hiển thị phụ đề và văn bản phụ đề/biên bản họp do người dùng chủ động yêu cầu xuất file.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-zinc-950 dark:text-white text-sm mb-1.5">2. Cô Lập Dữ Liệu Trên Môi Trường On-Premise</h4>
                <p>
                  Khi doanh nghiệp lựa chọn triển khai On-Premise hoặc Private VPS, toàn bộ hệ thống bao gồm LiveKit Media Server, AI Service (Faster-Whisper) và Redis Subtitle Cache đều nằm trong vùng mạng riêng (Private Subnet) của quý doanh nghiệp.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-zinc-950 dark:text-white text-sm mb-1.5">3. Bảo Mật Truyền Thông WebRTC</h4>
                <p>
                  Mọi luồng âm thanh và hình ảnh đều được mã hóa bằng chuẩn SRTP/DTLS end-to-end theo tiêu chuẩn WebRTC quốc tế, ngăn chặn hoàn toàn nguy cơ nghe lén (Man-in-the-Middle).
                </p>
              </div>

              <div>
                <h4 className="font-bold text-zinc-950 dark:text-white text-sm mb-1.5">4. Chính Sách Cookie &amp; Google Analytics 4</h4>
                <p>
                  LayaMeet sử dụng cookie thiết yếu duy trì phiên phòng họp và Google Analytics 4 tuân thủ tiêu chuẩn Google Consent Mode v2. Toàn bộ địa chỉ IP được ẩn danh (IP Anonymization) và không thu thập bất kỳ thông tin nhận dạng cá nhân (PII) nào. Bạn có thể thay đổi tùy chọn cookie bất kỳ lúc nào tại chân trang.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-zinc-950 dark:text-white text-sm mb-1.5">5. Tuân Thủ Nghị Định 13/2023/NĐ-CP &amp; Bảo Mật Giao Dịch</h4>
                <p>
                  Chúng tôi tuân thủ đầy đủ Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân tại Việt Nam. LayaMeet không thu thập hay lưu trữ số thẻ tín dụng/thẻ ngân hàng của người dùng; mọi giao dịch nâng cấp đều thực hiện trực tiếp trên ứng dụng ngân hàng của khách hàng thông qua tiêu chuẩn VietQR Napas 247.
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h4 className="font-bold text-zinc-950 dark:text-white text-sm mb-1.5">1. Phạm Vi Dịch Vụ</h4>
                <p>
                  LayaMeet cung cấp giải pháp họp trực tuyến hỗ trợ phụ đề song ngữ thời gian thực, tổng hợp biên bản họp và trích xuất Action Items bằng AI. Chúng tôi cam kết duy trì độ sẵn sàng hệ thống (Uptime SLA) tối thiểu 99.9% cho các gói dịch vụ trả phí.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-zinc-950 dark:text-white text-sm mb-1.5">2. Trách Nhiệm Về Nội Dung Cuộc Họp</h4>
                <p>
                  Khách hàng giữ toàn quyền sở hữu đối với nội dung cuộc họp, các phụ đề được tạo ra và biên bản trích xuất. LayaMeet không can thiệp, không kiểm duyệt và không sử dụng dữ liệu hội thoại của khách hàng để huấn luyện các mô hình công cộng.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-zinc-950 dark:text-white text-sm mb-1.5">3. Phương Thức Thanh Toán &amp; Biểu Phí Minh Bạch</h4>
                <p>
                  Nền tảng áp dụng mô hình 2 gói dịch vụ minh bạch: <strong>Gói Free (0 VNĐ)</strong> và <strong>Gói Tháng Pro (99.000 VNĐ/tháng)</strong>. Thanh toán được thực hiện qua hình thức chuyển khoản ngân hàng nội địa bằng mã QR động tiêu chuẩn <strong>VietQR Napas 247</strong> với mã định danh đơn hàng duy nhất (định dạng <code>VM...</code>).
                </p>
              </div>

              <div>
                <h4 className="font-bold text-zinc-950 dark:text-white text-sm mb-1.5">4. Chính Sách Giao Nhận &amp; Kích Hoạt Dịch Vụ Số</h4>
                <p>
                  LayaMeet là dịch vụ phần mềm trực tuyến trên nền tảng đám mây (SaaS), không phát sinh vận chuyển hàng hóa vật lý. Ngay sau khi hệ thống nhận được xác nhận thanh toán thành công qua VietQR, quyền lợi <strong>Gói Tháng Pro</strong> được kích hoạt tự động trong vòng <strong>3 – 30 giây</strong> trực tiếp trên phòng họp và thiết bị của khách hàng.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-zinc-950 dark:text-white text-sm mb-1.5">5. Chính Sách Hoàn Tiền &amp; Giải Quyết Khiếu Nại (Refund Policy)</h4>
                <p>
                  Khách hàng được cam kết <strong>hoàn tiền 100%</strong> trong vòng 24 giờ làm việc trong các trường hợp: (a) Đã chuyển khoản thành công nhưng hệ thống gặp sự cố kỹ thuật không thể kích hoạt dịch vụ; (b) Chuyển khoản nhầm hoặc thừa số tiền so với giá trị đơn hàng; hoặc (c) Dịch vụ gián đoạn quá thời gian cam kết SLA. Mọi yêu cầu hỗ trợ hoàn tiền xin gửi về <strong>support@layameet.com</strong> kèm mã đơn hàng <code>VM...</code>.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-zinc-950 dark:text-white text-sm mb-1.5">6. Triển Khai On-Premise &amp; Chế Độ Thử Nghiệm (Pilot/Beta)</h4>
                <p>
                  Đối với khách hàng doanh nghiệp triển khai gói On-Premise trên máy chủ riêng, quyền sử dụng và bảo trì SLA được thực hiện theo hợp đồng thương mại và cam kết bảo mật (NDA) ký kết trực tiếp giữa hai bên.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-[#2b2b2e] bg-zinc-50 dark:bg-[#121214] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 transition-colors cursor-pointer"
          >
            Đã Hiểu &amp; Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
