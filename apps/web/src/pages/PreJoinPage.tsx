import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApiError, meetingApi } from '../api/meetingApi';
import { meetingStorage } from '../utils/meetingStorage';
import { admissionStorage } from '../utils/admissionStorage';
import {
  AdmissionPendingResponse,
  isAdmissionPending,
  JoinMeetingResponse,
  MeetingSchedule,
  MeetingSessionData,
  SupportedLanguage,
  SUPPORTED_LANGUAGES_LIST,
  getLanguageOption,
} from '../types/meeting';
import { Mic, LogIn, ArrowLeft, ChevronDown, SlidersHorizontal, Settings, Volume2, Globe } from 'lucide-react';
import { LayaMeetLogo } from '../components/common/LayaMeetLogo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { NeuralLinguisticBackground } from '../components/common/NeuralLinguisticBackground';
import { GoogleAuthControl } from '../components/auth/GoogleAuthControl';
import { useAuth } from '../context/auth-context-def';
import { useLanguage } from '../context/language-context-def';
import { AppLanguage } from '../i18n';
import { getUserSettings, saveUserSettings } from '../utils/userSettings';
import { CountdownLobbyCard } from '../components/meeting/CountdownLobbyCard';
import { PreJoinCameraPreview } from '../components/prejoin/PreJoinCameraPreview';
import { PreJoinSettingsModal } from '../components/prejoin/PreJoinSettingsModal';

interface GlossaryDomainOption {
  id: string;
  name: string;
  desc: string;
}

// Extensible glossary domains matrix for enterprise meetings
const GLOSSARY_DOMAINS: GlossaryDomainOption[] = [
  { id: 'general', name: 'Tổng quát / Đa lĩnh vực (Mặc định)', desc: 'Hội thoại thông thường, họp nội bộ, giao tiếp đa ngành' },
  { id: 'engineering', name: 'Công nghệ thông tin (IT / Tech)', desc: 'Lập trình, hệ thống, kiến trúc hạ tầng phần mềm' },
  { id: 'business', name: 'Kinh doanh & Thương mại', desc: 'Bán hàng, đối tác, đàm phán hợp đồng thương mại' },
  { id: 'finance', name: 'Tài chính & Ngân hàng', desc: 'Kế toán, kiểm toán, ngân sách, báo cáo tài chính' },
  { id: 'manufacturing', name: 'Sản xuất & Chuỗi cung ứng', desc: 'Quy trình nhà máy, QA/QC, xuất nhập khẩu, logistics' },
  { id: 'healthcare', name: 'Y tế & Dược phẩm', desc: 'Thuật ngữ y khoa, nghiên cứu lâm sàng, sức khỏe' },
  { id: 'legal', name: 'Pháp lý & Tuân thủ', desc: 'Điều khoản pháp lý, sở hữu trí tuệ, hợp đồng kinh tế' },
];

const PREJOIN_COPY: Record<
  AppLanguage,
  {
    back: string;
    cameraOff: string;
    subtitleTargetBadge: (name: string) => string;
    displayNameLabel: string;
    displayNamePlaceholder: string;
    displayNameRequired: string;
    languageLabel: string;
    languageHelpText: string;
    languageRequired: string;
    nativeLanguageTitle: string;
    nativeLanguageSubtitle: string;
    otherLanguages: string;
    customSpeakingPrompt: string;
    speakingLanguageOption: string;
    speakingSameAsNative: string;
    advancedOptions: string;
    advancedOptionsMobile: string;
    glossaryDomainLabel: string;
    customKeywordsLabel: string;
    joinBtn: string;
    joiningBtn: string;
    waitingHostBtn: string;
  }
> = {
  vi: {
    back: 'Quay lại',
    cameraOff: 'Camera đang tắt',
    subtitleTargetBadge: (name: string) => `Phụ đề dịch sang: ${name}`,
    displayNameLabel: 'Tên hiển thị',
    displayNamePlaceholder: 'Nhập họ và tên của bạn',
    displayNameRequired: 'Vui lòng nhập tên hiển thị của bạn.',
    languageLabel: 'Ngôn ngữ của bạn (Nhận phụ đề)',
    languageHelpText: 'Hệ thống sẽ dịch và hiển thị phụ đề theo ngôn ngữ này cho bạn khi nghe người khác nói.',
    languageRequired: 'Vui lòng chọn ngôn ngữ của bạn.',
    nativeLanguageTitle: 'Ngôn ngữ mẹ đẻ của bạn (Nhận phụ đề)',
    nativeLanguageSubtitle: 'Hệ thống sẽ dịch và hiển thị phụ đề theo ngôn ngữ này cho bạn khi nghe người khác nói (kể cả khi bạn chỉ vào nghe mà không phát biểu).',
    otherLanguages: 'Ngôn ngữ khác...',
    customSpeakingPrompt: '+ Tùy chỉnh ngôn ngữ khi bạn nói (nếu khác tiếng mẹ đẻ)',
    speakingLanguageOption: 'Ngôn ngữ phát biểu khi bạn nói:',
    speakingSameAsNative: 'Đặt lại theo tiếng mẹ đẻ',
    advancedOptions: 'Tùy chọn nâng cao (Từ điển chuyên ngành)',
    advancedOptionsMobile: 'Thiết bị & Từ điển chuyên ngành',
    glossaryDomainLabel: 'Lĩnh vực thuật ngữ cuộc họp:',
    customKeywordsLabel: 'Từ khóa chuyên ngành bổ trợ (Tùy chọn):',
    joinBtn: 'Tham gia ngay',
    joiningBtn: 'Đang tham gia...',
    waitingHostBtn: 'Đang chờ người tổ chức duyệt...',
  },
  en: {
    back: 'Back',
    cameraOff: 'Camera is off',
    subtitleTargetBadge: (name: string) => `Subtitles translated to: ${name}`,
    displayNameLabel: 'Display Name',
    displayNamePlaceholder: 'Enter your full name',
    displayNameRequired: 'Please enter your display name.',
    languageLabel: 'Your Language (Subtitle Target)',
    languageHelpText: 'The system will translate and display subtitles in this language for you when others speak.',
    languageRequired: 'Please select your language.',
    nativeLanguageTitle: 'Your Native Language (Subtitle Target)',
    nativeLanguageSubtitle: 'The system will translate and display subtitles in this language for you when others speak (even if you only listen without speaking).',
    otherLanguages: 'Other languages...',
    customSpeakingPrompt: '+ Customize speaking language (if different from native)',
    speakingLanguageOption: 'Speaking language (when you talk):',
    speakingSameAsNative: 'Reset to native language',
    advancedOptions: 'Advanced options (Domain glossary)',
    advancedOptionsMobile: 'Devices & Domain Glossary',
    glossaryDomainLabel: 'Meeting Terminology Domain:',
    customKeywordsLabel: 'Supplementary keywords (Optional):',
    joinBtn: 'Join Now',
    joiningBtn: 'Joining...',
    waitingHostBtn: 'Waiting for host approval...',
  },
  ja: {
    back: '戻る',
    cameraOff: 'カメラはオフです',
    subtitleTargetBadge: (name: string) => `字幕翻訳先: ${name}`,
    displayNameLabel: '表示名',
    displayNamePlaceholder: 'お名前を入力してください',
    displayNameRequired: '表示名を入力してください。',
    languageLabel: 'あなたの言語（字幕翻訳先）',
    languageHelpText: '他の参加者の発言をこの言語にリアルタイム翻訳して字幕表示します。',
    languageRequired: '言語を選択してください。',
    nativeLanguageTitle: '母国語（字幕の言語）',
    nativeLanguageSubtitle: '他の参加者の発言をこの言語にリアルタイム翻訳して字幕表示します（発言せず聞くだけの場合でも適用されます）。',
    otherLanguages: 'その他の言語...',
    customSpeakingPrompt: '+ 発言時の言語をカスタマイズ（母国語と異なる場合）',
    speakingLanguageOption: '発言時の言語:',
    speakingSameAsNative: '母国語と同じにする',
    advancedOptions: '高度な設定（専門用語辞書）',
    advancedOptionsMobile: 'デバイス・専門用語辞書',
    glossaryDomainLabel: '会議の用語ドメイン:',
    customKeywordsLabel: '補助キーワード（任意）:',
    joinBtn: '今すぐ参加',
    joiningBtn: '参加中...',
    waitingHostBtn: 'ホストの承認を待機中...',
  },
};

function getInitialNativeLanguage(_appLanguage?: string): SupportedLanguage {
  try {
    const saved = localStorage.getItem('layameet:native-language');
    if (saved && SUPPORTED_LANGUAGES_LIST.some((l) => l.code === saved)) {
      return saved as SupportedLanguage;
    }
    const settings = getUserSettings();
    if (settings.nativeLanguage && SUPPORTED_LANGUAGES_LIST.some((l) => l.code === settings.nativeLanguage)) {
      return settings.nativeLanguage;
    }
  } catch {
    // Ignore storage errors
  }
  return 'en';
}

function asSupportedLanguage(value?: string | null): SupportedLanguage | null {
  return SUPPORTED_LANGUAGES_LIST.some((language) => language.code === value)
    ? value as SupportedLanguage
    : null;
}

interface PreJoinPageProps {
  onJoined?: (session: MeetingSessionData) => void;
}

export const PreJoinPage: React.FC<PreJoinPageProps> = ({ onJoined }) => {
  const { meetingCode } = useParams<{ meetingCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const copy = PREJOIN_COPY[language] || PREJOIN_COPY.vi;

  const [displayName, setDisplayName] = useState(() => {
    return user?.fullName || localStorage.getItem('layameet:last-display-name') || '';
  });

  useEffect(() => {
    if (user?.fullName && !displayName.trim()) {
      setDisplayName(user.fullName);
    }
  }, [user?.fullName, displayName]);

  const [nativeLanguage, setNativeLanguage] = useState<SupportedLanguage>(() => {
    return getInitialNativeLanguage(language);
  });
  const [spokenLanguage, setSpokenLanguage] = useState<SupportedLanguage>(() => {
    return getInitialNativeLanguage(language);
  });
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>(() => {
    return getInitialNativeLanguage(language);
  });
  const handleSelectNativeLanguage = (code: SupportedLanguage) => {
    setNativeLanguage(code);
    setTargetLanguage(code);
    setSpokenLanguage(code);
    try {
      localStorage.setItem('layameet:native-language', code);
      saveUserSettings({ nativeLanguage: code });
    } catch {
      // Ignore
    }
  };

  const [meetingDomain, setMeetingDomain] = useState<string>(() => {
    return localStorage.getItem('ai-meeting-domain') || 'general';
  });
  const [customKeywords, setCustomKeywords] = useState<string>(() => {
    return localStorage.getItem('ai-meeting-initial-prompt') || '';
  });
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState('');
  const [pendingAdmission, setPendingAdmission] = useState<AdmissionPendingResponse | null>(null);
  const [admissionRejected, setAdmissionRejected] = useState(false);
  const [schedule, setSchedule] = useState<MeetingSchedule | null>(null);
  const [hasPreApprovedPass, setHasPreApprovedPass] = useState(false);

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [audioVolume, setAudioVolume] = useState<number>(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [previewRetryCount, setPreviewRetryCount] = useState<number>(0);
  const [isPlayingSpeakerTest, setIsPlayingSpeakerTest] = useState(false);

  const handleTestSpeakerSound = useCallback(() => {
    try {
      setIsPlayingSpeakerTest(true);
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const chord = [523.25, 659.25, 783.99]; // C5, E5, G5 gentle chord
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.36);
      });
      setTimeout(() => {
        setIsPlayingSpeakerTest(false);
        void ctx.close().catch(() => {});
      }, 700);
    } catch (err) {
      console.warn('Audio speaker test playback failed', err);
      setIsPlayingSpeakerTest(false);
    }
  }, []);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastLevelUpdateRef = useRef(0);

  useEffect(() => {
    if (!meetingCode) return undefined;

    const code = meetingCode.trim().toUpperCase();
    const urlInviteToken = new URLSearchParams(window.location.search).get('invite')?.trim();
    if (urlInviteToken) {
      admissionStorage.saveInviteToken(code, urlInviteToken);
    }
    const storedInviteToken = urlInviteToken || admissionStorage.getInviteToken(code);
    setInviteToken(storedInviteToken || '');
    setHasPreApprovedPass(Boolean(storedInviteToken));
    setSchedule(null);

    let cancelled = false;
    meetingApi
      .getMeetingSchedule(code)
      .then((meetingSchedule) => {
        if (cancelled) return;
        setSchedule(meetingSchedule);

        const scheduledSpokenLanguage = asSupportedLanguage(
          meetingSchedule.defaultSpokenLanguage,
        );
        const scheduledTargetLanguage = asSupportedLanguage(
          meetingSchedule.defaultTargetLanguage,
        );
        if (scheduledSpokenLanguage) {
          setSpokenLanguage(scheduledSpokenLanguage);
          localStorage.setItem('ai-meeting-spoken-language', scheduledSpokenLanguage);
        }
        if (scheduledTargetLanguage) {
          setTargetLanguage(scheduledTargetLanguage);
          localStorage.setItem('ai-meeting-target-language', scheduledTargetLanguage);
        }
        if (meetingSchedule.domainGlossary?.trim()) {
          setMeetingDomain(meetingSchedule.domainGlossary);
          localStorage.setItem('ai-meeting-domain', meetingSchedule.domainGlossary);
        }
        if (meetingSchedule.agenda?.trim()) {
          setCustomKeywords(meetingSchedule.agenda);
          localStorage.setItem('ai-meeting-initial-prompt', meetingSchedule.agenda);
        }
      })
      .catch((err: unknown) => {
        if (cancelled || (err instanceof ApiError && err.status === 404)) return;
        setError('Không thể tải lịch họp. Bạn vẫn có thể tiếp tục tham gia phòng.');
      });

    return () => {
      cancelled = true;
    };
  }, [meetingCode]);

  // Load available devices
  const refreshDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        setPermissionError('Trình duyệt không hỗ trợ media devices hoặc trang chưa chạy qua localhost/HTTPS.');
        return;
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter((d) => d.kind === 'audioinput');
      const cams = devices.filter((d) => d.kind === 'videoinput');
      setAudioDevices(mics);
      setVideoDevices(cams);
      setSelectedAudioId((current) => current || mics[0]?.deviceId || '');
      setSelectedVideoId((current) => current || cams[0]?.deviceId || '');
    } catch (e) {
      console.warn('Failed to enumerate devices', e);
    }
  }, []);

  const buildAudioConstraint = useCallback((): MediaTrackConstraints => ({
    ...(selectedAudioId ? { deviceId: { ideal: selectedAudioId } } : {}),
    autoGainControl: true,
    echoCancellation: true,
    noiseSuppression: true,
  }), [selectedAudioId]);

  const buildVideoConstraint = useCallback((): MediaTrackConstraints => ({
    ...(selectedVideoId ? { deviceId: { ideal: selectedVideoId } } : {}),
    frameRate: { ideal: 24, max: 30 },
  }), [selectedVideoId]);

  const getErrorMessage = (err: unknown) => (
    err instanceof Error ? err.message : 'Không thể mở thiết bị media'
  );

  const getPreviewStream = useCallback(async (): Promise<{
    stream: MediaStream;
    warning: string | null;
  }> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Trình duyệt không hỗ trợ mic/camera trên origin hiện tại. Hãy mở bằng http://127.0.0.1:3000, http://localhost:3000 hoặc HTTPS.');
    }

    const audioConstraint = isMicOn ? buildAudioConstraint() : false;
    const videoConstraint = isCameraOn ? buildVideoConstraint() : false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraint,
        video: videoConstraint,
      });
      return { stream, warning: null };
    } catch (combinedError: unknown) {
      if (!isMicOn || !isCameraOn) {
        throw combinedError;
      }

      console.warn('Combined media request failed; retrying devices separately', combinedError);

      const tracks: MediaStreamTrack[] = [];
      const warnings: string[] = [];

      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraint,
          video: false,
        });
        tracks.push(...audioStream.getAudioTracks());
      } catch (audioError: unknown) {
        warnings.push(`Mic: ${getErrorMessage(audioError)}`);
      }

      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: videoConstraint,
        });
        tracks.push(...videoStream.getVideoTracks());
      } catch (videoError: unknown) {
        warnings.push(`Camera: ${getErrorMessage(videoError)}`);
      }

      if (tracks.length === 0) {
        throw combinedError;
      }

      return {
        stream: new MediaStream(tracks),
        warning: warnings.length > 0 ? warnings.join(' | ') : null,
      };
    }
  }, [isMicOn, isCameraOn, buildAudioConstraint, buildVideoConstraint]);

  const handleGrantPermission = () => setPreviewRetryCount((count) => count + 1);

  // Initialize camera & mic preview stream with audio level meter
  useEffect(() => {
    let isCancelled = false;

    async function startMediaPreview() {
      // Stop old tracks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      setAudioVolume(0);

      if (!isCameraOn && !isMicOn) {
        setPermissionError(null);
        if (videoRef.current) videoRef.current.srcObject = null;
        return;
      }

      try {
        setPermissionError(null);
        const { stream, warning } = await getPreviewStream();
        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Setup audio level meter
        if (isMicOn && stream.getAudioTracks().length > 0) {
          try {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const audioCtx = new AudioCtx();
            audioContextRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateLevel = () => {
              if (isCancelled) return;
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              const now = performance.now();
              if (now - lastLevelUpdateRef.current >= 100) {
                setAudioVolume(Math.min(100, Math.round((avg / 128) * 100)));
                lastLevelUpdateRef.current = now;
              }
              animFrameRef.current = requestAnimationFrame(updateLevel);
            };
            updateLevel();
          } catch (audioErr) {
            console.warn('Audio analyser setup failed', audioErr);
          }
        }

        await refreshDevices();
        if (!isCancelled && warning) setPermissionError(warning);
      } catch (err: unknown) {
        console.warn('Media preview permission denied or device not found', err);
        setPermissionError(getErrorMessage(err));
      }
    }

    startMediaPreview();

    return () => {
      isCancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isCameraOn, isMicOn, getPreviewStream, refreshDevices, previewRetryCount]);

  const stopPreview = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
  }, []);

  const completeJoin = useCallback((joinRes: JoinMeetingResponse) => {
    const hostToken = admissionStorage.getHostToken(joinRes.meetingCode);
    admissionStorage.clearPendingToken(joinRes.meetingCode);
    admissionStorage.clearInviteToken(joinRes.meetingCode);
    setInviteToken('');
    try {
      localStorage.setItem('layameet:last-display-name', joinRes.displayName);
    } catch {
      // Ignore storage errors
    }
    const sessionData: MeetingSessionData = {
      meetingCode: joinRes.meetingCode,
      meetingId: joinRes.meetingId,
      participantId: joinRes.participantId,
      identity: joinRes.identity,
      displayName: joinRes.displayName,
      spokenLanguage: joinRes.spokenLanguage,
      targetLanguage: joinRes.targetLanguage,
      liveKitUrl: joinRes.liveKitUrl,
      token: joinRes.token,
      subtitleToken: joinRes.subtitleToken,
      sessionToken: joinRes.sessionToken,
      role: joinRes.role,
      hostToken: joinRes.role === 'host' ? hostToken || undefined : undefined,
      initialMicOn: isMicOn,
      initialCameraOn: isCameraOn,
      audioDeviceId: selectedAudioId || undefined,
      videoDeviceId: selectedVideoId || undefined,
    };
    meetingStorage.saveSession(sessionData);
    if (onJoined) {
      onJoined(sessionData);
    } else {
      navigate(`/meeting/${joinRes.meetingCode}`, { replace: true });
    }
  }, [isMicOn, isCameraOn, selectedAudioId, selectedVideoId, navigate, onJoined]);

  const admissionMessage = (err: unknown): string => {
    if (err instanceof ApiError) {
      if (err.code === 'admission_token_expired') return 'Invite hoặc yêu cầu tham gia đã hết hạn.';
      if (err.code === 'admission_rejected') return 'Host đã từ chối yêu cầu tham gia.';
      if (err.code === 'admission_wrong_meeting') return 'Invite không thuộc phòng họp này.';
      if (err.code === 'admission_already_used') return 'Invite đã được sử dụng.';
      if (err.code?.startsWith('admission_token')) return 'Invite không hợp lệ hoặc đã hết hạn.';
    }
    return err instanceof Error ? err.message : 'Không thể tham gia phòng họp';
  };

  useEffect(() => {
    if (!meetingCode || !pendingAdmission || admissionRejected) return undefined;

    const timer = window.setInterval(async () => {
      try {
        const result = await meetingApi.joinMeeting(meetingCode, {
          displayName: displayName.trim(),
          spokenLanguage,
          targetLanguage,
          admissionToken: pendingAdmission.admissionToken,
        });
        if (!isAdmissionPending(result)) {
          window.clearInterval(timer);
          completeJoin(result);
        }
      } catch (err: unknown) {
        if (err instanceof ApiError && err.code === 'admission_rejected') {
          window.clearInterval(timer);
          admissionStorage.clearPendingToken(meetingCode);
          setPendingAdmission(null);
          setAdmissionRejected(true);
        }
        setError(admissionMessage(err));
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [
    meetingCode,
    pendingAdmission,
    admissionRejected,
    displayName,
    spokenLanguage,
    targetLanguage,
    completeJoin,
  ]);

  const handleJoinNow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingCode) return;
    if (!displayName.trim()) {
      setError(copy.displayNameRequired);
      return;
    }
    if (!nativeLanguage) {
      setError(copy.languageRequired);
      return;
    }

    setLoading(true);
    setError(null);

    const code = meetingCode.trim().toUpperCase();

    try {
      const credential = admissionStorage.getHostToken(code)
        || inviteToken.trim()
        || admissionStorage.getInviteToken(code)
        || undefined;
      let result;
      try {
        result = await meetingApi.joinMeeting(code, {
          displayName: displayName.trim(),
          spokenLanguage,
          targetLanguage,
          admissionToken: credential,
        });
      } catch (joinErr: unknown) {
        if (
          credential
          && joinErr instanceof ApiError
          && (joinErr.code === 'admission_already_used'
            || joinErr.code === 'admission_token_expired'
            || joinErr.code?.startsWith('admission_token'))
        ) {
          admissionStorage.clearInviteToken(code);
          admissionStorage.clearHostToken(code);
          setInviteToken('');
          setHasPreApprovedPass(false);
          result = await meetingApi.joinMeeting(code, {
            displayName: displayName.trim(),
            spokenLanguage,
            targetLanguage,
          });
        } else {
          throw joinErr;
        }
      }

      stopPreview();
      if (isAdmissionPending(result)) {
        admissionStorage.savePendingToken(code, result.admissionToken);
        setPendingAdmission(result);
        setAdmissionRejected(false);
      } else {
        completeJoin(result);
      }
    } catch (err: unknown) {
      setError(admissionMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="prejoin-page relative min-h-dvh bg-slate-100/90 dark:bg-[#070709] text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-start sm:justify-center p-2.5 sm:p-6 transition-colors overflow-x-hidden overflow-y-auto">
      {/* ── Interactive Neural Linguistic Synapse Network (Mouse reactive) ── */}
      <NeuralLinguisticBackground />

      {/* ── Atmospheric Ambient Depth Light ──────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[650px] bg-blue-500/10 dark:bg-blue-600/20 rounded-full blur-[140px]" />
        <div className="absolute -top-40 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-[120px]" />
      </div>

      {/* ── Elevated High-Contrast Modal Card ────────────────────── */}
      <div className="relative z-10 max-w-4xl w-full my-auto bg-white dark:bg-[#16161a] border border-zinc-200/90 dark:border-[#2e2e38] rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.16)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] ring-1 ring-zinc-950/5 dark:ring-white/10 transition-colors overflow-hidden">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-3 py-2 md:px-6 md:py-4 bg-zinc-50/90 dark:bg-[#1a1a1e]/90 border-b border-zinc-200 dark:border-[#2a2a30] gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <LayaMeetLogo size="sm" showWordmark={false} />
            <div className="min-w-0 flex sm:block items-center gap-2">
              <h1 className="hidden sm:block text-xs sm:text-sm font-bold text-zinc-900 dark:text-white leading-none">Chuẩn bị tham gia</h1>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 sm:mt-1 flex items-center gap-1.5 whitespace-nowrap">
                <span className="hidden sm:inline">Phòng họp:</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 px-2 py-0.5 rounded-md text-xs font-semibold tracking-wide select-all">
                  {meetingCode?.toUpperCase()}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Mobile Google Meet style Quick Settings Sheet trigger */}
            <button
              type="button"
              onClick={() => setShowAdvancedSettings(true)}
              aria-label="Mở cài đặt thiết bị và từ điển"
              title="Cài đặt thiết bị & từ điển chuyên ngành"
              className="md:hidden p-2 rounded-lg border border-zinc-300 dark:border-[#3a3a40] bg-white hover:bg-zinc-100 dark:bg-[#202024] text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => navigate('/')}
              aria-label="Quay lại"
              className="min-w-[44px] min-h-[44px] px-2.5 sm:px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-[#3a3a40] bg-white hover:bg-zinc-100 dark:bg-[#202024] dark:hover:bg-[#28282e] text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Quay lại</span>
            </button>
          </div>
        </div>

        {/* ── Status Banners ───────────────────────────────────────── */}
        {error && (
          <div role="alert" className="mx-3.5 md:mx-6 mt-3 p-2.5 md:p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}
        {pendingAdmission && (
          <div role="status" aria-live="polite" className="mx-3.5 md:mx-6 mt-3 p-2.5 md:p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
            <span className="font-medium">Đang chờ host phê duyệt —</span>{' '}
            Trang sẽ tự động tiếp tục khi được chấp nhận.
          </div>
        )}
        {admissionRejected && (
          <div role="alert" className="mx-3.5 md:mx-6 mt-3 p-2.5 md:p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs">
            Host đã từ chối yêu cầu tham gia. Vui lòng quay lại trang chủ hoặc thử lại.
          </div>
        )}

        {schedule && schedule.scheduledStartAt && new Date(schedule.scheduledStartAt).getTime() > Date.now() && (
          <CountdownLobbyCard
            schedule={schedule}
            displayName={displayName}
            email={user?.email}
            spokenLanguage={spokenLanguage}
            targetLanguage={targetLanguage}
            hasPreApprovedPass={hasPreApprovedPass}
            onPreApproved={(token) => {
              admissionStorage.saveInviteToken(schedule.meetingCode, token);
              setInviteToken(token);
              setHasPreApprovedPass(true);
            }}
            onScheduleChange={setSchedule}
          />
        )}

        {/* ── Main Two-Column Layout ───────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-12 p-3 md:p-6 gap-2.5 md:gap-6">

          {/* Left col: Camera preview + device info */}
          <div className="prejoin-preview md:col-span-7 space-y-2 md:space-y-3">

            {/* Camera preview */}
            <PreJoinCameraPreview
              videoRef={videoRef}
              isCameraOn={isCameraOn}
              isMicOn={isMicOn}
              onToggleCamera={() => setIsCameraOn((prev) => !prev)}
              onToggleMic={() => setIsMicOn((prev) => !prev)}
              nativeLanguage={nativeLanguage}
              cameraOffText={copy.cameraOff}
              subtitleBadgeText={copy.subtitleTargetBadge(getLanguageOption(nativeLanguage).nativeName)}
            />

            {/* Compact permission alert on mobile */}
            {permissionError && (
              <div className="md:hidden p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-2">
                <span className="line-clamp-2">Chưa cấp quyền mic/camera. Bạn có thể cấp quyền hoặc tham gia ở chế độ chỉ nghe.</span>
                <button
                  type="button"
                  onClick={handleGrantPermission}
                  className="shrink-0 px-2.5 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Cấp quyền
                </button>
              </div>
            )}

            {/* Device & mic check panel (Desktop inline; on Mobile moved to Google Meet Settings Sheet so Join button never overflows) */}
            <div className="hidden md:block bg-zinc-50/80 dark:bg-[#0e0e11] rounded-xl border border-zinc-200 dark:border-[#28282e] p-3.5 md:p-4 space-y-3 transition-colors shadow-2xs">
              {permissionError && (
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-2">
                  <span className="truncate">Chưa cấp quyền: {permissionError}</span>
                  <button
                    type="button"
                    onClick={handleGrantPermission}
                    className="shrink-0 px-2 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded text-xs font-medium transition-colors cursor-pointer"
                  >
                    Cấp quyền
                  </button>
                </div>
              )}

              {/* Mic & Speaker Audio Checks */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-0.5">
                {/* Mic level meter */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <Mic className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400 shrink-0">Mic</span>
                  <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-[#252528] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-75 rounded-full"
                      style={{ width: `${isMicOn ? audioVolume : 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono w-7 text-right shrink-0">
                    {isMicOn ? `${audioVolume}%` : '—'}
                  </span>
                </div>

                {/* Speaker Test Button (Zoom/Google Meet standard) */}
                <button
                  type="button"
                  onClick={handleTestSpeakerSound}
                  disabled={isPlayingSpeakerTest}
                  title="Kiểm tra âm thanh phát ra loa/tai nghe"
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                    isPlayingSpeakerTest
                      ? 'bg-blue-600 text-white border-blue-500 animate-pulse'
                      : 'bg-white dark:bg-[#18181c] border-zinc-300 dark:border-[#323238] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#222228]'
                  }`}
                >
                  <Volume2 className={`w-3.5 h-3.5 ${isPlayingSpeakerTest ? 'text-white animate-bounce' : 'text-blue-500'}`} />
                  <span>{isPlayingSpeakerTest ? 'Đang phát âm thanh...' : 'Nghe thử loa'}</span>
                </button>
              </div>

              {/* Device selects */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">Microphone</label>
                  <select aria-label="Microphone"
                    value={selectedAudioId}
                    onChange={(e) => setSelectedAudioId(e.target.value)}
                    className="w-full bg-white dark:bg-[#18181c] border border-zinc-300 dark:border-[#323238] text-zinc-900 dark:text-zinc-100 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition shadow-2xs"
                  >
                    {audioDevices.length > 0 ? (
                      audioDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || `Microphone (${d.deviceId.slice(0, 5)})`}
                        </option>
                      ))
                    ) : (
                      <option value="">Microphone mặc định</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">Camera</label>
                  <select aria-label="Camera"
                    value={selectedVideoId}
                    onChange={(e) => setSelectedVideoId(e.target.value)}
                    className="w-full bg-white dark:bg-[#18181c] border border-zinc-300 dark:border-[#323238] text-zinc-900 dark:text-zinc-100 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition shadow-2xs"
                  >
                    {videoDevices.length > 0 ? (
                      videoDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || `Camera (${d.deviceId.slice(0, 5)})`}
                        </option>
                      ))
                    ) : (
                      <option value="">Camera mặc định</option>
                    )}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right col: Form */}
          <form
            onSubmit={handleJoinNow}
            className="prejoin-form md:col-span-5 flex flex-col gap-2.5 md:gap-4 md:border-l md:border-zinc-200 md:dark:border-[#2a2a30] md:pl-6"
          >
            {/* Google Sign-In via Supabase Auth */}
            <GoogleAuthControl
              variant="prejoin"
              redirectPath={meetingCode ? `/meeting/${meetingCode}` : '/'}
              onUserAuthenticated={(fullName) => {
                if (!displayName.trim()) {
                  setDisplayName(fullName);
                }
              }}
            />

            {/* Display name */}
            <div>
              <label htmlFor="display-name" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {copy.displayNameLabel}
              </label>
              <input
                id="display-name"
                type="text"
                placeholder={copy.displayNamePlaceholder}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-white dark:bg-[#18181c] border border-zinc-300 dark:border-[#323238] text-zinc-900 dark:text-white text-base sm:text-sm rounded-lg px-3 py-2 md:py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition placeholder-zinc-400 dark:placeholder-zinc-500 shadow-2xs font-medium"
                required
              />
            </div>

            {/* Language Selector (Single Combobox, Required, Default EN) */}
            <div>
              <label
                htmlFor="native-language-select"
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
              >
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                <span>{copy.languageLabel}</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="native-language-select"
                  value={nativeLanguage}
                  onChange={(e) => handleSelectNativeLanguage(e.target.value as SupportedLanguage)}
                  className="w-full bg-white dark:bg-[#18181c] border border-zinc-300 dark:border-[#323238] text-zinc-900 dark:text-white text-base sm:text-sm rounded-lg pl-3 pr-10 py-2 md:py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition shadow-2xs font-medium appearance-none cursor-pointer"
                  required
                >
                  {SUPPORTED_LANGUAGES_LIST.map((lang) => (
                    <option
                      key={lang.code}
                      value={lang.code}
                      className="bg-white dark:bg-[#18181c] text-zinc-900 dark:text-white py-1"
                    >
                      {lang.nativeName} {lang.name !== lang.nativeName ? `(${lang.name})` : ''}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-zinc-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                {copy.languageHelpText}
              </p>
            </div>

            {/* Open Advanced Device & AI Glossary Dialog */}
            <div>
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="w-full md:w-auto flex items-center justify-between md:justify-start gap-1.5 px-3 py-2 md:p-0 md:py-0.5 rounded-xl md:rounded-none bg-zinc-100/90 md:bg-transparent dark:bg-[#1c1d22] md:dark:bg-transparent border border-zinc-200/80 md:border-0 dark:border-[#2c2e36] text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 transition-colors cursor-pointer select-none"
              >
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500 md:text-zinc-400" />
                  <span className="md:hidden font-medium">{copy.advancedOptionsMobile}</span>
                  <span className="hidden md:inline">{copy.advancedOptions}</span>
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            </div>

            {/* CTA — grows to bottom */}
            <div className="mt-auto pt-1 md:pt-2">
              <button
                type="submit"
                disabled={loading || Boolean(pendingAdmission)}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:cursor-not-allowed"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {pendingAdmission ? copy.waitingHostBtn : loading ? copy.joiningBtn : copy.joinBtn}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Google Meet Style Settings & Device Sheet ── */}
      <PreJoinSettingsModal
        isOpen={showAdvancedSettings}
        onClose={() => setShowAdvancedSettings(false)}
        audioDevices={audioDevices}
        videoDevices={videoDevices}
        selectedAudioId={selectedAudioId}
        setSelectedAudioId={setSelectedAudioId}
        selectedVideoId={selectedVideoId}
        setSelectedVideoId={setSelectedVideoId}
        isMicOn={isMicOn}
        audioVolume={audioVolume}
        handleTestSpeakerSound={handleTestSpeakerSound}
        isPlayingSpeakerTest={isPlayingSpeakerTest}
        spokenLanguage={spokenLanguage}
        setSpokenLanguage={setSpokenLanguage}
        meetingDomain={meetingDomain}
        setMeetingDomain={setMeetingDomain}
        customKeywords={customKeywords}
        setCustomKeywords={setCustomKeywords}
        glossaryDomains={GLOSSARY_DOMAINS}
      />
    </main>
  );
};
