import 'package:freezed_annotation/freezed_annotation.dart';

part 'participant.freezed.dart';
part 'participant.g.dart';

/// Participant in a meeting room
@freezed
class Participant with _$Participant {
  const factory Participant({
    required String participantId,
    required String displayName,
    required bool isLocal,
    @Default(false) bool isMicrophoneMuted,
    @Default(false) bool isCameraEnabled,
    @Default(false) bool isSpeaking,
    String? spokenLanguage,
    String? targetLanguage,
    DateTime? joinedAt,
  }) = _Participant;

  factory Participant.fromJson(Map<String, dynamic> json) =>
      _$ParticipantFromJson(json);
}

/// Participant with connection state
@freezed
class ParticipantState with _$ParticipantState {
  const factory ParticipantState({
    required Participant participant,
    @Default(ConnectionQuality.unknown) ConnectionQuality connectionQuality,
    @Default(0) int audioLevel,
    String? lastError,
  }) = _ParticipantState;

  factory ParticipantState.fromJson(Map<String, dynamic> json) =>
      _$ParticipantStateFromJson(json);
}

/// Connection quality levels
enum ConnectionQuality {
  excellent,
  good,
  poor,
  unknown,
}
