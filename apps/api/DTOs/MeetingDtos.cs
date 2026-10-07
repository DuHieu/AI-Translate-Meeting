using System.ComponentModel.DataAnnotations;

namespace AITranslateMeeting.Api.DTOs;

public sealed record CreateMeetingRequestDto(
    [Required, StringLength(200, MinimumLength = 1)]
    string Name,
    DateTime? ScheduledStartAt = null,
    [Range(5, 480)] int? DurationMinutes = null,
    [StringLength(64)] string? Timezone = null,
    [StringLength(2000)] string? Agenda = null,
    [RegularExpression("^(auto|vi|en|ja|ko|zh|th|id|tl|ar|fr|de|es)$")] string? DefaultSpokenLanguage = null,
    [RegularExpression("^(vi|en|ja|ko|zh|th|id|tl|ar|fr|de|es)$")] string? DefaultTargetLanguage = null,
    [StringLength(64)] string? DomainGlossary = null,
    [EmailAddress, StringLength(254)] string? HostEmail = null
);

public sealed record CreateMeetingResponseDto(
    Guid MeetingId,
    string MeetingCode,
    string RoomName,
    string Name,
    DateTime CreatedAt,
    string HostToken,
    DateTime? ScheduledStartAt = null,
    DateTime? ScheduledEndAt = null,
    string? Timezone = null,
    string? Agenda = null,
    string? DefaultSpokenLanguage = null,
    string? DefaultTargetLanguage = null,
    string? DomainGlossary = null
);

public sealed record RsvpAttendeeDto(
    Guid RsvpId,
    string DisplayName,
    string Status,
    string SpokenLanguage,
    string TargetLanguage,
    DateTime UpdatedAt
);

public sealed record MeetingScheduleDto(
    Guid MeetingId,
    string MeetingCode,
    string Name,
    DateTime CreatedAt,
    DateTime? EndedAt,
    DateTime? ScheduledStartAt,
    DateTime? ScheduledEndAt,
    string Timezone,
    string? Agenda,
    string DefaultSpokenLanguage,
    string DefaultTargetLanguage,
    string DomainGlossary,
    int GoingCount,
    int MaybeCount,
    int DeclinedCount,
    IReadOnlyList<RsvpAttendeeDto> Attendees
);

public sealed record SubmitRsvpRequestDto(
    [Required, StringLength(100, MinimumLength = 1)] string DisplayName,
    [EmailAddress, StringLength(254)] string? Email,
    [Required, RegularExpression("^(going|maybe|declined)$")] string Status,
    [Required, RegularExpression("^(auto|vi|en|ja|ko|zh|th|id|tl|ar|fr|de|es)$")] string SpokenLanguage = "vi",
    [Required, RegularExpression("^(vi|en|ja|ko|zh|th|id|tl|ar|fr|de|es)$")] string TargetLanguage = "ja"
);

public sealed record SubmitRsvpResponseDto(
    Guid RsvpId,
    string MeetingCode,
    string DisplayName,
    string Status,
    string SpokenLanguage,
    string TargetLanguage,
    string? PreApprovedAdmissionToken,
    DateTime? AdmissionExpiresAt
);

public sealed record JoinMeetingRequestDto(
    [Required, StringLength(100, MinimumLength = 1)]
    string DisplayName,

    [Required, RegularExpression("^(auto|vi|en|ja|ko|zh|th|id|tl|ar|fr|de|es)$", ErrorMessage = "Language must be one of: 'auto', 'vi', 'en', 'ja', 'ko', 'zh', 'th', 'id', 'tl', 'ar', 'fr', 'de', 'es'")]
    string SpokenLanguage,

    [Required, RegularExpression("^(vi|en|ja|ko|zh|th|id|tl|ar|fr|de|es)$", ErrorMessage = "Language must be one of: 'vi', 'en', 'ja', 'ko', 'zh', 'th', 'id', 'tl', 'ar', 'fr', 'de', 'es'")]
    string TargetLanguage,

    [StringLength(4096)] string? AdmissionToken = null
);

public abstract record JoinMeetingResultDto;

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
    string SubtitleToken,
    string Role,
    DateTime JoinedAt,
    string SessionToken = ""
) : JoinMeetingResultDto;

public sealed record AdmissionPendingResponseDto(
    Guid MeetingId,
    string MeetingCode,
    Guid AdmissionId,
    string Status,
    string AdmissionToken,
    DateTime ExpiresAt
) : JoinMeetingResultDto;

public sealed record CreateInviteRequestDto(
    [Range(1, 60)] int? TtlMinutes = null
);

public sealed record InviteResponseDto(
    Guid AdmissionId,
    string Role,
    string Token,
    DateTime ExpiresAt
);

public sealed record AdmissionRequestDto(
    Guid AdmissionId,
    string Status,
    string Role,
    string DisplayName,
    string SpokenLanguage,
    string TargetLanguage,
    DateTime CreatedAt,
    DateTime ExpiresAt
);

public sealed record AdmissionDecisionRequestDto(
    [Required, RegularExpression("^(approved|rejected)$")]
    string Decision
);

public sealed record LeaveMeetingRequestDto(
    [Required]
    Guid ParticipantId
);

public sealed record UpdateSubtitlePreferencesRequestDto(
    [Required, RegularExpression("^(vi|en|ja|ko|zh|th|id|tl|ar|fr|de|es)$", ErrorMessage = "Language must be one of: 'vi', 'en', 'ja', 'ko', 'zh', 'th', 'id', 'tl', 'ar', 'fr', 'de', 'es'")]
    string TargetLanguage
);

public sealed record UpdateSubtitlePreferencesResponseDto(
    string TargetLanguage,
    string SubtitleToken
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

public sealed record ActionItemDto(
    string Task,
    string? Owner,
    string? Deadline,
    string? Priority
);

public sealed record SaveMeetingMinutesRequest(
    [Required, StringLength(200, MinimumLength = 1)]
    string Title,

    [Required, StringLength(10000, MinimumLength = 1)]
    string Summary,

    [Required]
    string MarkdownContent,

    List<string>? Decisions,
    List<ActionItemDto>? ActionItems
);

public sealed record MeetingMinutesResponse(
    Guid Id,
    string MeetingCode,
    string Title,
    string Summary,
    string MarkdownContent,
    List<string> Decisions,
    List<ActionItemDto> ActionItems,
    DateTime CreatedAt
);

public sealed record SubmitMeetingFeedbackRequestDto(
    [Range(1, 5)] int Rating,
    [StringLength(50)] string? Category,
    [Required, StringLength(2000, MinimumLength = 1)] string Comment,
    [StringLength(100)] string? UserName = null,
    [EmailAddress, StringLength(254)] string? UserEmail = null
);

public sealed record MeetingFeedbackResponseDto(
    Guid Id,
    string MeetingCode,
    int Rating,
    string? Category,
    string Comment,
    string? UserName,
    string? UserEmail,
    DateTime CreatedAt
);

public sealed record MeetingHistoryItemDto(
    Guid MeetingId,
    string MeetingCode,
    string Name,
    DateTime CreatedAt,
    DateTime? EndedAt,
    bool HasMinutes,
    string? Title,
    string? SummaryExcerpt,
    int ParticipantCount
);
