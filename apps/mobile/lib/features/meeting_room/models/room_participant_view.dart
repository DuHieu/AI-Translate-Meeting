import 'package:livekit_client/livekit_client.dart' as lk;

/// UI-facing participant snapshot for the video grid.
class RoomParticipantView {
  const RoomParticipantView({
    required this.sid,
    required this.identity,
    required this.displayName,
    required this.isLocal,
    required this.isMicMuted,
    required this.isCameraEnabled,
    required this.isSpeaking,
    this.videoTrack,
  });

  final String sid;
  final String identity;
  final String displayName;
  final bool isLocal;
  final bool isMicMuted;
  final bool isCameraEnabled;
  final bool isSpeaking;
  final lk.VideoTrack? videoTrack;

  RoomParticipantView copyWith({
    String? sid,
    String? identity,
    String? displayName,
    bool? isLocal,
    bool? isMicMuted,
    bool? isCameraEnabled,
    bool? isSpeaking,
    lk.VideoTrack? videoTrack,
    bool clearVideoTrack = false,
  }) {
    return RoomParticipantView(
      sid: sid ?? this.sid,
      identity: identity ?? this.identity,
      displayName: displayName ?? this.displayName,
      isLocal: isLocal ?? this.isLocal,
      isMicMuted: isMicMuted ?? this.isMicMuted,
      isCameraEnabled: isCameraEnabled ?? this.isCameraEnabled,
      isSpeaking: isSpeaking ?? this.isSpeaking,
      videoTrack: clearVideoTrack ? null : (videoTrack ?? this.videoTrack),
    );
  }
}
