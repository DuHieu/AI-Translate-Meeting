/// Meeting model representing a video conference room
class Meeting {
  const Meeting({
    required this.meetingId,
    required this.meetingCode,
    required this.name,
    required this.isActive,
    this.createdAt,
    this.scheduledAt,
  });

  final String meetingId;
  final String meetingCode;
  final String name;
  final bool isActive;
  final DateTime? createdAt;
  final DateTime? scheduledAt;

  factory Meeting.fromJson(Map<String, dynamic> json) {
    return Meeting(
      meetingId: json['meetingId']?.toString() ?? '',
      meetingCode: (json['meetingCode'] as String? ?? '').toUpperCase(),
      name: json['name'] as String? ?? '',
      isActive: json['endedAt'] == null,
      createdAt: _parseDate(json['createdAt']),
      scheduledAt: _parseDate(json['scheduledStartAt'] ?? json['scheduledAt']),
    );
  }

  Map<String, dynamic> toJson() => {
        'meetingId': meetingId,
        'meetingCode': meetingCode,
        'name': name,
        'isActive': isActive,
        'createdAt': createdAt?.toIso8601String(),
        'scheduledAt': scheduledAt?.toIso8601String(),
      };
}

/// Detailed meeting information from GET /api/meetings/{code}
class MeetingDetails {
  const MeetingDetails({
    required this.meetingId,
    required this.meetingCode,
    required this.name,
    required this.isActive,
    this.roomName,
    this.participantCount = 0,
    this.createdAt,
    this.endedAt,
    this.description,
  });

  final String meetingId;
  final String meetingCode;
  final String name;
  final bool isActive;
  final String? roomName;
  final int participantCount;
  final DateTime? createdAt;
  final DateTime? endedAt;
  final String? description;

  factory MeetingDetails.fromJson(Map<String, dynamic> json) {
    final endedAt = _parseDate(json['endedAt']);
    return MeetingDetails(
      meetingId: json['meetingId']?.toString() ?? '',
      meetingCode: (json['meetingCode'] as String? ?? '').toUpperCase(),
      name: json['name'] as String? ?? '',
      roomName: json['roomName'] as String?,
      isActive: endedAt == null,
      participantCount: (json['participantCount'] as num?)?.toInt() ?? 0,
      createdAt: _parseDate(json['createdAt']),
      endedAt: endedAt,
      description: json['description'] as String? ?? json['agenda'] as String?,
    );
  }

  /// Build details from a create-meeting response payload.
  factory MeetingDetails.fromCreateResponse(CreateMeetingResponse response) {
    return MeetingDetails(
      meetingId: response.meetingId,
      meetingCode: response.meetingCode,
      name: response.name,
      roomName: response.roomName,
      isActive: true,
      createdAt: response.createdAt,
    );
  }

  Map<String, dynamic> toJson() => {
        'meetingId': meetingId,
        'meetingCode': meetingCode,
        'name': name,
        'roomName': roomName,
        'isActive': isActive,
        'participantCount': participantCount,
        'createdAt': createdAt?.toIso8601String(),
        'endedAt': endedAt?.toIso8601String(),
        'description': description,
      };
}

/// Response after successfully creating a meeting
class CreateMeetingResponse {
  const CreateMeetingResponse({
    required this.meetingId,
    required this.meetingCode,
    required this.roomName,
    required this.name,
    required this.createdAt,
    required this.hostToken,
  });

  final String meetingId;
  final String meetingCode;
  final String roomName;
  final String name;
  final DateTime createdAt;
  final String hostToken;

  factory CreateMeetingResponse.fromJson(Map<String, dynamic> json) {
    return CreateMeetingResponse(
      meetingId: json['meetingId']?.toString() ?? '',
      meetingCode: (json['meetingCode'] as String? ?? '').toUpperCase(),
      roomName: json['roomName'] as String? ?? '',
      name: json['name'] as String? ?? '',
      createdAt: _parseDate(json['createdAt']) ?? DateTime.now().toUtc(),
      hostToken: json['hostToken'] as String? ?? '',
    );
  }
}

/// Response after successfully joining a meeting
class JoinResponse {
  const JoinResponse({
    required this.livekitUrl,
    required this.livekitToken,
    required this.sessionToken,
    required this.subtitleToken,
    required this.participantId,
    this.roomName,
    this.meetingCode,
  });

  final String livekitUrl;
  final String livekitToken;
  final String sessionToken;
  final String subtitleToken;
  final String participantId;
  final String? roomName;
  final String? meetingCode;

  factory JoinResponse.fromJson(Map<String, dynamic> json) {
    // Backend uses liveKitUrl + token; keep aliases for forward compatibility.
    final url = (json['livekitUrl'] ?? json['liveKitUrl']) as String? ?? '';
    final token = (json['livekitToken'] ?? json['token']) as String? ?? '';
    return JoinResponse(
      livekitUrl: url,
      livekitToken: token,
      sessionToken: json['sessionToken'] as String? ?? '',
      subtitleToken: json['subtitleToken'] as String? ?? '',
      participantId: json['participantId']?.toString() ?? '',
      roomName: json['roomName'] as String?,
      meetingCode: (json['meetingCode'] as String?)?.toUpperCase(),
    );
  }

  Map<String, dynamic> toJson() => {
        'livekitUrl': livekitUrl,
        'livekitToken': livekitToken,
        'sessionToken': sessionToken,
        'subtitleToken': subtitleToken,
        'participantId': participantId,
        'roomName': roomName,
        'meetingCode': meetingCode,
      };
}

/// Request payload for joining a meeting
class JoinRequest {
  const JoinRequest({
    required this.displayName,
    required this.spokenLanguage,
    required this.targetLanguage,
    this.admissionToken,
  });

  final String displayName;
  final String spokenLanguage;
  final String targetLanguage;
  final String? admissionToken;

  factory JoinRequest.fromJson(Map<String, dynamic> json) {
    return JoinRequest(
      displayName: json['displayName'] as String? ?? '',
      spokenLanguage: json['spokenLanguage'] as String? ?? 'vi',
      targetLanguage: json['targetLanguage'] as String? ?? 'en',
      admissionToken: json['admissionToken'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'displayName': displayName,
      'spokenLanguage': spokenLanguage,
      'targetLanguage': targetLanguage,
    };
    if (admissionToken != null && admissionToken!.isNotEmpty) {
      map['admissionToken'] = admissionToken;
    }
    return map;
  }
}

/// Recently joined meeting for home-screen history
class RecentMeeting {
  const RecentMeeting({
    required this.meetingCode,
    required this.name,
    required this.joinedAt,
  });

  final String meetingCode;
  final String name;
  final DateTime joinedAt;

  factory RecentMeeting.fromJson(Map<String, dynamic> json) {
    return RecentMeeting(
      meetingCode: (json['meetingCode'] as String? ?? '').toUpperCase(),
      name: json['name'] as String? ?? '',
      joinedAt: _parseDate(json['joinedAt']) ?? DateTime.now().toUtc(),
    );
  }

  Map<String, dynamic> toJson() => {
        'meetingCode': meetingCode,
        'name': name,
        'joinedAt': joinedAt.toIso8601String(),
      };
}

DateTime? _parseDate(dynamic value) {
  if (value == null) return null;
  if (value is DateTime) return value;
  if (value is String && value.isNotEmpty) {
    return DateTime.tryParse(value);
  }
  return null;
}
