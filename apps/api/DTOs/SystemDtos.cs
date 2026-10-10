namespace AITranslateMeeting.Api.DTOs;

public sealed record BrandingConfigDto(
    string BrandName,
    string Slogan,
    string? LogoUrl,
    string PrimaryColor,
    string CopyrightText
);

public sealed record SsoProviderDto(
    string Id,
    string Name,
    string Icon,
    bool Enabled,
    string? AuthUrl
);

public sealed record ValidateDomainRequest(string Email);

public sealed record ValidateDomainResponse(
    bool Allowed,
    string? Domain,
    string? OrganizationName
);

public sealed record SystemRetentionInfoDto(
    bool CleanupEnabled,
    int IntervalHours,
    int RetentionHours
);

public sealed record SystemSecurityInfoDto(
    bool ZeroRawAudioPolicy,
    int LiveKitTokenTtlMinutes,
    int SubtitleTokenTtlMinutes,
    int SessionTokenTtlMinutes,
    int AdmissionHostTokenTtlMinutes,
    int AdmissionInviteTokenTtlMinutes,
    bool RequireHostAuthentication = false
);

public sealed record SystemPrivacyContractDto(
    bool ZeroRawAudioPolicy,
    bool EphemeralAudioOnly,
    bool LocalModelTranscription,
    bool RetentionAutoPurge
);

public sealed record SystemLicenseInfoDto(
    string Status,
    string OrganizationName,
    string Tier,
    int MaxConcurrentRooms,
    int MaxParticipantsPerRoom,
    string[] AllowedFeatures,
    DateTime? ExpiresAtUtc,
    int? DaysRemaining
);

public sealed record SystemCleanupResponseDto(
    int DeletedAdmissions,
    int DeletedSessions,
    DateTime CutoffUtc,
    DateTime PurgedAtUtc,
    int EndedGhostMeetings = 0
);

public sealed record SystemStatusResponseDto(
    string ProductName,
    string Version,
    string DeploymentProfile,
    string Environment,
    string DatabaseStatus,
    string RedisStatus,
    string[] SupportedGlossaryDomains,
    SystemPrivacyContractDto Privacy,
    SystemRetentionInfoDto Retention,
    SystemSecurityInfoDto Security,
    SystemLicenseInfoDto License,
    DateTime Timestamp
);

public sealed record CreateLeadRequest(
    string FullName,
    string Email,
    string? Company = null,
    string? TeamSize = null,
    string? LanguagePair = null,
    string? DeploymentModel = null,
    string? Notes = null
);

public sealed record CreateLeadResponse(
    bool Success,
    string Message,
    DateTime SubmittedAtUtc
);

public sealed record EnterpriseLeadRecord(
    Guid Id,
    string FullName,
    string Email,
    string? Company,
    string? TeamSize,
    string? LanguagePair,
    string? DeploymentModel,
    string? Notes,
    DateTime SubmittedAtUtc
);

public sealed record AdminMetricsResponse(
    int ActiveMeetings,
    int TotalOrders,
    int PaidOrders,
    long TotalRevenueVnd,
    int TotalLeads,
    bool TelegramConfigured,
    bool WebhookConfigured,
    DateTime GeneratedAtUtc,
    long TotalTokensUsed = 0,
    long ProTokensUsed = 0,
    bool ZaloConfigured = false
);

public sealed record InfraHealthIndicator(
    string Component,
    string Status,
    string Message,
    double? Value = null,
    string? Unit = null
);

public sealed record InfraMetricsResponse(
    string SystemStatus,
    double ProcessMemoryMb,
    double GcAllocatedMb,
    int ActiveRooms,
    int ActiveParticipants,
    int MaxConcurrentRooms,
    double RoomCapacityPercent,
    string DatabaseStatus,
    string RedisStatus,
    double? RedisLatencyMs,
    IReadOnlyList<InfraHealthIndicator> Indicators,
    IReadOnlyList<string> ActiveAlerts,
    bool TelegramConfigured,
    DateTime TimestampUtc
);

public sealed record TriggerAlertRequest(
    string Severity,
    string? CustomMessage = null
);

public sealed record AdminMeetingDto(
    Guid Id,
    string MeetingCode,
    string RoomName,
    string Name,
    DateTime CreatedAtUtc,
    DateTime? EndedAtUtc,
    int ActiveParticipantsCount,
    int TotalParticipantsCount,
    bool IsActive,
    double DurationMinutes
);

public sealed record AdminMeetingListResponse(
    IReadOnlyList<AdminMeetingDto> Meetings,
    int TotalCount,
    int ActiveCount,
    int EndedCount
);

public sealed record CloseMeetingResponse(
    bool Success,
    string MeetingCode,
    string Message,
    DateTime EndedAtUtc
);

