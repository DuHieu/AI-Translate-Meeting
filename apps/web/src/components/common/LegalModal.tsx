import { AdaptiveDialog } from './AdaptiveDialog';
import React from 'react';
import { X, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/language-context-def';

interface LegalModalProps {
  isOpen: boolean;
  type: 'privacy' | 'terms' | null;
  onClose: () => void;
}

const LEGAL_TEXTS = {
  vi: {
    privacyTitle: 'Chính Sách Quyền Riêng Tư & Bảo Mật Dữ Liệu',
    privacySub: 'Bảo vệ dữ liệu theo chuẩn Zero Raw Audio & Nghị định 13/2023/NĐ-CP',
    termsTitle: 'Điều Khoản Dịch Vụ, Thanh Toán & Hoàn Tiền',
    termsSub: 'Quy định sử dụng, kích hoạt dịch vụ số và cam kết hoàn tiền (SLA)',
    corePrincipleBadge: 'Nguyên Tắc Cốt Lõi: Không Bao Giờ Lưu Trữ File Âm Thanh',
    corePrincipleText: 'LayaMeet xử lý luồng âm thanh theo các audio chunk 350ms trực tiếp trong bộ nhớ RAM, giải phóng ngay lập tức sau khi mô hình Whisper tạo phụ đề. Không có bất kỳ bản ghi âm nào được ghi xuống ổ cứng hoặc gửi tới các dịch vụ đám mây bên thứ ba.',
    privacySections: [
      {
        title: '1. Thu Thập Dữ Liệu Tối Thiểu',
        desc: 'Hệ thống chỉ xử lý các thông tin cần thiết phục vụ phiên họp: Tên hiển thị người tham gia, mã phòng họp (Room Code), cài đặt ngôn ngữ đích hiển thị phụ đề và văn bản phụ đề/biên bản họp do người dùng chủ động yêu cầu xuất file.',
      },
      {
        title: '2. Cô Lập Dữ Liệu Trên Môi Trường On-Premise',
        desc: 'Khi doanh nghiệp lựa chọn triển khai On-Premise hoặc Private VPS, toàn bộ hệ thống bao gồm LiveKit Media Server, AI Service (Faster-Whisper) và Redis Subtitle Cache đều nằm trong vùng mạng riêng (Private Subnet) của quý doanh nghiệp.',
      },
      {
        title: '3. Bảo Mật Truyền Thông WebRTC',
        desc: 'Mọi luồng âm thanh và hình ảnh đều được mã hóa bằng chuẩn SRTP/DTLS end-to-end theo tiêu chuẩn WebRTC quốc tế, ngăn chặn hoàn toàn nguy cơ nghe lén (Man-in-the-Middle).',
      },
      {
        title: '4. Chính Sách Cookie & Phân Tích',
        desc: 'LayaMeet sử dụng cookie thiết yếu duy trì phiên phòng họp và phân tích tuân thủ tiêu chuẩn Google Consent Mode v2. Toàn bộ địa chỉ IP được ẩn danh (IP Anonymization) và không thu thập bất kỳ thông tin nhận dạng cá nhân (PII) nào.',
      },
    ],
    termsSections: [
      {
        title: '1. Phạm Vi Dịch Vụ',
        desc: 'LayaMeet cung cấp giải pháp họp trực tuyến hỗ trợ phụ đề song ngữ thời gian thực, tổng hợp biên bản họp và trích xuất Action Items bằng AI. Chúng tôi cam kết duy trì độ sẵn sàng hệ thống (Uptime SLA) tối thiểu 99.9% cho các gói dịch vụ trả phí.',
      },
      {
        title: '2. Quyền Sở Hữu Dữ Liệu',
        desc: 'Khách hàng giữ toàn quyền sở hữu đối với nội dung cuộc họp, các phụ đề được tạo ra và biên bản trích xuất. LayaMeet không can thiệp, không kiểm duyệt và không sử dụng dữ liệu hội thoại của khách hàng để huấn luyện các mô hình công cộng.',
      },
      {
        title: '3. Thanh Toán & Kích Hoạt Dịch Vụ',
        desc: 'Gói Free miễn phí vĩnh viễn. Gói Tháng Pro được kích hoạt tự động tức thì ngay sau khi xác nhận thanh toán thành công qua cổng thanh toán số.',
      },
      {
        title: '4. Chính Sách Hoàn Tiền 100%',
        desc: 'Cam kết hoàn tiền 100% trong vòng 24 giờ làm việc nếu phát sinh sự cố kỹ thuật gián đoạn dịch vụ quá thời gian cam kết SLA hoặc khách hàng không hài lòng.',
      },
    ],
    btnClose: 'Đã Hiểu & Đóng',
  },
  en: {
    privacyTitle: 'Privacy Policy & Zero-Disk Data Protection',
    privacySub: 'Strict Zero Raw Audio Storage architecture & international enterprise compliance',
    termsTitle: 'Terms of Service, Billing & SLA Guarantee',
    termsSub: 'Software service agreement, digital delivery, and 100% refund policy',
    corePrincipleBadge: 'Core Principle: Zero Raw Audio Storage',
    corePrincipleText: 'LayaMeet processes real-time audio streams in 350ms chunks entirely in volatile RAM, immediately releasing all memory buffers after subtitle generation. No audio files are ever written to disk or sent to third-party providers.',
    privacySections: [
      {
        title: '1. Minimal Data Collection',
        desc: 'Only essential operational parameters are processed: participant display names, meeting room codes, and target subtitle language preferences. Subtitle text and action items are only exported when explicitly requested by users.',
      },
      {
        title: '2. Complete Air-Gapped Isolation',
        desc: 'For On-Premises or Private VPS deployments, all media servers, Whisper speech pipelines, and Redis cache instances reside strictly within your internal enterprise network perimeter.',
      },
      {
        title: '3. End-to-End WebRTC Security',
        desc: 'All real-time audio and video tracks are encrypted with standard DTLS/SRTP protocols, providing end-to-end transport protection against eavesdropping or tampering.',
      },
      {
        title: '4. Cookie Policy & Privacy Analytics',
        desc: 'Essential session cookies are used solely to preserve meeting state. IP addresses are fully anonymized with zero Personally Identifiable Information (PII) harvested.',
      },
    ],
    termsSections: [
      {
        title: '1. Service Scope & Availability',
        desc: 'LayaMeet delivers real-time AI bilingual meeting infrastructure with guaranteed 99.9% uptime SLA for professional and enterprise subscriptions.',
      },
      {
        title: '2. Customer Data Ownership',
        desc: 'You retain 100% ownership of meeting discussions, generated subtitles, and minutes. LayaMeet never trains public AI models on customer conversations.',
      },
      {
        title: '3. Billing & Instant Digital Activation',
        desc: 'The Community plan is free forever. Pro monthly plans activate automatically within seconds following secure digital checkout.',
      },
      {
        title: '4. 100% Money-Back Guarantee',
        desc: 'We offer a full 100% refund within 24 hours of request if the service does not meet our SLA standards or performance expectations.',
      },
    ],
    btnClose: 'Understood & Close',
  },
  ja: {
    privacyTitle: 'プライバシーポリシー & 完全機密保護',
    privacySub: 'Zero Raw Audio（完全RAMメモリ処理）および企業向けセキュリティ基準',
    termsTitle: '利用規約・料金・SLA品質保証',
    termsSub: 'デジタルサービスの提供条件および100%返金保証ポリシー',
    corePrincipleBadge: '基本原則: 音声ファイルは一切保存されません',
    corePrincipleText: 'LayaMeetは350ms単位の音声チャンクをRAMメモリ上でのみ処理し、字幕生成後に直ちに破棄します。いかなる音声ファイルもハードディスクに書き込まれたり、外部AIサービスに送信されることはありません。',
    privacySections: [
      {
        title: '1. 最小限のデータ収集',
        desc: '会議セッションの維持に必要な最小限の情報（表示名、ルームコード、選択された字幕言語）のみを処理します。会議議事録はユーザーの明示的な要求時のみエクスポートされます。',
      },
      {
        title: '2. 完全閉域網オンプレミス環境',
        desc: 'オンプレミスまたは専用VPS導入の場合、LiveKitメディアサーバーおよびWhisper認識AI、Redisキャッシュはすべて社内イントラネット内に隔離されます。',
      },
      {
        title: '3. WebRTC標準暗号化通信',
        desc: 'すべての音声・映像ストリームは国際標準のDTLS/SRTPにより通信路上で暗号化され、第三者による盗聴や改ざんを完全に防ぎます。',
      },
      {
        title: '4. クッキーおよび解析方針',
        desc: 'セッション維持のための必須クッキーのみを使用し、IPアドレスは完全匿名化されます。個人特定情報（PII）の収集は一切行いません。',
      },
    ],
    termsSections: [
      {
        title: '1. サービスの提供範囲と稼働率',
        desc: 'LayaMeetはリアルタイムAI多言語会議プラットフォームを提供します。Proプランおよび企業向けプランでは99.9%以上の月間稼働率（Uptime SLA）を保証します。',
      },
      {
        title: '2. 会議データのお客様帰属',
        desc: '会議内の発言内容、生成された字幕および議事録の著作権および所有権はお客様に完全に帰属します。当社の公開AIモデル学習に使用されることはありません。',
      },
      {
        title: '3. 決済および即時デジタル有効化',
        desc: 'コミュニティ版は永久無料です。Proプランは決済完了後、数秒以内に自動的にライセンスが有効化されます。',
      },
      {
        title: '4. 100%返金保証ポリシー',
        desc: 'サービス品質がSLA基準を満たさなかった場合、またはご満足いただけなかった場合は、申請から24営業時間以内に全額返金対応いたします。',
      },
    ],
    btnClose: '確認して閉じる',
  },
};

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, type, onClose }) => {
  const { language } = useLanguage();
  if (!isOpen || !type) return null;

  const isPrivacy = type === 'privacy';
  const t = LEGAL_TEXTS[language] || LEGAL_TEXTS.vi;

  return (
    <AdaptiveDialog label="Chính sách và điều khoản" onClose={onClose} className="legal-dialog">
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#333336] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(var(--app-height)-64px)] transition-all"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-[#2b2b2e] flex items-center justify-between bg-zinc-50 dark:bg-[#121214]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
              {isPrivacy ? <ShieldCheck className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                {isPrivacy ? t.privacyTitle : t.termsTitle}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isPrivacy ? t.privacySub : t.termsSub}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label={t.btnClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div tabIndex={0} role="region" aria-label={isPrivacy ? t.privacyTitle : t.termsTitle} className="p-6 overflow-y-auto space-y-5 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {isPrivacy ? (
            <>
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 space-y-1">
                <div className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.corePrincipleBadge}</span>
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  {t.corePrincipleText}
                </p>
              </div>

              {t.privacySections.map((sec, idx) => (
                <div key={idx}>
                  <h4 className="font-bold text-zinc-950 dark:text-white text-sm mb-1.5">{sec.title}</h4>
                  <p>{sec.desc}</p>
                </div>
              ))}
            </>
          ) : (
            <>
              {t.termsSections.map((sec, idx) => (
                <div key={idx}>
                  <h4 className="font-bold text-zinc-950 dark:text-white text-sm mb-1.5">{sec.title}</h4>
                  <p>{sec.desc}</p>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-[#2b2b2e] bg-zinc-50 dark:bg-[#121214] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 transition-colors cursor-pointer"
          >
            {t.btnClose}
          </button>
        </div>
      </div>
    </AdaptiveDialog>
  );
};
