using System.ComponentModel.DataAnnotations;

namespace AITranslateMeeting.Api.DTOs;

public sealed record CreateMeetingRequestDto(
    [Required, StringLength(200, MinimumLength = 1)]
    string Name
);

public sealed record CreateMeetingResponseDto(
    Guid MeetingId,
    string MeetingCode,
    string RoomName,
    string Name,
    DateTime CreatedAt
);

public sealed record JoinMeetingRequestDto(
    [Required, StringLength(100, MinimumLength = 1)]
    string DisplayName,

    [Required, RegularExpression("^(vi|en|ja)$", ErrorMessage = "Language must be 'vi', 'en', or 'ja'")]
    string SpokenLanguage,

    [Required, RegularExpression("^(vi|en|ja)$", ErrorMessage = "Language must be 'vi', 'en', or 'ja'")]
    string TargetLanguage
);

public sealed record JoinMeetingResponseDto(
    Guid MeetingId,
    string MeetingCode,
    Guid ParticipantId,
    string Identity,
    string DisplayName,
    string SpokenLanguage,
    string TargetLanguage,
    string LiveKitUrl,
    string Token,
    DateTime JoinedAt
);

public sealed record LeaveMeetingRequestDto(
    [Required]
    Guid ParticipantId
);

public sealed record ParticipantDto(
    Guid ParticipantId,
    string Identity,
    string DisplayName,
    string SpokenLanguage,
    string TargetLanguage,
    DateTime JoinedAt
);

public sealed record MeetingDetailsDto(
    Guid MeetingId,
    string MeetingCode,
    string RoomName,
    string Name,
    DateTime CreatedAt,
    DateTime? EndedAt
);
