import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, Clock, ShieldCheck, MessageSquare, AlertCircle } from 'lucide-react';
import { meetingApi } from '../../api/meetingApi';
import { useLanguage } from '../../context/language-context-def';

const CONTACT_DATA = {
  vi: {
    badge: 'Liên Hệ & Tư Vấn Triển Khai',
    title: 'Sẵn sàng nâng tầm cuộc họp đa quốc gia của bạn?',
    subtitle: 'Đặt lịch Demo 1-1 trực tiếp hoặc nhận tư vấn kiến trúc On-Premise tối ưu cho hạ tầng riêng của công ty bạn.',
    channelsTitle: 'Kênh Liên Hệ Trực Tiếp',
    emailLabel: 'Email hỗ trợ & kinh doanh',
    hotlineLabel: 'Hotline kỹ thuật & Zalo',
    officesLabel: 'Văn phòng đại diện',
    officeHanoi: 'Keangnam Landmark 72, Nam Từ Liêm',
    officeDanang: 'Tòa nhà FPT Complex, Ngũ Hành Sơn',
    officeTokyo: '1-chome, Marunouchi, Chiyoda-ku, Tokyo',
    responseCommitment: 'Cam kết phản hồi trong vòng',
    responseHours: '2 giờ làm việc',
    ndaBadge: 'Cam kết bảo mật & Ký thỏa thuận NDA',
    ndaDesc: 'Chúng tôi sẵn sàng ký thỏa thuận bảo mật dữ liệu NDA trước khi tiếp cận tư vấn kỹ thuật chuyên sâu cho doanh nghiệp của bạn.',
    formTitle: 'Đăng Ký Tư Vấn & Trải Nghiệm Thử Nghiệm',
    nameLabel: 'Họ và tên',
    namePlaceholder: 'Nguyễn Văn A',
    emailFieldLabel: 'Email doanh nghiệp',
    companyLabel: 'Tên công ty / Tổ chức',
    companyPlaceholder: 'FPT Software / VNG / Doanh nghiệp...',
    teamSizeLabel: 'Quy mô nhân sự',
    teamSizeOptions: [
      { value: '<10', label: 'Dưới 10 nhân sự' },
      { value: '10-50', label: '10 - 50 nhân sự' },
      { value: '50-200', label: '50 - 200 nhân sự' },
      { value: '200+', label: 'Trên 200 nhân sự' },
    ],
    langNeedLabel: 'Nhu cầu ngôn ngữ trong phòng họp',
    langOptions: [
      { value: 'MULTI-GLOBAL', label: 'Đa ngôn ngữ toàn cầu (Việt, Nhật, Mỹ, Trung, Thái, Lào...)' },
      { value: 'ASIA-REGIONAL', label: 'Khu vực Châu Á (Việt, Nhật, Trung, Thái, Hàn, Lào)' },
      { value: 'VI-JA', label: 'Việt Nam <-> Nhật Bản' },
      { value: 'VI-EN', label: 'Việt Nam <-> Tiếng Anh (Mỹ, Anh, Úc)' },
      { value: 'CUSTOM', label: 'Tùy biến theo danh sách ngôn ngữ riêng của doanh nghiệp' },
    ],
    deployModelLabel: 'Mô hình triển khai mong muốn',
    deployOptions: [
      { value: 'on-premise', label: 'On-Premise (Máy chủ nội bộ LAN)' },
      { value: 'private-vps', label: 'Private VPS riêng biệt' },
      { value: 'cloud-saas', label: 'Đám mây quản lý sẵn (SaaS)' },
    ],
    notesLabel: 'Ghi chú thêm về nhu cầu (tùy chọn)',
    notesPlaceholder: 'Mô tả hạ tầng hiện tại, số lượng phòng họp đồng thời mong muốn...',
    btnSubmitting: 'Đang gửi thông tin...',
    btnSubmit: 'Gửi Yêu Cầu Tư Vấn & Nhận Báo Giá',
    successTitle: 'Yêu Cầu Đã Được Gửi Thành Công!',
    successDesc: 'Cảm ơn bạn đã quan tâm đến LayaMeet. Kỹ sư tư vấn giải pháp của chúng tôi sẽ liên hệ lại qua email trong thời gian sớm nhất.',
    btnAnother: 'Gửi một yêu cầu khác',
    errorDefault: 'Không thể gửi yêu cầu. Vui lòng thử lại sau.',
  },
  en: {
    badge: 'Enterprise Consultation & Contact',
    title: 'Ready to elevate your global video meetings?',
    subtitle: 'Schedule a 1-on-1 private demo or receive tailored On-Premises architecture guidance for your private infrastructure.',
    channelsTitle: 'Direct Contact Channels',
    emailLabel: 'Support & Sales Email',
    hotlineLabel: 'Technical Hotline & WhatsApp',
    officesLabel: 'Representative Offices',
    officeHanoi: 'Keangnam Landmark 72, Hanoi',
    officeDanang: 'FPT Complex Building, Da Nang',
    officeTokyo: '1-chome, Marunouchi, Chiyoda-ku, Tokyo',
    responseCommitment: 'Guaranteed response within',
    responseHours: '2 business hours',
    ndaBadge: 'Security Commitment & Mutual NDA',
    ndaDesc: 'We execute strict Non-Disclosure Agreements (NDA) prior to technical reviews and deployment audits.',
    formTitle: 'Request Consultation & Enterprise PoC',
    nameLabel: 'Full Name',
    namePlaceholder: 'John Doe',
    emailFieldLabel: 'Work Email',
    companyLabel: 'Company / Organization',
    companyPlaceholder: 'Acme Corp / Tech Solutions...',
    teamSizeLabel: 'Team Size',
    teamSizeOptions: [
      { value: '<10', label: 'Under 10 members' },
      { value: '10-50', label: '10 - 50 members' },
      { value: '50-200', label: '50 - 200 members' },
      { value: '200+', label: '200+ members' },
    ],
    langNeedLabel: 'Language Requirements',
    langOptions: [
      { value: 'MULTI-GLOBAL', label: 'Global Polyglot Matrix (VI, JA, EN, ZH, TH...)' },
      { value: 'ASIA-REGIONAL', label: 'Asia-Pacific (VI, JA, ZH, KO, TH)' },
      { value: 'VI-JA', label: 'Vietnamese <-> Japanese' },
      { value: 'VI-EN', label: 'Vietnamese <-> English' },
      { value: 'CUSTOM', label: 'Custom Enterprise Language Pack' },
    ],
    deployModelLabel: 'Target Deployment Architecture',
    deployOptions: [
      { value: 'on-premise', label: 'On-Premises (Air-gapped LAN Servers)' },
      { value: 'private-vps', label: 'Dedicated Private Cloud VPS' },
      { value: 'cloud-saas', label: 'Fully Managed Cloud SaaS' },
    ],
    notesLabel: 'Additional Notes & Infrastructure (Optional)',
    notesPlaceholder: 'Describe your current setup, expected concurrent meeting rooms...',
    btnSubmitting: 'Submitting Request...',
    btnSubmit: 'Submit Consultation & Quote Request',
    successTitle: 'Inquiry Successfully Submitted!',
    successDesc: 'Thank you for reaching out to LayaMeet. Our enterprise solutions architect will contact you via email shortly.',
    btnAnother: 'Submit another request',
    errorDefault: 'Failed to submit request. Please try again later.',
  },
  ja: {
    badge: '導入相談・お問い合わせ',
    title: 'グローバル会議の壁を取り払う準備はできましたか？',
    subtitle: '1対1の個別デモ体験、または社内閉域網オンプレミス環境の最適構成について専任エンジニアがご案内します。',
    channelsTitle: '直接のお問い合わせ窓口',
    emailLabel: 'サポート・営業担当メール',
    hotlineLabel: '技術相談窓口',
    officesLabel: '主要オフィス',
    officeHanoi: 'ハノイ: Keangnam Landmark 72',
    officeDanang: 'ダナン: FPT Complex Building',
    officeTokyo: '東京: 千代田区丸の内1丁目',
    responseCommitment: '迅速対応の約束:',
    responseHours: '2営業時間以内',
    ndaBadge: 'セキュリティ保証 & 秘密保持契約 (NDA)',
    ndaDesc: '企業機密を保護するため、技術検証および導入検討に先立ち相互秘密保持契約（NDA）を締結いたします。',
    formTitle: '個別相談 & 無料PoCトライアル申請',
    nameLabel: 'お名前',
    namePlaceholder: '山田 太郎',
    emailFieldLabel: '企業メールアドレス',
    companyLabel: '貴社名 / 組織名',
    companyPlaceholder: '株式会社○○ / グローバル事業部...',
    teamSizeLabel: 'ご利用想定人数',
    teamSizeOptions: [
      { value: '<10', label: '10名未満' },
      { value: '10-50', label: '10 - 50名' },
      { value: '50-200', label: '50 - 200名' },
      { value: '200+', label: '200名以上' },
    ],
    langNeedLabel: '主な対象言語ペア',
    langOptions: [
      { value: 'MULTI-GLOBAL', label: 'グローバル多言語 (日・ベトナム・英・中など)' },
      { value: 'ASIA-REGIONAL', label: 'アジア地域 (日・ベトナム・中・韓・タイ)' },
      { value: 'VI-JA', label: '日本語 <-> ベトナム語' },
      { value: 'VI-EN', label: '英語 <-> ベトナム語 / 日本語' },
      { value: 'CUSTOM', label: '自社専用のカスタム言語セット' },
    ],
    deployModelLabel: 'ご希望の導入形態',
    deployOptions: [
      { value: 'on-premise', label: 'オンプレミス (社内LAN完全閉域網)' },
      { value: 'private-vps', label: '専用プライベートVPS' },
      { value: 'cloud-saas', label: 'マネージドクラウド (SaaS)' },
    ],
    notesLabel: 'ご要望・検討事項 (任意)',
    notesPlaceholder: '現在の会議システム、同時開催ルーム数、セキュリティ要件など...',
    btnSubmitting: '送信中...',
    btnSubmit: '導入相談・見積もりを依頼する',
    successTitle: 'お問い合わせを正常に受け付けました',
    successDesc: 'LayaMeetにご関心をお寄せいただきありがとうございます。ソリューション担当者よりご連絡いたします。',
    btnAnother: '別のお問い合わせを送信',
    errorDefault: '送信に失敗しました。時間をおいて再試行してください。',
  },
};

export const ContactSection: React.FC = () => {
  const { language } = useLanguage();
  const c = CONTACT_DATA[language] || CONTACT_DATA.vi;

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    company: '',
    teamSize: '10-50',
    languagePair: 'VI-JA',
    deploymentModel: 'on-premise',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await meetingApi.submitEnterpriseLead(formData);
      setIsSubmitted(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : c.errorDefault);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="border-t border-zinc-200 dark:border-[#2e2e30] py-16 md:py-24 relative bg-zinc-50/60 dark:bg-[#121214]/60 transition-colors">
      <div className="max-w-[1536px] 2xl:max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 2xl:px-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium">
            <MessageSquare className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span>{c.badge}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
            {c.title}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {c.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Contact Info & Enterprise Commitments (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#2e2e30] rounded-2xl p-6 shadow-xs space-y-5">
              <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <span>{c.channelsTitle}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </h3>

              <div className="space-y-4 text-xs">
                {/* Email */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">{c.emailLabel}</div>
                    <div className="text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                      <a href="mailto:contact@layameet.com" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">contact@layameet.com</a>
                      <span className="mx-1.5 text-zinc-300 dark:text-zinc-700">·</span>
                      <a href="mailto:sales@layameet.com" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">sales@layameet.com</a>
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">{c.hotlineLabel}</div>
                    <div className="text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                      <span>+84 (0) 905 123 456</span>
                      <span className="block text-[11px] text-zinc-400">Tokyo Desk: +81 3 5555 0123</span>
                    </div>
                  </div>
                </div>

                {/* Offices */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">{c.officesLabel}</div>
                    <div className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
                      <div><strong className="text-zinc-700 dark:text-zinc-300">Hà Nội:</strong> {c.officeHanoi}</div>
                      <div><strong className="text-zinc-700 dark:text-zinc-300">Đà Nẵng:</strong> {c.officeDanang}</div>
                      <div><strong className="text-zinc-700 dark:text-zinc-300">Tokyo:</strong> {c.officeTokyo}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fast Response Badge */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>{c.responseCommitment} <strong>{c.responseHours}</strong></span>
              </div>
            </div>

            {/* Privacy Badge Card */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 space-y-1.5">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{c.ndaBadge}</span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {c.ndaDesc}
              </p>
            </div>
          </div>

          {/* Right: Interactive Inquiry Form (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#2e2e30] rounded-2xl p-6 sm:p-7 shadow-sm">
            {isSubmitted ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-zinc-950 dark:text-white">
                  {c.successTitle}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                  {c.successDesc} <strong>{formData.email}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {c.btnAnother}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-base font-bold text-zinc-950 dark:text-white mb-2">
                  {c.formTitle}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-fullName" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      {c.nameLabel} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={c.namePlaceholder}
                      id="contact-fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-[#333336] bg-zinc-50/50 dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-email" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      {c.emailFieldLabel} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      id="contact-email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-[#333336] bg-zinc-50/50 dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-company" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      {c.companyLabel} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={c.companyPlaceholder}
                      id="contact-company"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-[#333336] bg-zinc-50/50 dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-teamSize" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      {c.teamSizeLabel}
                    </label>
                    <select
                      id="contact-teamSize"
                      value={formData.teamSize}
                      onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-[#333336] bg-zinc-50/50 dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      {c.teamSizeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-languagePair" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      {c.langNeedLabel}
                    </label>
                    <select
                      id="contact-languagePair"
                      value={formData.languagePair}
                      onChange={(e) => setFormData({ ...formData, languagePair: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-[#333336] bg-zinc-50/50 dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      {c.langOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="contact-deploymentModel" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      {c.deployModelLabel}
                    </label>
                    <select
                      id="contact-deploymentModel"
                      value={formData.deploymentModel}
                      onChange={(e) => setFormData({ ...formData, deploymentModel: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-[#333336] bg-zinc-50/50 dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      {c.deployOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-notes" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    {c.notesLabel}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={c.notesPlaceholder}
                    id="contact-notes"
                      value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-[#333336] bg-zinc-50/50 dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-blue-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? c.btnSubmitting : c.btnSubmit}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
