import React, { useState } from 'react';
import { Check, Zap, ShieldCheck, ArrowRight, HelpCircle } from 'lucide-react';
import { CheckoutModal } from '../common/CheckoutModal';

interface PricingTier {
  id: string;
  name: string;
  badge?: string;
  popular?: boolean;
  desc: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  priceNote: string;
  ctaText: string;
  ctaVariant: 'primary' | 'secondary' | 'outline';
  features: string[];
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Community',
    desc: 'Dành cho lập trình viên và nhóm nhỏ tự triển khai thử nghiệm trên máy chủ nội bộ.',
    monthlyPrice: 0,
    annualPrice: 0,
    priceNote: 'Miễn phí vĩnh viễn (Open-Source Core)',
    ctaText: 'Tải Docker Compose',
    ctaVariant: 'secondary',
    features: [
      'Tối đa 2 phòng họp đồng thời',
      'Nhận dạng giọng nói Whisper (int8 CPU)',
      'Phụ đề đa ngôn ngữ thời gian thực (50+ ngôn ngữ)',
      'Xử lý âm thanh RAM-only (Không lưu file)',
      'Hỗ trợ qua cộng đồng GitHub & Discord',
    ],
  },
  {
    id: 'pro',
    name: 'Team Pro',
    badge: 'Khuyên Dùng Cho SME',
    popular: true,
    desc: 'Lý tưởng cho các công ty Outsourcing, nhóm dự án đa quốc gia họp hằng ngày.',
    monthlyPrice: 499000,
    annualPrice: 399000,
    priceNote: 'trên mỗi phòng họp / tháng',
    ctaText: 'Đăng Ký Gói Pro',
    ctaVariant: 'primary',
    features: [
      'Không giới hạn thời lượng cuộc họp',
      'Dịch thuật ma trận đa chiều (Any-to-Any, TTFS <350ms)',
      'Tự do chọn ngôn ngữ phụ đề riêng cho từng người tham gia',
      'Laya AI tự động trích xuất Action Items & Decisions',
      'Xuất biên bản họp tự động (Markdown / Word / PDF)',
      'Bộ nhớ đệm dịch thuật Redis Cache phân tán',
      'Hỗ trợ kỹ thuật ưu tiên 24/7 qua Slack / Zalo',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise On-Prem',
    badge: 'Bảo Mật Cấp Ngân Hàng',
    desc: 'Dành cho tập đoàn, tài chính, cơ quan yêu cầu cài đặt 100% trong mạng LAN nội bộ.',
    monthlyPrice: null,
    annualPrice: null,
    priceNote: 'May đo & Báo giá theo hạ tầng',
    ctaText: 'Liên Hệ Đội Ngũ Kỹ Thuật',
    ctaVariant: 'outline',
    features: [
      'Triển khai 100% On-Premise trên máy chủ riêng (LAN/Air-gapped)',
      'Cam kết Zero Data Cloud (Không một byte âm thanh rời nội bộ)',
      'Tăng tốc phần cứng GPU NVIDIA CUDA cho >50 phòng đồng thời',
      'Tùy chỉnh từ điển thuật ngữ kỹ thuật chuyên ngành riêng',
      'Tích hợp SSO / LDAP / Active Directory doanh nghiệp',
      'Ký hợp đồng dịch vụ SLA 99.9% & Cam kết bảo mật NDA',
    ],
  },
];

interface PricingSectionProps {
  onSelectTier?: (tierId: string) => void;
  onContactClick?: () => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onSelectTier, onContactClick }) => {
  const [isAnnual, setIsAnnual] = useState(true);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  return (
    <section id="pricing" className="border-t border-zinc-200 dark:border-[#2e2e30] py-16 md:py-24 relative overflow-hidden bg-white/40 dark:bg-[#0f0f10]/40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            <Zap className="w-3 h-3" />
            <span>Bảng Giá &amp; Gói Triển Khai</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
            Đầu tư thông minh cho giao tiếp không rào cản
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Linh hoạt từ tự triển khai Docker mã nguồn mở đến hệ thống On-Premise bảo mật chuyên sâu cho doanh nghiệp.
          </p>

          {/* Billing Interval Switcher */}
          <div className="pt-2 flex items-center justify-center gap-3">
            <span className={`text-xs font-medium cursor-pointer transition-colors ${!isAnnual ? 'text-zinc-950 dark:text-white font-semibold' : 'text-zinc-500'}`} onClick={() => setIsAnnual(false)}>
              Thanh toán tháng
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isAnnual}
              onClick={() => setIsAnnual(!isAnnual)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
                isAnnual ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  isAnnual ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${isAnnual ? 'text-zinc-950 dark:text-white font-semibold' : 'text-zinc-500'}`} onClick={() => setIsAnnual(true)}>
              <span>Thanh toán năm</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Tiết kiệm 20%
              </span>
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {PRICING_TIERS.map((tier) => {
            const price = isAnnual ? tier.annualPrice : tier.monthlyPrice;

            return (
              <div
                key={tier.id}
                className={`relative flex flex-col justify-between rounded-2xl p-6 transition-all duration-200 ${
                  tier.popular
                    ? 'bg-white dark:bg-[#18181b] border-2 border-blue-600 dark:border-blue-500 shadow-xl shadow-blue-500/5 ring-1 ring-blue-500/20'
                    : 'bg-white/80 dark:bg-[#151517] border border-zinc-200 dark:border-[#2e2e30] hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm'
                }`}
              >
                {/* Popular Pill */}
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-blue-600 text-white shadow-xs whitespace-nowrap">
                      {tier.badge}
                    </span>
                  </div>
                )}

                <div>
                  {/* Card Header */}
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-zinc-950 dark:text-white">
                      {tier.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 min-h-[32px]">
                      {tier.desc}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="py-4 border-y border-zinc-100 dark:border-zinc-800/80 mb-5">
                    {price !== null ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-zinc-950 dark:text-white font-mono">
                          {price === 0 ? '0đ' : formatCurrency(price)}
                        </span>
                        {price > 0 && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            / tháng
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-zinc-950 dark:text-white">
                        Tùy Biến
                      </div>
                    )}
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-1">
                      {tier.priceNote}
                    </span>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-2.5 mb-6 text-xs text-zinc-700 dark:text-zinc-300">
                    {tier.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card CTA Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (tier.id === 'pro') {
                        setIsCheckoutOpen(true);
                      } else if (tier.id === 'enterprise' && onContactClick) {
                        onContactClick();
                      } else if (onSelectTier) {
                        onSelectTier(tier.id);
                      }
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      tier.popular
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20'
                        : tier.id === 'enterprise'
                        ? 'bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900'
                        : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <span>{tier.ctaText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Assurance Guarantee Strip */}
        <div className="mt-10 p-4 rounded-2xl bg-zinc-50 dark:bg-[#141416] border border-zinc-200 dark:border-[#2e2e30] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>Cam kết không rủi ro:</strong> Bản quyền vĩnh viễn với On-Premise, hỗ trợ cài đặt thử nghiệm PoC 14 ngày miễn phí.
            </span>
          </div>
          <button
            type="button"
            onClick={onContactClick}
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline shrink-0 cursor-pointer flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Cần tư vấn hạ tầng VPS / Server riêng?</span>
          </button>
        </div>

        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          initialPlanId="pro"
        />
      </div>
    </section>
  );
};
