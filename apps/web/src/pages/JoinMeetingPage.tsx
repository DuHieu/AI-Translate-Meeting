import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { meetingApi } from '../api/meetingApi';
import { meetingStorage } from '../utils/meetingStorage';
import { isAdmissionPending, SupportedLanguage, SUPPORTED_LANGUAGES_LIST } from '../types/meeting';
import { CountryFlag } from '../components/common/CountryFlag';
import { Video, LogIn } from 'lucide-react';

export const JoinMeetingPage: React.FC = () => {
  const { meetingCode } = useParams<{ meetingCode: string }>();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [spokenLanguage, setSpokenLanguage] = useState<SupportedLanguage>('vi');
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>('ja');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingCode) return;
    if (!displayName.trim()) {
      setError('Please enter your name.');
      return;
    }

    setLoading(true);
    setError(null);

    const code = meetingCode.trim().toUpperCase();

    try {
      const joinRes = await meetingApi.joinMeeting(code, {
        displayName: displayName.trim(),
        spokenLanguage,
        targetLanguage,
      });

      if (isAdmissionPending(joinRes)) {
        setError('Yêu cầu đã được gửi. Vui lòng chờ host phê duyệt trong màn hình pre-join.');
        return;
      }

      meetingStorage.saveSession({
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
      });

      navigate(`/meeting/${joinRes.meetingCode}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to join meeting';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-1">
            <Video className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Join Meeting ({meetingCode?.toUpperCase()})</h2>
          <p className="text-xs text-slate-400">Enter your display name and language preferences to join</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Your Name</label>
            <input
              type="text"
              placeholder="e.g. Hieu"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-xl p-3 outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                <CountryFlag code={spokenLanguage} size="xs" />
                <span>Bạn phát biểu</span>
              </label>
              <select
                value={spokenLanguage}
                onChange={(e) => setSpokenLanguage(e.target.value as SupportedLanguage)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                {SUPPORTED_LANGUAGES_LIST.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                <CountryFlag code={targetLanguage} size="xs" />
                <span>Phụ đề dịch sang</span>
              </label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value as SupportedLanguage)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                {SUPPORTED_LANGUAGES_LIST.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 disabled:opacity-50"
          >
            <LogIn className="w-5 h-5" />
            <span>{loading ? 'Joining...' : 'Enter Room'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
