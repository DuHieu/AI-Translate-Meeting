import React from 'react';
import { Zap, HelpCircle, Laptop } from 'lucide-react';
import { PublicPageShell } from '../components/common/PublicPageShell';
import { BUSINESS_INFO } from '../config/businessInfo';
import { useLanguage } from '../context/language-context-def';

export const DeliveryPolicyPage: React.FC = () => {
  const { language } = useLanguage();
  const info = BUSINESS_INFO;

  const breadcrumbs = [
    { label: language === 'ja' ? 'ホーム' : language === 'en' ? 'Home' : 'Trang chủ', path: '/' },
    { label: language === 'ja' ? 'サービス提供ポリシー' : language === 'en' ? 'Service Delivery' : 'Giao nhận & Kích hoạt', path: '/delivery-policy' },
  ];

  return (
    <PublicPageShell
      breadcrumbs={breadcrumbs}
      pageTitle="Digital Service Delivery Policy | LayaMeet"
      pageHeading="Chính Sách Cung Cấp & Kích Hoạt Dịch Vụ Số"
      pageSubtitle="Quy định về phương thức chuyển giao bản quyền phần mềm và kích hoạt dịch vụ họp trực tuyến song ngữ AI trực tuyến."
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 text-zinc-800 dark:text-zinc-200 leading-relaxed text-sm">
        {/* Banner */}
        <div className="p-5 sm:p-6 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 space-y-2">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold text-base">
            <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Dịch Vụ Phần Mềm Số: Kích Hoạt Tức Thì (Instant Digital Delivery)</span>
          </div>
          <p className="text-xs text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
            LayaMeet là nền tảng phần mềm dịch vụ đám mây (SaaS) và On-Premise chuyên về họp trực tuyến song ngữ AI. Do đặc thù sản phẩm là <strong>dịch vụ số (Digital Service)</strong>, chúng tôi không áp dụng hình thức vận chuyển, giao nhận hàng hóa vật lý qua bưu chính thông thường mà thực hiện chuyển giao và kích hoạt bản quyền trực tuyến 100%.
          </p>
        </div>

        {/* Section 1: Phương thức cung cấp dịch vụ */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <Laptop className="w-5 h-5 text-blue-600" />
            <span>1. Phương Thức Cung Cấp &amp; Bàn Giao Dịch Vụ</span>
          </h2>
          <div className="space-y-3 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            <p>Dịch vụ được chuyển giao cho khách hàng thông qua các phương thức điện tử sau:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li><strong>Đối với tài khoản cá nhân / gói Pro:</strong> Tài khoản được tự động nâng cấp quyền hạn tính năng trên nền tảng web ngay khi hệ thống ghi nhận thanh toán thành công.</li>
              <li><strong>Thông báo qua thư điện tử:</strong> Hệ thống tự động gửi email thông báo xác nhận kích hoạt gói dịch vụ, kèm mã đơn hàng, ngày bắt đầu, ngày hết hạn và liên kết truy cập trực tiếp vào hòm thư đăng ký của khách hàng.</li>
              <li><strong>Đối với gói On-Premise / Doanh nghiệp:</strong> Đội ngũ kỹ sư giải pháp của LayaMeet tiến hành chuyển giao gói cài đặt container Docker/Kubernetes và hỗ trợ triển khai trực tiếp lên hạ tầng máy chủ riêng của doanh nghiệp theo biên bản nghiệm thu kỹ thuật.</li>
            </ul>
          </div>
        </section>

        {/* Section 2: Thời gian bàn giao và kích hoạt */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <Zap className="w-5 h-5 text-blue-600" />
            <span>2. Thời Gian Kích Hoạt &amp; Bàn Giao</span>
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            <p>
              - <strong>Thời gian kích hoạt tự động:</strong> Từ <strong>30 giây đến tối đa 5 phút</strong> sau khi giao dịch thanh toán được hệ thống ngân hàng xác nhận thành công.
            </p>
            <p>
              - <strong>Trường hợp quá 15 phút chưa được kích hoạt:</strong> Do sự cố chậm trễ cập nhật trạng thái từ phía ngân hàng, quý khách vui lòng liên hệ ngay với Hotline <strong>{info.hotline}</strong> để được kích hoạt thủ công ngay lập tức.
            </p>
          </div>
        </section>

        {/* Section 3: Trách nhiệm và hỗ trợ sau kích hoạt */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            <span>3. Hỗ Trợ Kỹ Thuật Sau Khi Bàn Giao</span>
          </h2>
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs">
            <div><strong>Đơn vị chịu trách nhiệm:</strong> {info.companyName} ({info.ownerName})</div>
            <div><strong>Hotline kỹ thuật 24/7:</strong> <a href={`tel:${info.hotline.replace(/\s+/g, '')}`} className="text-blue-600 font-bold hover:underline">{info.hotline}</a></div>
            <div><strong>Email hỗ trợ triển khai:</strong> <a href={`mailto:${info.email}`} className="text-blue-600 font-bold hover:underline">{info.email}</a></div>
            <div><strong>Địa chỉ:</strong> {info.address}</div>
          </div>
        </section>
      </div>
    </PublicPageShell>
  );
};
export default DeliveryPolicyPage;
