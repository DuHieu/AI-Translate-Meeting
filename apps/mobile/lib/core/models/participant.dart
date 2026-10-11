/// Participant in a meeting room
class Participant {
  const Participant({
    required this.participantId,
    required this.displayName,
    required this.isLocal,
    this.isMicrophoneMuted = false,
    this.isCameraEnabled = false,
    this.isSpeaking = false,
    this.spokenLanguage,
    this.targetLanguage,
    this.joinedAt,
    this.identity,
  });

  final String participantId;
  final String displayName;
  final bool isLocal;
  final bool isMicrophoneMuted;
  final bool isCameraEnabled;
  final bool isSpeaking;
  final String? spokenLanguage;
  final String? targetLanguage;
  final DateTime? joinedAt;
  final String? identity;

  factory Participant.fromJson(Map<String, dynamic> json) {
    return Participant(
      participantId: json['participantId']?.toString() ?? '',
      displayName: json['displayName'] as String? ?? '',
      identity: json['identity'] as String?,
      isLocal: json['isLocal'] as bool? ?? false,
      isMicrophoneMuted: json['isMicrophoneMuted'] as bool? ?? false,
      isCameraEnabled: json['isCameraEnabled'] as bool? ?? false,
      isSpeaking: json['isSpeaking'] as bool? ?? false,
      spokenLanguage: json['spokenLanguage'] as String?,
      targetLanguage: json['targetLanguage'] as String?,
      joinedAt: json['joinedAt'] != null
          ? DateTime.tryParse(json['joinedAt'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'participantId': participantId,
        'displayName': displayName,
        'identity': identity,
        'isLocal': isLocal,
        'isMicrophoneMuted': isMicrophoneMuted,
        'isCameraEnabled': isCameraEnabled,
        'isSpeaking': isSpeaking,
        'spokenLanguage': spokenLanguage,
        'targetLanguage': targetLanguage,
        'joinedAt': joinedAt?.toIso8601String(),
      };

  Participant copyWith({
    String? participantId,
    String? displayName,
    bool? isLocal,
    bool? isMicrophoneMuted,
    bool? isCameraEnabled,
    bool? isSpeaking,
    String? spokenLanguage,
    String? targetLanguage,
    DateTime? joinedAt,
    String? identity,
  }) {
    return Participant(
      participantId: participantId ?? this.participantId,
      displayName: displayName ?? this.displayName,
      isLocal: isLocal ?? this.isLocal,
      isMicrophoneMuted: isMicrophoneMuted ?? this.isMicrophoneMuted,
      isCameraEnabled: isCameraEnabled ?? this.isCameraEnabled,
      isSpeaking: isSpeaking ?? this.isSpeaking,
      spokenLanguage: spokenLanguage ?? this.spokenLanguage,
      targetLanguage: targetLanguage ?? this.targetLanguage,
      joinedAt: joinedAt ?? this.joinedAt,
      identity: identity ?? this.identity,
    );
  }
}

/// Connection quality levels
enum ConnectionQuality {
  excellent,
  good,
  poor,
  unknown,
}

/// Participant with connection state
class ParticipantState {
  const ParticipantState({
    required this.participant,
    this.connectionQuality = ConnectionQuality.unknown,
    this.audioLevel = 0,
    this.lastError,
  });

  final Participant participant;
  final ConnectionQuality connectionQuality;
  final int audioLevel;
  final String? lastError;

  factory ParticipantState.fromJson(Map<String, dynamic> json) {
    return ParticipantState(
      participant: Participant.fromJson(
        json['participant'] as Map<String, dynamic>? ?? const {},
      ),
      connectionQuality: ConnectionQuality.values.firstWhere(
        (value) => value.name == json['connectionQuality'],
        orElse: () => ConnectionQuality.unknown,
      ),
      audioLevel: (json['audioLevel'] as num?)?.toInt() ?? 0,
      lastError: json['lastError'] as String?,
    );
  }
}
