import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Download,
  Home,
  RotateCcw,
  Sparkles,
  Star,
  MessageSquareQuote,
  Lock,
  Cpu,
  Check,
  X,
  Pause,
  Play,
  Layers,
  Server,
  Zap,
} from 'lucide-react';
import { LayaMeetLogo } from '../common/LayaMeetLogo';
import { CheckoutModal } from '../common/CheckoutModal';
import { meetingApi, SubmitMeetingFeedbackRequest } from '../../api/meetingApi';

interface LeftMeetingScreenProps {
  meetingCode: string;
  onRejoin: () => void;
  onGoHome: () => void;
  onOpenUpgrade?: () => void;
  onDownloadMinutes?: () => void;
  hasMinutes?: boolean;
}

const FEEDBACK_CATEGORIES = [
  { id: 'audio_quality', label: 'Chất lượng âm thanh & mic' },
  { id: 'translation_accuracy', label: 'Độ chính xác bản dịch' },
  { id: 'subtitle_speed', label: 'Tốc độ phụ đề & độ trễ' },
  { id: 'ui_ux', label: 'Giao diện & Tiện ích' },
  { id: 'feature_request', label: 'Đề xuất tính năng mới' },
];

export const LeftMeetingScreen: React.FC<LeftMeetingScreenProps> = ({
  meetingCode,
  onRejoin,
  onGoHome,
  onOpenUpgrade,
  onDownloadMinutes,
  hasMinutes = false,
}) => {
  const [countdown, setCountdown] = useState(60);
  const [isCountdownPaused, setIsCountdownPaused] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Feedback form states
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState('translation_accuracy');
  const [feedbackText, setFeedbackText] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Auto-redirect timer (pauses when interacting with modals or reviewing minutes)
  useEffect(() => {
    if (isCountdownPaused || showPricingModal || showSecurityModal || showFeedbackModal || hasMinutes) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onGoHome();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onGoHome, isCountdownPaused, showPricingModal, showSecurityModal, showFeedbackModal, hasMinutes]);

  const handleOpenUpgrade = () => {
    if (onOpenUpgrade) {
      onOpenUpgrade();
    } else {
      setShowPricingModal(true);
    }
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    setIsSubmittingFeedback(true);
    setFeedbackError(null);

    const payload: SubmitMeetingFeedbackRequest = {
      rating,
      category,
      comment: feedbackText.trim(),
      userName: userName.trim() || undefined,
      userEmail: userEmail.trim() || undefined,
    };

    try {
      await meetingApi.submitMeetingFeedback(meetingCode, payload);
      setFeedbackSuccess(true);
      setTimeout(() => {
        setShowFeedbackModal(false);
        setFeedbackSuccess(false);
        setFeedbackText('');
      }, 2000);
    } catch {
      // Offline fallback: save to localStorage so feedback is preserved
      try {
        const stored = JSON.parse(localStorage.getItem('layameet:pending_feedback') || '[]');
        stored.push({ meetingCode, ...payload, createdAt: new Date().toISOString() });
        localStorage.setItem('layameet:pending_feedback', JSON.stringify(stored));
      } catch {
        // Ignore localStorage error
      }
      setFeedbackSuccess(true);
      setTimeout(() => {
        setShowFeedbackModal(false);
        setFeedbackSuccess(false);
        setFeedbackText('');
      }, 2000);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="left-meeting-screen min-h-dvh w-full bg-[#0d0f14] text-zinc-100 flex flex-col justify-between p-4 sm:p-6 select-none font-sans relative overflow-hidden transition-colors">
      {/* Subtle ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-blue-600/10 via-indigo-600/5 to-transparent blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="w-full flex items-center justify-between relative z-10 max-w-6xl mx-auto gap-2">
        {/* Left: LayaMeet Brand Logo + Meeting Code */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <LayaMeetLogo size="sm" />
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-400 font-mono">
            <span>Phòng:</span>
            <span className="font-semibold text-zinc-200 uppercase">{meetingCode}</span>
          </div>
        </div>

        {/* Right: Auto Redirect Timer + Upgrade Button */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Subtle Countdown Indicator */}
          <button
            type="button"
            onClick={() => setIsCountdownPaused(!isCountdownPaused)}
            title={isCountdownPaused ? 'Bấm để tiếp tục đếm ngược' : 'Bấm để tạm dừng đếm ngược'}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-400 transition cursor-pointer shrink-0"
          >
            {isCountdownPaused ? (
              <Play className="w-3 h-3 text-amber-400 shrink-0" />
            ) : (
              <Pause className="w-3 h-3 text-zinc-400 shrink-0" />
            )}
            <span className="hidden sm:inline">
              {hasMinutes ? 'Biên bản cuộc họp' : isCountdownPaused ? 'Đã tạm dừng' : 'Về trang chủ'}
            </span>
            {!hasMinutes && (
              <span className="font-mono text-[11px] sm:text-xs">
                ({countdown}s)
              </span>
            )}
          </button>

          {/* Upgrade Button */}
          <button
            type="button"
            onClick={handleOpenUpgrade}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 border border-blue-400/30 transition cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>Nâng cấp Pro</span>
          </button>
        </div>
      </header>

      {/* Main Center Content Card */}
      <main className="max-w-xl w-full mx-auto text-center space-y-5 sm:space-y-6 my-auto py-4 sm:py-8 relative z-10 px-1 sm:px-0">
        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Cuộc họp đã kết thúc an toàn</span>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            Bạn đã rời khỏi cuộc họp
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
            Cảm ơn bạn đã tham gia buổi họp song ngữ thông minh thời gian thực cùng trợ lý AI LayaMeet.
          </p>
        </div>

        {/* AI Highlight Stats Strip */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 max-w-md mx-auto pt-1">
          <div className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
            <div className="flex items-center justify-center mb-1 text-sky-400">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <p className="text-[10px] sm:text-[11px] font-medium text-zinc-300">STT &lt;350ms</p>
            <p className="text-[9px] sm:text-[10px] text-zinc-400">Whisper Realtime</p>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
            <div className="flex items-center justify-center mb-1 text-emerald-400">
              <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <p className="text-[10px] sm:text-[11px] font-medium text-zinc-300">RAM-Only</p>
            <p className="text-[9px] sm:text-[10px] text-zinc-400">Zero-Raw-Audio</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
            <div className="flex items-center justify-center mb-1 text-indigo-400">
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <p className="text-[10px] sm:text-[11px] font-medium text-zinc-300">Song ngữ AI</p>
            <p className="text-[9px] sm:text-[10px] text-zinc-400">Tự động dịch</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 w-full max-w-sm sm:max-w-none mx-auto pt-2">
          <button
            type="button"
            onClick={onGoHome}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-medium transition shadow-lg shadow-blue-600/25 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Quay lại màn hình chính</span>
          </button>

          <button
            type="button"
            onClick={onRejoin}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-zinc-200 text-sm font-medium transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-zinc-400" />
            <span>Tham gia lại</span>
          </button>

          {hasMinutes && onDownloadMinutes && (
            <button
              type="button"
              onClick={onDownloadMinutes}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-sm font-medium transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Tải biên bản họp AI (.md)</span>
            </button>
          )}
        </div>

        {/* Feedback Link Trigger */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowFeedbackModal(true)}
            className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-medium cursor-pointer transition"
          >
            <MessageSquareQuote className="w-3.5 h-3.5" />
            <span>Đánh giá trải nghiệm &amp; Gửi phản hồi</span>
          </button>
        </div>

        {/* Security & Zero-Audio Card (LayaMeet Branding, not Google clone) */}
        <div className="mt-6 mx-auto max-w-md rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-md p-4 text-left shadow-lg">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <span>Bảo vệ quyền riêng tư &amp; Mã hóa WebRTC</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Cuộc họp được bảo vệ bởi chính sách Zero-Raw-Audio: Giọng nói chỉ xử lý trên RAM máy chủ GPU và bị hủy ngay lập tức sau khi nhận dạng.
              </p>
              <div className="mt-2.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowSecurityModal(true)}
                  className="text-xs text-sky-400 hover:text-sky-300 font-medium inline-flex items-center gap-1 cursor-pointer transition"
                >
                  <span>Tìm hiểu thêm về chính sách bảo mật AI</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center text-xs text-zinc-400 relative z-10">
        Mã phòng: <span className="font-mono uppercase font-semibold text-zinc-300">{meetingCode}</span> &bull; &copy; LayaMeet Realtime AI Meeting
      </footer>

      {/* 1. Modal: Tìm hiểu thêm (Security & Privacy Details Modal) */}
      {showSecurityModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[#181a20] text-zinc-100 rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-white/10 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Kiến trúc Bảo mật &amp; Quyền riêng tư LayaMeet</h3>
                  <p className="text-[11px] text-zinc-400">Tiêu chuẩn bảo vệ dữ liệu doanh nghiệp</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSecurityModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-zinc-300">
              <div className="flex gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                <Lock className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-zinc-100 mb-0.5">Mã hóa đầu cuối WebRTC (DTLS / SRTP)</h4>
                  <p className="text-zinc-400 leading-relaxed text-[11px]">
                    Toàn bộ luồng âm thanh và hình ảnh giữa các thành viên được mã hóa tiêu chuẩn quân sự, ngăn chặn hoàn toàn nghe lén trên đường truyền.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                <Cpu className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-zinc-100 mb-0.5">Chính sách Zero-Raw-Audio (RAM-Only STT)</h4>
                  <p className="text-zinc-400 leading-relaxed text-[11px]">
                    Các đoạn âm thanh 350ms được giải mã trực tiếp trong bộ nhớ RAM của AI Node để tạo phụ đề và giải phóng ngay tức thì. Không bao giờ lưu file âm thanh thô lên ổ cứng máy chủ.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                <Server className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-zinc-100 mb-0.5">Kiểm soát phòng họp &amp; Phòng chờ thông minh</h4>
                  <p className="text-zinc-400 leading-relaxed text-[11px]">
                    Hệ thống cấp token có thời hạn TTL ngắn hạn kèm cơ chế phòng chờ duyệt (Waiting Room), chỉ những người được chủ phòng cấp phép mới có thể tham gia.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowSecurityModal(false)}
                className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal: Gửi phản hồi (Feedback Modal with DB persistence) */}
      {showFeedbackModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[#181a20] text-zinc-100 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-white/10 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <MessageSquareQuote className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-semibold text-white">Gửi phản hồi cuộc họp</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {feedbackSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Cảm ơn bạn đã phản hồi!</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Ý kiến của bạn đã được ghi nhận vào hệ thống để tiếp tục hoàn thiện chất lượng AI.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendFeedback} className="space-y-4">
                {/* Rating Stars */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">
                    Đánh giá trải nghiệm tổng thể
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        aria-label={`Đánh giá ${star} sao`}
                        aria-pressed={rating === star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 transition-transform hover:scale-110 cursor-pointer"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            (hoverRating || rating) >= star
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-zinc-600'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs text-zinc-400 ml-2 font-medium">
                      {rating === 5 && 'Xuất sắc'}
                      {rating === 4 && 'Rất tốt'}
                      {rating === 3 && 'Bình thường'}
                      {rating === 2 && 'Cần cải thiện'}
                      {rating === 1 && 'Kém'}
                    </span>
                  </div>
                </div>

                {/* Category Chips */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">
                    Chủ đề phản hồi
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {FEEDBACK_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                          category === cat.id
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 border border-white/5'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feedback Comment Text */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1 font-medium">
                    Chi tiết nhận xét <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Chất lượng nhận diện giọng nói, bản dịch song ngữ hoặc đường truyền như thế nào?..."
                    rows={3}
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-zinc-900 text-xs text-zinc-200 outline-none focus:border-blue-500 placeholder-zinc-500"
                    required
                  />
                </div>

                {/* Optional User Info */}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Tên của bạn (tùy chọn)"
                    className="w-full p-2 rounded-xl border border-white/10 bg-zinc-900 text-xs text-zinc-200 outline-none focus:border-blue-500 placeholder-zinc-500"
                  />
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="Email (tùy chọn)"
                    className="w-full p-2 rounded-xl border border-white/10 bg-zinc-900 text-xs text-zinc-200 outline-none focus:border-blue-500 placeholder-zinc-500"
                  />
                </div>

                {feedbackError && (
                  <p className="text-xs text-red-400">{feedbackError}</p>
                )}

                {/* Buttons */}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackModal(false)}
                    className="px-3 py-1.5 text-xs text-zinc-400 hover:bg-white/10 rounded-xl transition cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingFeedback || !feedbackText.trim()}
                    className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-medium transition cursor-pointer shadow-md shadow-blue-600/20"
                  >
                    {isSubmittingFeedback ? 'Đang lưu...' : 'Gửi phản hồi'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 3. Modal: Nâng cấp Pro (Pricing / Checkout Modal opened directly) */}
      <CheckoutModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        meetingCode={meetingCode}
      />
    </div>
  );
};
