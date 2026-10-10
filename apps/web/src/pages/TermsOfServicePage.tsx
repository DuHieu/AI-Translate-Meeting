import React from 'react';
import { Scale, Shield, Users, AlertTriangle, FileText, Globe, Gavel } from 'lucide-react';
import { PublicPageShell } from '../components/common/PublicPageShell';
import { BUSINESS_INFO } from '../config/businessInfo';
import { useLanguage } from '../context/language-context-def';

export const TermsOfServicePage: React.FC = () => {
  const { language } = useLanguage();
  const info = BUSINESS_INFO;

  const breadcrumbs = [
    { label: language === 'ja' ? 'ホーム' : language === 'en' ? 'Home' : 'Trang chủ', path: '/' },
    { label: language === 'ja' ? '利用規約' : language === 'en' ? 'Terms of Service' : 'Điều khoản dịch vụ', path: '/dieu-khoan-dich-vu' },
  ];

  return (
    <PublicPageShell
      breadcrumbs={breadcrumbs}
      pageTitle="Điều Khoản Dịch Vụ & Thỏa Thuận Sử Dụng | LayaMeet"
      pageHeading="Điều Khoản Dịch Vụ"
      pageSubtitle="Quy định quyền và nghĩa vụ của bên cung cấp dịch vụ và người sử dụng nền tảng họp trực tuyến song ngữ AI LayaMeet."
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 text-zinc-800 dark:text-zinc-200 leading-relaxed text-sm">
        {/* Intro Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
          <div className="flex items-center gap-2 text-zinc-950 dark:text-white font-semibold text-base">
            <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Thỏa Thuận Sử Dụng Dịch Vụ Điện Tử</span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Chào mừng bạn đến với LayaMeet (layameet.com). Khi bạn truy cập, tạo phòng họp hoặc đăng ký các gói dịch vụ của chúng tôi, bạn đồng ý tuân thủ các Điều khoản dịch vụ này. Vui lòng đọc kỹ các điều khoản dưới đây trước khi bắt đầu sử dụng.
          </p>
        </div>

        {/* Section 1: Định nghĩa */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <Globe className="w-5 h-5 text-blue-600" />
            <span>1. Định Nghĩa Thuật Ngữ</span>
          </h2>
          <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            <li><strong>LayaMeet / Đơn vị cung cấp:</strong> Là nền tảng phần mềm họp trực tuyến song ngữ AI do {info.companyName} ({info.ownerName}) sở hữu và vận hành.</li>
            <li><strong>Dịch vụ:</strong> Bao gồm giải pháp truyền thông âm thanh/hình ảnh thời gian thực (WebRTC), nhận dạng giọng nói tự động (Speech-to-Text), dịch trực tiếp đa ngôn ngữ và trích xuất Action Items.</li>
            <li><strong>Khách hàng / Người dùng:</strong> Cá nhân hoặc tổ chức sử dụng dịch vụ thông qua trình duyệt web trên máy tính hoặc thiết bị di động.</li>
            <li><strong>Phiên họp:</strong> Khoảng thời gian người dùng kết nối vào một Mã phòng họp (Room Code) xác định để trao đổi thông tin.</li>
          </ul>
        </section>

        {/* Section 2: Quyền và nghĩa vụ của bên cung cấp */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <span>2. Quyền &amp; Nghĩa Vụ Của Ban Quản Trị LayaMeet</span>
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            <p><strong>Nghĩa vụ của chúng tôi:</strong></p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Đảm bảo hệ thống máy chủ và hạ tầng WebRTC hoạt động ổn định với cam kết thời gian hoạt động (Uptime SLA) tối thiểu <strong>99.9%</strong>.</li>
              <li>Tuân thủ tuyệt đối Chính sách bảo mật thông tin khách hàng, thực hiện đúng cam kết Zero Raw Audio Storage (không lưu file ghi âm thô).</li>
              <li>Hỗ trợ kỹ thuật kịp thời cho người dùng qua các kênh Hotline và Email trong giờ làm việc.</li>
              <li>Cung cấp đầy đủ hướng dẫn sử dụng và xuất hóa đơn GTGT hợp lệ khi khách hàng có yêu cầu.</li>
            </ul>
            <p className="pt-2"><strong>Quyền hạn của chúng tôi:</strong></p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Có quyền tạm ngừng hoặc khóa phòng họp của người dùng có hành vi vi phạm pháp luật hoặc cố tình tấn công phá hoại hạ tầng mạng.</li>
              <li>Có quyền cập nhật, nâng cấp tính năng và điều chỉnh giá cước sau khi đã thông báo công khai trước tối thiểu 15 ngày trên website.</li>
            </ul>
          </div>
        </section>

        {/* Section 3: Quyền và nghĩa vụ của khách hàng */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>3. Quyền &amp; Nghĩa Vụ Của Người Dùng</span>
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            <p><strong>Quyền của khách hàng:</strong></p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Được sử dụng đầy đủ các tính năng tương ứng với gói cước đã đăng ký.</li>
              <li><strong>Toàn quyền sở hữu dữ liệu:</strong> Khách hàng sở hữu 100% bản quyền đối với các nội dung thảo luận, biên bản họp và phụ đề được sinh ra trong phòng họp của mình.</li>
              <li>Yêu cầu hỗ trợ kỹ thuật và yêu cầu hoàn tiền theo đúng Chính sách hoàn tiền của LayaMeet.</li>
            </ul>
            <p className="pt-2"><strong>Nghĩa vụ của khách hàng:</strong></p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Chịu trách nhiệm bảo mật đường dẫn và mã phòng họp, không chia sẻ quyền quản trị phòng họp cho người không có thẩm quyền.</li>
              <li>Không sử dụng nền tảng LayaMeet vào các mục đích vi phạm an ninh quốc gia, phát tán nội dung độc hại, lừa đảo hoặc vi phạm thuần phong mỹ tục.</li>
              <li>Không thực hiện các hành vi can thiệp kỹ thuật trái phép, dịch ngược mã nguồn hoặc gây quá tải hệ thống.</li>
            </ul>
          </div>
        </section>

        {/* Section 4: Bản quyền và sở hữu trí tuệ */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>4. Quyền Sở Hữu Trí Tuệ &amp; Thương Hiệu</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            Toàn bộ nhãn hiệu, logo LayaMeet, giao diện đồ họa, mã nguồn phần mềm và các tài liệu hướng dẫn liên quan đều thuộc quyền sở hữu trí tuệ của {info.companyName}. Nghiêm cấm sao chép, phân phối lại hoặc thương mại hóa trái phép các tài sản trí tuệ này mà không có sự đồng ý bằng văn bản của chúng tôi.
          </p>
        </section>

        {/* Section 5: Giới hạn trách nhiệm */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <AlertTriangle className="w-5 h-5 text-blue-600" />
            <span>5. Giới Hạn Trách Nhiệm &amp; Trường Hợp Bất Khả Kháng</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            LayaMeet không chịu trách nhiệm bồi thường đối với các thiệt hại phát sinh từ sự cố do nhà cung cấp mạng viễn thông của người dùng, sự cố đứt cáp quang biển quốc tế, thiên tai, chiến tranh hoặc các trường hợp bất khả kháng theo quy định của pháp luật. Trong mọi trường hợp, giới hạn trách nhiệm bồi thường cao nhất của LayaMeet không vượt quá tổng số tiền phí dịch vụ mà khách hàng đã thanh toán cho gói cước đang sử dụng trong tháng phát sinh sự cố.
          </p>
        </section>

        {/* Section 6: Luật áp dụng & Tranh chấp */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <Gavel className="w-5 h-5 text-blue-600" />
            <span>6. Luật Áp Dụng &amp; Giải Quyết Tranh Chấp</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            Các điều khoản này được điều chỉnh và giải thích theo <strong>Pháp luật nước Cộng hòa Xã hội Chủ nghĩa Việt Nam</strong>. Mọi tranh chấp phát sinh từ hoặc liên quan đến việc sử dụng dịch vụ trước hết sẽ được giải quyết thông qua thương lượng hòa giải thiện chí. Trường hợp không đạt được thỏa thuận hòa giải trong vòng 30 ngày, tranh chấp sẽ được đưa ra giải quyết tại Tòa án nhân dân có thẩm quyền tại Thành phố Hà Nội.
          </p>
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1 text-xs">
            <div><strong>Đại diện pháp lý:</strong> {info.ownerName} - {info.companyName}</div>
            <div><strong>Địa chỉ liên hệ:</strong> {info.address}</div>
            <div><strong>Hotline tiếp nhận:</strong> {info.hotline} · <strong>Email:</strong> {info.email}</div>
          </div>
        </section>
      </div>
    </PublicPageShell>
  );
};
export default TermsOfServicePage;
