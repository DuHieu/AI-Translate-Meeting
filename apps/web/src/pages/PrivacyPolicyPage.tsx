import React from 'react';
import { ShieldCheck, Lock, Eye, Database, Server, RefreshCw, UserCheck, AlertCircle, Clock } from 'lucide-react';
import { PublicPageShell } from '../components/common/PublicPageShell';
import { BUSINESS_INFO } from '../config/businessInfo';
import { useLanguage } from '../context/language-context-def';

export const PrivacyPolicyPage: React.FC = () => {
  const { language } = useLanguage();
  const info = BUSINESS_INFO;

  const breadcrumbs = [
    { label: language === 'ja' ? 'ホーム' : language === 'en' ? 'Home' : 'Trang chủ', path: '/' },
    { label: language === 'ja' ? 'プライバシーポリシー' : language === 'en' ? 'Privacy Policy' : 'Chính sách bảo mật', path: '/privacy-policy' },
  ];

  return (
    <PublicPageShell
      breadcrumbs={breadcrumbs}
      pageTitle="Privacy Policy & Data Protection | LayaMeet"
      pageHeading="Chính Sách Bảo Mật Thông Tin Khách Hàng"
      pageSubtitle="Cam kết bảo vệ dữ liệu cá nhân theo Điều 68-73 Nghị định 52/2013/NĐ-CP, Nghị định 85/2021/NĐ-CP và Nghị định 13/2023/NĐ-CP về Bảo vệ Dữ liệu Cá nhân."
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 text-zinc-800 dark:text-zinc-200 leading-relaxed text-sm">
        {/* Core Architecture Badge */}
        <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 space-y-2">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-base">
            <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Nguyên Tắc Cốt Lõi: 100% RAM-Only · Zero Raw Audio Storage</span>
          </div>
          <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80 leading-relaxed">
            LayaMeet được kiến trúc với nguyên tắc bảo mật tối thượng: luồng âm thanh thoại được xử lý theo các audio chunk 350ms trực tiếp trong bộ nhớ RAM và được giải phóng ngay lập tức sau khi mô hình Whisper sinh phụ đề song ngữ. <strong>Hệ thống không ghi âm, không lưu file âm thanh cuộc họp vào ổ cứng, và không chia sẻ dữ liệu cho bên thứ ba.</strong>
          </p>
        </div>

        {/* Section 1: Mục đích thu thập */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <Eye className="w-5 h-5 text-blue-600" />
            <span>1. Mục Đích Thu Thập Thông Tin Cá Nhân (Điều 68 NĐ 52/2013/NĐ-CP)</span>
          </h2>
          <p>
            LayaMeet chỉ thu thập các thông tin cá nhân cần thiết nhằm phục vụ các mục đích hợp pháp sau:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            <li><strong>Khởi tạo và duy trì phòng họp:</strong> Nhận diện người tham gia qua Tên hiển thị (Display Name), liên kết người tham gia với phòng họp bằng Mã phòng (Room Code).</li>
            <li><strong>Cung cấp dịch vụ dịch thuật phụ đề song ngữ:</strong> Lưu trữ cài đặt ngôn ngữ nói (Spoken Language) và ngôn ngữ dịch đích (Target Language) của từng cá nhân trong phiên họp.</li>
            <li><strong>Xác thực bản quyền &amp; Kích hoạt gói cước:</strong> Quản lý tài khoản đăng nhập qua Google OAuth, ghi nhận gói dịch vụ và thời hạn sử dụng.</li>
            <li><strong>Chăm sóc khách hàng &amp; Xuất biên bản họp:</strong> Hỗ trợ gửi thông báo cuộc họp, xuất file biên bản họp (Markdown/Word) khi người dùng chủ động bấm yêu cầu xuất dữ liệu.</li>
            <li><strong>Xuất hóa đơn tài chính:</strong> Thu thập thông tin doanh nghiệp (MST, Tên công ty) phục vụ phát hành hóa đơn GTGT hợp pháp.</li>
          </ul>
        </section>

        {/* Section 2: Phạm vi thu thập */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <Database className="w-5 h-5 text-blue-600" />
            <span>2. Phạm Vi Thu Thập Thông Tin</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-[#141519] border border-zinc-200 dark:border-zinc-800 space-y-2">
              <strong className="text-zinc-950 dark:text-white text-xs sm:text-sm block">Thông tin cơ bản thu thập:</strong>
              <ul className="text-xs text-zinc-500 dark:text-zinc-400 list-disc list-inside space-y-1">
                <li>Họ và tên hiển thị trong phòng họp.</li>
                <li>Địa chỉ Email (khi đăng nhập hoặc đặt lịch).</li>
                <li>Mã phòng họp và đường dẫn liên kết tham gia.</li>
                <li>Cài đặt thiết bị micro/camera của trình duyệt (cấp phép cục bộ).</li>
              </ul>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-[#141519] border border-zinc-200 dark:border-zinc-800 space-y-2">
              <strong className="text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm block">Cam kết không thu thập:</strong>
              <ul className="text-xs text-zinc-500 dark:text-zinc-400 list-disc list-inside space-y-1">
                <li>Không thu thập file âm thanh thô (Raw Audio).</li>
                <li>Không lưu trữ mật khẩu ngân hàng, số thẻ tín dụng hay mã CVV.</li>
                <li>Không theo dõi vị trí GPS thời gian thực.</li>
                <li>Không thu thập dữ liệu nhạy cảm ngoài phạm vi cuộc họp.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3: Phạm vi sử dụng thông tin */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <Server className="w-5 h-5 text-blue-600" />
            <span>3. Phạm Vi Sử Dụng Thông Tin (Điều 69 NĐ 52/2013/NĐ-CP)</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            Thông tin cá nhân chỉ được sử dụng trong phạm vi nội bộ nền tảng LayaMeet để phục vụ trực tiếp cho phiên họp của người dùng. Chúng tôi cam kết tuyệt đối:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            <li>Không chuyển giao, bán, cho thuê hoặc tiết lộ thông tin của khách hàng cho bất kỳ bên thứ ba nào khi chưa có sự đồng ý rõ ràng của khách hàng.</li>
            <li>Không sử dụng nội dung hội thoại, phụ đề hay biên bản họp của khách hàng để huấn luyện (train) các mô hình trí tuệ nhân tạo công cộng.</li>
            <li>Chỉ cung cấp thông tin cho cơ quan Nhà nước có thẩm quyền khi có văn bản yêu cầu chính thức theo đúng trình tự pháp luật Việt Nam.</li>
          </ul>
        </section>

        {/* Section 4: Thời gian lưu trữ */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span>4. Thời Gian Lưu Trữ Thông Tin (Điều 70 NĐ 52/2013/NĐ-CP)</span>
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            <p>
              - <strong>Dữ liệu âm thanh thoại (Voice Streams):</strong> Thời gian lưu trữ là <strong>0 giây</strong> trên ổ cứng. Bộ nhớ đệm RAM được giải phóng sau mỗi 350ms.
            </p>
            <p>
              - <strong>Dữ liệu phụ đề đệm (Redis Cache):</strong> Tồn tại tối đa trong phiên họp và có thời gian sống (TTL) 24 giờ trong bộ nhớ đệm phân tán để hỗ trợ tải lại mạng yếu, sau đó tự động hủy hoàn toàn.
            </p>
            <p>
              - <strong>Dữ liệu tài khoản &amp; Giao dịch:</strong> Được lưu trữ trong suốt thời gian khách hàng duy trì tài khoản trên hệ thống, hoặc được xóa ngay lập tức khi khách hàng yêu cầu đóng tài khoản.
            </p>
          </div>
        </section>

        {/* Section 5: Những người hoặc tổ chức được tiếp cận */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            <span>5. Đối Tượng Tiếp Cận Thông Tin (Điều 71 NĐ 52/2013/NĐ-CP)</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            Chỉ những đối tượng sau đây mới có quyền tiếp cận thông tin người dùng trong giới hạn chức năng:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            <li>Đơn vị vận hành hệ thống LayaMeet ({info.companyName}) phục vụ kỹ thuật và hỗ trợ vận hành.</li>
            <li>Các thành viên tham gia cùng phòng họp (chỉ nhìn thấy Tên hiển thị và nội dung phụ đề trong phòng).</li>
            <li>Cơ quan quản lý Nhà nước có thẩm quyền trong các trường hợp luật định.</li>
          </ul>
        </section>

        {/* Section 6: Đơn vị quản lý */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span>6. Địa Chỉ Đơn Vị Thu Thập &amp; Quản Lý Dữ Liệu (Điều 72 NĐ 52/2013/NĐ-CP)</span>
          </h2>
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs">
            <div><strong>Tên đơn vị:</strong> {info.companyName}</div>
            <div><strong>Chủ sở hữu / Người đại diện:</strong> {info.ownerName}</div>
            <div><strong>Mã số thuế:</strong> {info.taxId} ({info.taxIssuedPlace})</div>
            <div><strong>Địa chỉ trụ sở:</strong> {info.address}</div>
            <div><strong>Hotline bảo mật:</strong> <a href={`tel:${info.hotline.replace(/\s+/g, '')}`} className="text-blue-600 hover:underline">{info.hotline}</a></div>
            <div><strong>Email bảo vệ dữ liệu (DPO):</strong> <a href={`mailto:${info.email}`} className="text-blue-600 hover:underline">{info.email}</a></div>
          </div>
        </section>

        {/* Section 7: Quyền của người tiêu dùng */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <RefreshCw className="w-5 h-5 text-blue-600" />
            <span>7. Phương Thức Tiếp Cận &amp; Chỉnh Sửa Dữ Liệu Cá Nhân (Điều 73 NĐ 52/2013/NĐ-CP)</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            Khách hàng có toàn quyền tiếp cận, kiểm tra, cập nhật hoặc yêu cầu hủy bỏ thông tin cá nhân của mình bằng các hình thức:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            <li><strong>Chủ động chỉnh sửa:</strong> Truy cập mục Cài đặt (`/settings`) trên thanh điều hướng để thay đổi tên hiển thị, tùy chỉnh ngôn ngữ hoặc xóa lịch sử cuộc họp lưu cục bộ.</li>
            <li><strong>Gửi yêu cầu xóa dữ liệu:</strong> Gửi email về hòm thư <a href={`mailto:${info.email}`} className="text-blue-600 underline">{info.email}</a> với tiêu đề <em>[Yêu cầu xóa dữ liệu tài khoản]</em>. Ban quản trị sẽ xác minh và xóa dữ liệu trong vòng <strong>24 giờ làm việc</strong>.</li>
          </ul>
        </section>

        {/* Section 8: Cơ chế khiếu nại */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            <span>8. Cơ Chế Tiếp Nhận &amp; Giải Quyết Khiếu Nại Về Thông Tin Cá Nhân</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            Khi phát hiện thông tin cá nhân của mình bị sử dụng sai mục đích hoặc vi phạm các cam kết nêu trong chính sách này, người dùng có quyền khiếu nại qua Hotline <strong>{info.hotline}</strong> hoặc Email <strong>{info.email}</strong>. Ban quản trị có trách nhiệm phản hồi và đưa ra biện pháp khắc phục trong vòng <strong>24 giờ làm việc</strong> kể từ khi tiếp nhận.
          </p>
        </section>
      </div>
    </PublicPageShell>
  );
};
export default PrivacyPolicyPage;
