import React from 'react';
import { RefreshCcw, Clock, ShieldCheck, Phone, FileCheck } from 'lucide-react';
import { PublicPageShell } from '../components/common/PublicPageShell';
import { BUSINESS_INFO } from '../config/businessInfo';
import { useLanguage } from '../context/language-context-def';

export const RefundPolicyPage: React.FC = () => {
  const { language } = useLanguage();
  const info = BUSINESS_INFO;

  const breadcrumbs = [
    { label: language === 'ja' ? 'ホーム' : language === 'en' ? 'Home' : 'Trang chủ', path: '/' },
    { label: language === 'ja' ? '返金・苦情解決ポリシー' : language === 'en' ? 'Refund Policy' : 'Khiếu nại & Hoàn tiền', path: '/chinh-sach-khieu-nai-hoan-tien' },
  ];

  return (
    <PublicPageShell
      breadcrumbs={breadcrumbs}
      pageTitle="Chính Sách Khiếu Nại & Hoàn Tiền 100% | LayaMeet"
      pageHeading="Chính Sách Tiếp Nhận Khiếu Nại & Hoàn Tiền"
      pageSubtitle="Cam kết bảo vệ quyền lợi người tiêu dùng theo quy định của Luật Bảo vệ quyền lợi người tiêu dùng và Bộ Công Thương."
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 text-zinc-800 dark:text-zinc-200 leading-relaxed text-sm">
        {/* SLA Guarantee Banner */}
        <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 space-y-2">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-base">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Cam Kết Hoàn Tiền 100% Trong Vòng 24 Giờ Nếu Không Hài Lòng</span>
          </div>
          <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80 leading-relaxed">
            LayaMeet luôn đặt sự hài lòng và trải nghiệm của quý khách hàng lên hàng đầu. Nếu hệ thống gặp sự cố kỹ thuật không đáp ứng tiêu chuẩn chất lượng SLA 99.9%, hoặc quý khách không hoàn toàn hài lòng với dịch vụ trong vòng <strong>24 giờ</strong> đầu tiên sau khi kích hoạt gói cước trả phí, chúng tôi cam kết hoàn trả 100% số tiền đã thanh toán mà không yêu cầu thêm bất kỳ thủ tục phức tạp nào.
          </p>
        </div>

        {/* Section 1: Nguyên Tắc Chung */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <FileCheck className="w-5 h-5 text-blue-600" />
            <span>1. Nguyên Tắc Tiếp Nhận &amp; Giải Quyết Khiếu Nại</span>
          </h2>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            <li>Mọi khiếu nại của khách hàng liên quan đến chất lượng dịch vụ, thanh toán, kích hoạt tài khoản hay bảo mật thông tin đều được tiếp nhận và xử lý trên tinh thần <strong>minh bạch, công bằng và tôn trọng quyền lợi người tiêu dùng</strong>.</li>
            <li>Thời gian phản hồi khiếu nại lần đầu: Tối đa <strong>2 giờ làm việc</strong> kể từ khi nhận được thông tin.</li>
            <li>Thời gian giải quyết dứt điểm khiếu nại: Không quá <strong>24 - 48 giờ làm việc</strong>.</li>
          </ul>
        </section>

        {/* Section 2: Các Trường Hợp Được Hoàn Tiền */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <RefreshCcw className="w-5 h-5 text-blue-600" />
            <span>2. Các Trường Hợp Được Áp Dụng Hoàn Tiền 100%</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-white dark:bg-[#141519] border border-zinc-200 dark:border-zinc-800 space-y-2">
              <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 font-bold flex items-center justify-center text-xs">A</span>
              <strong className="text-xs sm:text-sm text-zinc-950 dark:text-white block">Sự Cố Kỹ Thuật Hệ Thống</strong>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Hệ thống máy chủ gián đoạn hoạt động, phòng họp không thể kết nối hoặc phụ đề AI không hoạt động quá thời gian cam kết SLA (Uptime dưới 99.9%).
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-[#141519] border border-zinc-200 dark:border-zinc-800 space-y-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center text-xs">B</span>
              <strong className="text-xs sm:text-sm text-zinc-950 dark:text-white block">Thanh Toán Trùng Lặp / Nhầm</strong>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Khách hàng bị trừ tiền 2 lần do lỗi mạng của ngân hàng hoặc vô tình đặt lệnh thanh toán trùng mã đơn hàng.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-[#141519] border border-zinc-200 dark:border-zinc-800 space-y-2">
              <span className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 font-bold flex items-center justify-center text-xs">C</span>
              <strong className="text-xs sm:text-sm text-zinc-950 dark:text-white block">Chính Sách Hài Lòng 24H</strong>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Khách hàng mới kích hoạt gói trả phí nhưng nhận thấy tính năng không phù hợp với đặc thù công việc và gửi yêu cầu hoàn tiền trong vòng 24 giờ đầu.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Quy Trình Tiếp Nhận & Hoàn Tiền 4 Bước */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span>3. Quy Trình 4 Bước Tiếp Nhận &amp; Hoàn Tiền</span>
          </h2>
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shrink-0 text-xs">1</div>
              <div>
                <strong>Gửi Yêu Cầu Khiếu Nại:</strong> Quý khách liên hệ qua Hotline <strong>{info.hotline}</strong> hoặc gửi Email về <strong>{info.email}</strong> kèm theo: Mã đơn hàng / Email đăng ký, mô tả sự cố gặp phải và thông tin số tài khoản ngân hàng nhận tiền hoàn.
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shrink-0 text-xs">2</div>
              <div>
                <strong>Xác Minh Kỹ Thuật (Trong 2 - 4 Giờ):</strong> Kỹ sư giải pháp và bộ phận kế toán của LayaMeet tiến hành đối soát nhật ký phiên họp và thông tin thanh toán trên cổng ngân hàng.
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shrink-0 text-xs">3</div>
              <div>
                <strong>Xác Nhận &amp; Khởi Tạo Lệnh Hoàn Tiền:</strong> Bộ phận Chăm sóc khách hàng gửi email thông báo chấp thuận hoàn tiền kèm biên lai ủy nhiệm chi hoàn tiền.
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs">4</div>
              <div>
                <strong>Nhận Tiền Về Tài Khoản:</strong> Số tiền được hoàn trả trực tiếp về tài khoản ngân hàng của quý khách trong thời gian từ <strong>1 đến 3 ngày làm việc</strong> (đối với chuyển khoản ngân hàng trong nước) hoặc <strong>3 đến 7 ngày làm việc</strong> (đối với thẻ tín dụng quốc tế theo quy định của ngân hàng phát hành thẻ).
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Phương Thức Hoàn Tiền */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <RefreshCcw className="w-5 h-5 text-blue-600" />
            <span>4. Phương Thức Hoàn Tiền &amp; Chi Phí</span>
          </h2>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            <li><strong>Phương thức:</strong> Tiền được hoàn trả theo đúng phương thức mà khách hàng đã thực hiện thanh toán ban đầu (chuyển khoản ngân hàng hoặc hoàn trả vào hạn mức thẻ tín dụng).</li>
            <li><strong>Không mất phí:</strong> Khách hàng không phải chịu bất kỳ khoản phí chuyển khoản hay phí dịch vụ xử lý hoàn tiền nào. LayaMeet chịu toàn bộ phí giao dịch phát sinh.</li>
          </ul>
        </section>

        {/* Section 5: Đầu Mối Tiếp Nhận */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <Phone className="w-5 h-5 text-blue-600" />
            <span>5. Đầu Mối Tiếp Nhận Khiếu Nại Chính Thức</span>
          </h2>
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs">
            <div><strong>Đơn vị tiếp nhận:</strong> {info.companyName}</div>
            <div><strong>Người chịu trách nhiệm:</strong> {info.ownerName}</div>
            <div><strong>Hotline khiếu nại 24/7:</strong> <a href={`tel:${info.hotline.replace(/\s+/g, '')}`} className="text-blue-600 font-bold hover:underline">{info.hotline}</a></div>
            <div><strong>Email chuyên trách:</strong> <a href={`mailto:${info.email}`} className="text-blue-600 font-bold hover:underline">{info.email}</a></div>
            <div><strong>Địa chỉ tiếp nhận trực tiếp:</strong> {info.address}</div>
            <div><strong>Thời gian xử lý:</strong> Thứ 2 đến Thứ 7 (08:00 - 18:00)</div>
          </div>
        </section>
      </div>
    </PublicPageShell>
  );
};
export default RefundPolicyPage;
