import React, { useEffect, useState, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MeetingRoom } from '../components/meeting/MeetingRoom';
import { LeftMeetingScreen } from '../components/meeting/LeftMeetingScreen';
import { meetingStorage } from '../utils/meetingStorage';
import { MeetingSessionData } from '../types/meeting';

const PreJoinPage = lazy(() => import('./PreJoinPage').then((module) => ({ default: module.PreJoinPage })));

export const MeetingPage: React.FC = () => {
  const { meetingCode } = useParams<{ meetingCode: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<MeetingSessionData | null>(() => {
    if (!meetingCode) return null;
    const saved = meetingStorage.getSession(meetingCode);
    return saved && saved.token && saved.liveKitUrl ? saved : null;
  });
  const [hasLeftMeeting, setHasLeftMeeting] = useState(false);

  useEffect(() => {
    if (!meetingCode) {
      setSession(null);
      return;
    }
    const savedSession = meetingStorage.getSession(meetingCode);
    if (savedSession && savedSession.token && savedSession.liveKitUrl) {
      setSession(savedSession);
    } else {
      setSession(null);
    }
    setHasLeftMeeting(false);
  }, [meetingCode]);

  if (!meetingCode) {
    navigate('/', { replace: true });
    return null;
  }

  if (hasLeftMeeting) {
    return (
      <LeftMeetingScreen
        meetingCode={meetingCode}
        onRejoin={() => {
          meetingStorage.clearSession(meetingCode);
          setSession(null);
          setHasLeftMeeting(false);
        }}
        onGoHome={() => navigate('/')}
      />
    );
  }

  if (!session) {
    return (
      <PreJoinPage
        onJoined={(newSession) => {
          setSession(newSession);
          setHasLeftMeeting(false);
        }}
      />
    );
  }

  return (
    <MeetingRoom
      session={session}
      onLeaveComplete={() => setHasLeftMeeting(true)}
    />
  );
};
