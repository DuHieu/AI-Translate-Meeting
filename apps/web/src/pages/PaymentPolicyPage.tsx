import React from 'react';
import { CreditCard, QrCode, FileText, ShieldCheck, Clock, Building2, HelpCircle } from 'lucide-react';
import { PublicPageShell } from '../components/common/PublicPageShell';
import { BUSINESS_INFO } from '../config/businessInfo';
import { useLanguage } from '../context/language-context-def';

export const PaymentPolicyPage: React.FC = () => {
  const { language } = useLanguage();
  const info = BUSINESS_INFO;

  const breadcrumbs = [
    { label: language === 'ja' ? 'ホーム' : language === 'en' ? 'Home' : 'Trang chủ', path: '/' },
    { label: language === 'ja' ? '決済ポリシー' : language === 'en' ? 'Payment Policy' : 'Chính sách thanh toán', path: '/chinh-sach-thanh-toan' },
  ];

  return (
    <PublicPageShell
      breadcrumbs={breadcrumbs}
      pageTitle="Chính Sách Thanh Toán & Hóa Đơn VAT | LayaMeet"
      pageHeading="Chính Sách Thanh Toán"
      pageSubtitle="Quy định minh bạch về phương thức thanh toán, quy trình xử lý giao dịch và xuất hóa đơn giá trị gia tăng (VAT) theo chuẩn Bộ Công Thương."
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 text-zinc-800 dark:text-zinc-200 leading-relaxed text-sm">
        {/* Header Notice Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 space-y-2">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold text-base">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Cam Kết Tuân Thủ Pháp Luật Thương Mại Điện Tử</span>
          </div>
          <p className="text-xs text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
            Chính sách thanh toán này được xây dựng căn cứ theo quy định của <strong>Nghị định 52/2013/NĐ-CP</strong> và <strong>Nghị định 85/2021/NĐ-CP</strong> của Chính phủ về thương mại điện tử. Tất cả giao dịch thanh toán trên nền tảng LayaMeet đều được bảo vệ bằng cơ chế mã hóa SSL 256-bit chuẩn quốc tế và hỗ trợ xuất hóa đơn điện tử hợp pháp theo quy định của Tổng cục Thuế.
          </p>
        </div>

        {/* Section 1: Phương Thức Thanh Toán */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <span>1. Các Phương Thức Thanh Toán Được Chấp Nhận</span>
          </h2>
          <p>
            Nhằm tạo điều kiện thuận lợi và an toàn tối đa cho quý khách hàng, LayaMeet áp dụng hai phương thức thanh toán chính thức:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Bank Transfer / VietQR */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#141519] border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-zinc-950 dark:text-white font-bold text-sm">
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>Chuyển Khoản Ngân Hàng (VietQR 24/7)</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Thanh toán quét mã QR tức thì qua ứng dụng Internet Banking của tất cả ngân hàng tại Việt Nam (hệ thống Napas 24/7).
              </p>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs space-y-1 font-mono">
                <div><span className="text-zinc-400">Ngân hàng:</span> <strong>{info.bankAccount.bankName}</strong></div>
                <div><span className="text-zinc-400">Số tài khoản:</span> <strong className="text-blue-600 dark:text-blue-400">{info.bankAccount.accountNumber}</strong></div>
                <div><span className="text-zinc-400">Chủ tài khoản:</span> <strong>{info.bankAccount.accountHolder}</strong></div>
                <div><span className="text-zinc-400">Nội dung CK:</span> <span className="text-amber-600 dark:text-amber-400">{info.bankAccount.qrNote}</span></div>
              </div>
            </div>

            {/* Credit Card / Gateways */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#141519] border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-zinc-950 dark:text-white font-bold text-sm">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>Thẻ Quốc Tế & Cổng Thanh Toán Trực Tuyến</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Chấp nhận thẻ thanh toán quốc tế <strong>Visa, MasterCard, JCB, American Express</strong> thông qua cổng thanh toán được cấp phép hoạt động tại Việt Nam và đạt chứng chỉ bảo mật quốc tế PCI-DSS Level 1.
              </p>
              <ul className="text-xs text-zinc-500 dark:text-zinc-400 list-disc list-inside space-y-1">
                <li>Bảo mật giao dịch bằng chuẩn 3D-Secure OTP.</li>
                <li>Hệ thống không lưu trữ số thẻ tín dụng hoặc mã CVV của khách hàng.</li>
                <li>Xác nhận kết quả thanh toán ngay lập tức trên màn hình.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 2: Quy Trình Thanh Toán */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span>2. Quy Trình Thanh Toán Từng Bước</span>
          </h2>
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shrink-0 text-xs">1</div>
              <div>
                <strong>Chọn Gói Dịch Vụ:</strong> Quý khách truy cập trang Bảng Giá (`/pricing`) và chọn gói dịch vụ mong muốn (Gói Tháng Pro, Gói Năm Tiết Kiệm hoặc Yêu cầu On-Premise).
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shrink-0 text-xs">2</div>
              <div>
                <strong>Xác Nhận Đơn Hàng:</strong> Hệ thống hiển thị cửa sổ Thanh toán (Checkout) với đầy đủ thông tin: Tên gói, thời hạn sử dụng, tổng số tiền (đã bao gồm thuế GTGT nếu có) và mã đơn hàng định danh duy nhất.
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shrink-0 text-xs">3</div>
              <div>
                <strong>Thực Hiện Thanh Toán:</strong> Quý khách chọn phương thức Chuyển khoản VietQR hoặc Thẻ quốc tế và tiến hành xác thực giao dịch qua ứng dụng ngân hàng.
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs">4</div>
              <div>
                <strong>Kích Hoạt Dịch Vụ Tức Thì:</strong> Ngay khi hệ thống ngân hàng ghi nhận giao dịch thành công (thời gian xử lý trung bình dưới 60 giây), tài khoản của quý khách được tự động nâng cấp và hệ thống gửi email xác nhận biên nhận thanh toán.
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Đơn vị tiền tệ & Giá cả */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>3. Đơn Vị Tiền Tệ &amp; Quy Định Về Giá Cả</span>
          </h2>
          <ul className="space-y-2 list-disc list-inside text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            <li><strong>Đồng tiền thanh toán:</strong> Mọi báo giá và giao dịch trên nền tảng LayaMeet đều được niêm yết và thanh toán bằng <strong>Việt Nam Đồng (VNĐ)</strong>.</li>
            <li><strong>Minh bạch chi phí:</strong> Giá cước niêm yết trên website là giá cước trọn gói, không phát sinh chi phí ẩn hoặc phí duy trì phòng họp ngoài các điều khoản đã công bố.</li>
            <li><strong>Gói dùng thử miễn phí:</strong> Gói Community hoàn toàn miễn phí, không yêu cầu nhập thẻ tín dụng trước khi sử dụng.</li>
          </ul>
        </section>

        {/* Section 4: Hóa Đơn Điện Tử VAT */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>4. Quy Định Xuất Hóa Đơn Giá Trị Gia Tăng (VAT e-Invoice)</span>
          </h2>
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            <p>
              Khách hàng là doanh nghiệp, tổ chức hoặc cá nhân có nhu cầu xuất hóa đơn giá trị gia tăng (Hóa đơn điện tử) vui lòng cung cấp thông tin xuất hóa đơn trong vòng <strong>48 giờ</strong> kể từ thời điểm thanh toán thành công:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Tên công ty / Đơn vị mua hàng.</li>
              <li>Mã số thuế doanh nghiệp (MST).</li>
              <li>Địa chỉ trụ sở chính theo Giấy phép ĐKKD.</li>
              <li>Email tiếp nhận hóa đơn điện tử (.xml / .pdf).</li>
            </ul>
            <p className="pt-1">
              Hóa đơn điện tử hợp lệ sẽ được phát hành qua hệ thống hóa đơn điện tử đã đăng ký với Tổng cục Thuế và gửi thẳng về email đăng ký của quý khách.
            </p>
          </div>
        </section>

        {/* Section 5: Hỗ Trợ Thanh Toán */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            <span>5. Đầu Mối Hỗ Trợ Giao Dịch &amp; Giải Quyết Thắc Mắc</span>
          </h2>
          <p className="text-xs sm:text-sm">
            Mọi thắc mắc về giao dịch thanh toán, tra cứu trạng thái đơn hàng hoặc yêu cầu hỗ trợ kỹ thuật, quý khách vui lòng liên hệ với bộ phận phụ trách:
          </p>
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs">
            <div><strong>Đơn vị vận hành:</strong> {info.companyName} ({info.ownerName})</div>
            <div><strong>Hotline kỹ thuật &amp; Kế toán:</strong> <a href={`tel:${info.hotline.replace(/\s+/g, '')}`} className="text-blue-600 hover:underline">{info.hotline}</a></div>
            <div><strong>Email hỗ trợ:</strong> <a href={`mailto:${info.email}`} className="text-blue-600 hover:underline">{info.email}</a></div>
            <div><strong>Địa chỉ:</strong> {info.address}</div>
            <div><strong>Thời gian hỗ trợ:</strong> {info.workingHours}</div>
          </div>
        </section>
      </div>
    </PublicPageShell>
  );
};
export default PaymentPolicyPage;
