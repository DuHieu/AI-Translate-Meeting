import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, Clock, ShieldCheck, MessageSquare, AlertCircle } from 'lucide-react';
import { meetingApi } from '../../api/meetingApi';

export const ContactSection: React.FC = () => {
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
      setErrorMessage(err instanceof Error ? err.message : 'Không thể gửi yêu cầu. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="border-t border-zinc-200 dark:border-[#2e2e30] py-16 md:py-24 relative bg-zinc-50/60 dark:bg-[#121214]/60 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            <MessageSquare className="w-3 h-3" />
            <span>Liên Hệ &amp; Tư Vấn Triển Khai</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
            Sẵn sàng nâng tầm cuộc họp đa quốc gia của bạn?
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Đặt lịch Demo 1-1 trực tiếp hoặc nhận tư vấn kiến trúc On-Premise tối ưu cho hạ tầng riêng của công ty bạn.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Contact Info & Enterprise Commitments (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#2e2e30] rounded-2xl p-6 shadow-xs space-y-5">
              <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <span>Kênh Liên Hệ Trực Tiếp</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </h3>

              <div className="space-y-4 text-xs">
                {/* Email */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">Email hỗ trợ &amp; kinh doanh</div>
                    <div className="text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                      <a href="mailto:contact@layameet.com" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">contact@layameet.com</a>
                      <span className="mx-1.5 text-zinc-300 dark:text-zinc-700">·</span>
                      <a href="mailto:sales@layameet.com" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">sales@layameet.com</a>
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">Hotline kỹ thuật &amp; Zalo</div>
                    <div className="text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                      <span>+84 (0) 905 123 456</span>
                      <span className="block text-[11px] text-zinc-400">Tokyo Desk: +81 3 5555 0123</span>
                    </div>
                  </div>
                </div>

                {/* Offices */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-900/60 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">Văn phòng đại diện</div>
                    <div className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
                      <div><strong className="text-zinc-700 dark:text-zinc-300">Hà Nội:</strong> Keangnam Landmark 72, Nam Từ Liêm</div>
                      <div><strong className="text-zinc-700 dark:text-zinc-300">Đà Nẵng:</strong> Tòa nhà FPT Complex, Ngũ Hành Sơn</div>
                      <div><strong className="text-zinc-700 dark:text-zinc-300">Tokyo:</strong> 1-chome, Marunouchi, Chiyoda-ku, Tokyo</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fast Response Badge */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>Cam kết phản hồi trong vòng <strong>2 giờ làm việc</strong></span>
              </div>
            </div>

            {/* Privacy Badge Card */}
            <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 text-xs text-zinc-700 dark:text-zinc-300 space-y-1.5">
              <div className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Cam kết bảo mật &amp; Ký thỏa thuận NDA</span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Chúng tôi sẵn sàng ký thỏa thuận bảo mật dữ liệu NDA trước khi tiếp cận tư vấn kỹ thuật chuyên sâu cho doanh nghiệp của bạn.
              </p>
            </div>
          </div>

          {/* Right: Interactive Inquiry Form (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#2e2e30] rounded-2xl p-6 sm:p-7 shadow-sm">
            {isSubmitted ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-zinc-950 dark:text-white">
                  Yêu Cầu Đã Được Gửi Thành Công!
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                  Cảm ơn bạn đã quan tâm đến LayaMeet. Kỹ sư tư vấn giải pháp của chúng tôi sẽ liên hệ lại qua email <strong>{formData.email}</strong> trong thời gian sớm nhất.
                </p>
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Gửi một yêu cầu khác
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-base font-bold text-zinc-950 dark:text-white mb-2">
                  Đăng Ký Tư Vấn &amp; Trải Nghiệm Thử Nghiệm
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-[#333336] bg-zinc-50/50 dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Email doanh nghiệp <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-[#333336] bg-zinc-50/50 dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Tên công ty / Tổ chức <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="FPT Software / VNG / Công ty..."
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-[#333336] bg-zinc-50/50 dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Quy mô nhân sự
                    </label>
                    <select
                      value={formData.teamSize}
                      onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-[#333336] bg-zinc-50/50 dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="<10">Dưới 10 nhân sự</option>
                      <option value="10-50">10 - 50 nhân sự</option>
                      <option value="50-200">50 - 200 nhân sự</option>
                      <option value="200+">Trên 200 nhân sự</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Nhu cầu ngôn ngữ trong phòng họp
                    </label>
                    <select
                      value={formData.languagePair}
                      onChange={(e) => setFormData({ ...formData, languagePair: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-[#333336] bg-zinc-50/50 dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="MULTI-GLOBAL">Đa ngôn ngữ toàn cầu (Việt, Nhật, Mỹ, Trung, Thái, Lào...)</option>
                      <option value="ASIA-REGIONAL">Khu vực Châu Á (Việt, Nhật, Trung, Thái, Hàn, Lào)</option>
                      <option value="VI-JA">Việt Nam &lt;-&gt; Nhật Bản</option>
                      <option value="VI-EN">Việt Nam &lt;-&gt; Tiếng Anh (Mỹ, Anh, Úc)</option>
                      <option value="CUSTOM">Tùy biến theo danh sách ngôn ngữ riêng của doanh nghiệp</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Mô hình triển khai mong muốn
                    </label>
                    <select
                      value={formData.deploymentModel}
                      onChange={(e) => setFormData({ ...formData, deploymentModel: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-[#333336] bg-zinc-50/50 dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="on-premise">On-Premise (Máy chủ nội bộ LAN)</option>
                      <option value="private-vps">Private VPS riêng biệt</option>
                      <option value="cloud-saas">Đám mây quản lý sẵn (SaaS)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Ghi chú thêm về nhu cầu (tùy chọn)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Mô tả hạ tầng hiện tại, số lượng phòng họp đồng thời mong muốn..."
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
                  <span>{isSubmitting ? 'Đang gửi thông tin...' : 'Gửi Yêu Cầu Tư Vấn & Nhận Báo Giá'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
