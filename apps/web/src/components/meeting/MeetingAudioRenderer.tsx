import React, { useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent, Track, RemoteTrack, TrackPublication, RemoteParticipant } from 'livekit-client';

/**
 * Pure, reliable Audio Renderer for LiveKit remote participants.
 * Directly attaches RemoteAudioTracks to HTMLAudioElement without using `useTracks`
 * or `@livekit/components-core` visual stable pagination (eliminating updatePages bugs).
 */
export const MeetingAudioRenderer: React.FC = () => {
  const room = useRoomContext();

  useEffect(() => {
    if (!room) return;

    const attachedElements = new Map<string, HTMLMediaElement>();

    const attachAudioTrack = (track: RemoteTrack) => {
      if (track.kind !== Track.Kind.Audio) return;
      const trackKey = track.sid || track.mediaStreamTrack?.id || 'unknown-audio';
      if (attachedElements.has(trackKey)) return;

      const element = track.attach();
      element.style.display = 'none';
      attachedElements.set(trackKey, element);

      track.once('ended', () => {
        element.remove();
        attachedElements.delete(trackKey);
      });
    };

    const detachAudioTrack = (track: RemoteTrack) => {
      const trackKey = track.sid || track.mediaStreamTrack?.id || '';
      const element = attachedElements.get(trackKey);
      if (element) {
        track.detach(element);
        element.remove();
        attachedElements.delete(trackKey);
      }
    };

    const handleTrackSubscribed = (track: RemoteTrack, _pub: TrackPublication, _participant: RemoteParticipant) => {
      attachAudioTrack(track);
    };

    const handleTrackUnsubscribed = (track: RemoteTrack, _pub: TrackPublication, _participant: RemoteParticipant) => {
      detachAudioTrack(track);
    };

    // Attach any existing audio tracks from currently connected remote participants
    room.remoteParticipants.forEach((participant) => {
      participant.audioTrackPublications.forEach((pub) => {
        if (pub.track) {
          attachAudioTrack(pub.track as RemoteTrack);
        }
      });
    });

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

      attachedElements.forEach((element) => {
        element.remove();
      });
      attachedElements.clear();
    };
  }, [room]);

  return null;
};
