namespace AITranslateMeeting.Api.DTOs;

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
    DateTime PurgedAtUtc
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
