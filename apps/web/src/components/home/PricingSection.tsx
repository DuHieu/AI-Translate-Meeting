import React, { useState } from 'react';
import { Check, Zap, ShieldCheck, ArrowRight, HelpCircle } from 'lucide-react';
import { CheckoutModal } from '../common/CheckoutModal';
import { EnterpriseDemoModal } from './EnterpriseDemoModal';

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
    id: 'free',
    name: 'Free',
    badge: 'Miễn Phí Vĩnh Viễn',
    desc: 'Dành cho cá nhân, freelancer và sinh viên họp trực tuyến dịch song ngữ mỗi ngày.',
    monthlyPrice: 0,
    annualPrice: 0,
    priceNote: 'Miễn phí 100% · Không cần thẻ ngân hàng',
    ctaText: 'Tạo Phòng Họp Ngay',
    ctaVariant: 'secondary',
    features: [
      'Họp 1-on-1 không giới hạn thời gian',
      'Họp nhóm (từ 3 người) tối đa 40 phút / cuộc',
      'Phụ đề AI dịch trực tiếp 50+ ngôn ngữ (<350ms)',
      'Cửa sổ phụ đề nổi (PiP) đè lên Zoom / Google Meet',
      'Tóm tắt biên bản họp & chia sẻ nhanh Zalo / Slack',
      'Xử lý âm thanh RAM-only (Không lưu file ghi âm)',
    ],
  },
  {
    id: 'pro',
    name: 'Gói Tháng Pro',
    badge: 'Khuyên Dùng · Rẻ Hơn Zoom 75%',
    popular: true,
    desc: 'Dành cho Freelancer chuyên nghiệp, nhóm dự án IT Outsourcing và giảng viên ngoại ngữ.',
    monthlyPrice: 99000,
    annualPrice: 79000,
    priceNote: 'trên mỗi tài khoản Host / tháng',
    ctaText: 'Đăng Ký Gói Tháng (99.000đ)',
    ctaVariant: 'primary',
    features: [
      'Không giới hạn thời lượng cho mọi cuộc họp nhóm',
      'Không giới hạn số phút dịch thuật AI đa chiều (Any-to-Any)',
      'Tự do chọn ngôn ngữ phụ đề riêng cho từng người tham gia',
      'Laya AI tự động trích xuất Action Items & Decisions',
      'Xuất biên bản họp tự động (Markdown / Word / PDF)',
      'Xóa watermark thương hiệu trên phụ đề & biên bản xuất ra',
      'Hỗ trợ kỹ thuật ưu tiên 24/7 qua Zalo / Slack',
    ],
  },
];

interface PricingSectionProps {
  onSelectTier?: (tierId: string) => void;
  onContactClick?: () => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onSelectTier, onContactClick }) => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const handleEnterpriseClick = () => {
    if (onContactClick) {
      onContactClick();
    }
    setIsDemoModalOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  return (
    <section id="pricing" className="border-t border-zinc-200 dark:border-[#2e2e30] py-16 md:py-24 relative overflow-hidden bg-white/40 dark:bg-[#0f0f10]/40 transition-colors">
      <div className="max-w-[1536px] 2xl:max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 2xl:px-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            <Zap className="w-3 h-3" />
            <span>Bảng Giá Đơn Giản &amp; Minh Bạch</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
            Chỉ 2 gói duy nhất: Miễn phí hoặc Không giới hạn
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Bắt đầu miễn phí ngay lập tức, nâng cấp gói tháng chỉ với 99.000đ khi bạn cần họp nhóm không giới hạn.
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
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
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
                      } else if (tier.id === 'enterprise') {
                        handleEnterpriseClick();
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
            onClick={handleEnterpriseClick}
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

        <EnterpriseDemoModal
          isOpen={isDemoModalOpen}
          onClose={() => setIsDemoModalOpen(false)}
        />
      </div>
    </section>
  );
};
