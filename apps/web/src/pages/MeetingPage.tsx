import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MeetingRoom } from '../components/meeting/MeetingRoom';
import { meetingStorage } from '../utils/meetingStorage';
import { MeetingSessionData } from '../types/meeting';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export const MeetingPage: React.FC = () => {
  const { meetingCode } = useParams<{ meetingCode: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<MeetingSessionData | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!meetingCode) {
      setIsChecking(false);
      return;
    }

    const savedSession = meetingStorage.getSession(meetingCode);
    if (savedSession && savedSession.token && savedSession.liveKitUrl) {
      setSession(savedSession);
    } else {
      setSession(null);
    }
    setIsChecking(false);
  }, [meetingCode]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400 font-medium">
          <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span>Initializing meeting room...</span>
        </div>
      </div>
    );
  }

  if (!meetingCode || !session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Meeting Session Expired</h2>
          <p className="text-sm text-slate-400">
            No active session credentials found for meeting <span className="font-mono text-sky-400 font-bold">{meetingCode?.toUpperCase()}</span>.
          </p>

          <div className="pt-2 space-y-3">
            <Link
              to={meetingCode ? `/join/${meetingCode}` : '/'}
              className="w-full py-3.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20"
            >
              <span>Re-join Meeting</span>
            </Link>

            <Link
              to="/"
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition flex items-center justify-center gap-2 border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MeetingRoom
      session={session}
      onLeaveComplete={() => navigate('/')}
    />
  );
};
