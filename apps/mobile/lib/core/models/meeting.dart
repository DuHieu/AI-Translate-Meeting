import 'package:freezed_annotation/freezed_annotation.dart';

part 'meeting.freezed.dart';
part 'meeting.g.dart';

/// Meeting model representing a video conference room
@freezed
class Meeting with _$Meeting {
  const factory Meeting({
    required String meetingId,
    required String meetingCode,
    required String name,
    required bool isActive,
    DateTime? createdAt,
    DateTime? scheduledAt,
  }) = _Meeting;

  factory Meeting.fromJson(Map<String, dynamic> json) =>
      _$MeetingFromJson(json);
}

/// Detailed meeting information with participant count
@freezed
class MeetingDetails with _$MeetingDetails {
  const factory MeetingDetails({
    required String meetingId,
    required String meetingCode,
    required String name,
    required bool isActive,
    required int participantCount,
    DateTime? createdAt,
    DateTime? scheduledAt,
    String? description,
  }) = _MeetingDetails;

  factory MeetingDetails.fromJson(Map<String, dynamic> json) =>
      _$MeetingDetailsFromJson(json);
}

/// Response after successfully joining a meeting
@freezed
class JoinResponse with _$JoinResponse {
  const factory JoinResponse({
    required String livekitUrl,
    required String livekitToken,
    required String sessionToken,
    required String subtitleToken,
    required String participantId,
    String? roomName,
  }) = _JoinResponse;

  factory JoinResponse.fromJson(Map<String, dynamic> json) =>
      _$JoinResponseFromJson(json);
}

/// Request payload for joining a meeting
@freezed
class JoinRequest with _$JoinRequest {
  const factory JoinRequest({
    required String displayName,
    required String spokenLanguage,
    required String targetLanguage,
    @Default(false) bool videoEnabled,
    @Default(true) bool audioEnabled,
  }) = _JoinRequest;

  factory JoinRequest.fromJson(Map<String, dynamic> json) =>
      _$JoinRequestFromJson(json);

  const JoinRequest._();

  Map<String, dynamic> toJson() => {
        'displayName': displayName,
        'spokenLanguage': spokenLanguage,
        'targetLanguage': targetLanguage,
        'videoEnabled': videoEnabled,
        'audioEnabled': audioEnabled,
      };
}
