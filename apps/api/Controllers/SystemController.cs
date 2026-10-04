using AITranslateMeeting.Api.DTOs;
using AITranslateMeeting.Api.Health;
using AITranslateMeeting.Api.Options;
using AITranslateMeeting.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace AITranslateMeeting.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class SystemController : ControllerBase
{
    private static readonly string[] GlossaryDomains = ["it", "business", "general"];

    private readonly IReadinessEvaluator _readinessEvaluator;
    private readonly IDatabaseCleanupService _databaseCleanupService;
    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _environment;
    private readonly IOptions<DatabaseCleanupOptions> _cleanupOptions;
    private readonly IOptions<LiveKitOptions> _liveKitOptions;
    private readonly IOptions<SubtitleTokenOptions> _subtitleOptions;
    private readonly IOptions<SessionTokenOptions> _sessionOptions;
    private readonly IOptions<AdmissionTokenOptions> _admissionOptions;
    private readonly IOptions<HostSecurityOptions> _hostSecurityOptions;
    private readonly IAuditLogService _auditLogService;
    private readonly ILicenseService _licenseService;
    private readonly ILeadService _leadService;

    public SystemController(
        IReadinessEvaluator readinessEvaluator,
        IDatabaseCleanupService databaseCleanupService,
        IConfiguration configuration,
        IHostEnvironment environment,
        IOptions<DatabaseCleanupOptions> cleanupOptions,
        IOptions<LiveKitOptions> liveKitOptions,
        IOptions<SubtitleTokenOptions> subtitleOptions,
        IOptions<SessionTokenOptions> sessionOptions,
        IOptions<AdmissionTokenOptions> admissionOptions,
        IOptions<HostSecurityOptions> hostSecurityOptions,
        IAuditLogService auditLogService,
        ILicenseService licenseService,
        ILeadService leadService)
    {
        _readinessEvaluator = readinessEvaluator;
        _databaseCleanupService = databaseCleanupService;
        _configuration = configuration;
        _environment = environment;
        _cleanupOptions = cleanupOptions;
        _liveKitOptions = liveKitOptions;
        _subtitleOptions = subtitleOptions;
        _sessionOptions = sessionOptions;
        _admissionOptions = admissionOptions;
        _hostSecurityOptions = hostSecurityOptions;
        _auditLogService = auditLogService;
        _licenseService = licenseService;
        _leadService = leadService;
    }

    [HttpGet("branding")]
    [ProducesResponseType(typeof(BrandingConfigDto), StatusCodes.Status200OK)]
    public ActionResult<BrandingConfigDto> GetBranding()
    {
        return Ok(new BrandingConfigDto(
            BrandName: _configuration["Branding:BrandName"] ?? "ViMeet",
            Slogan: _configuration["Branding:Slogan"] ?? "Nền tảng họp trực tuyến thông minh song ngữ",
            LogoUrl: _configuration["Branding:LogoUrl"],
            PrimaryColor: _configuration["Branding:PrimaryColor"] ?? "#0284c7",
            CopyrightText: _configuration["Branding:CopyrightText"] ?? "© ViMeet"
        ));
    }

    [HttpGet("status")]
    public async Task<ActionResult<SystemStatusResponseDto>> GetStatusAsync(CancellationToken cancellationToken)
    {
        var health = await _readinessEvaluator.EvaluateAsync(cancellationToken);
        var profile = _configuration["DEPLOYMENT_PROFILE"]
            ?? _configuration["PROFILE"]
            ?? "pilot";

        var cleanup = _cleanupOptions.Value;
        var liveKit = _liveKitOptions.Value;
        var subtitle = _subtitleOptions.Value;
        var session = _sessionOptions.Value;
        var admission = _admissionOptions.Value;

        var response = new SystemStatusResponseDto(
            ProductName: "AI Translate Meeting (Private Bilingual Workspace)",
            Version: "1.2.0",
            DeploymentProfile: profile.ToLowerInvariant(),
            Environment: _environment.EnvironmentName,
            DatabaseStatus: health.DatabaseStatus,
            RedisStatus: health.RedisStatus,
            SupportedGlossaryDomains: GlossaryDomains,
            Privacy: new SystemPrivacyContractDto(
                ZeroRawAudioPolicy: true,
                EphemeralAudioOnly: true,
                LocalModelTranscription: true,
                RetentionAutoPurge: cleanup.Enabled
            ),
            Retention: new SystemRetentionInfoDto(
                CleanupEnabled: cleanup.Enabled,
                IntervalHours: cleanup.IntervalHours,
                RetentionHours: cleanup.RetentionHours
            ),
            Security: new SystemSecurityInfoDto(
                ZeroRawAudioPolicy: true,
                LiveKitTokenTtlMinutes: liveKit.TokenTtlMinutes,
                SubtitleTokenTtlMinutes: subtitle.TokenTtlMinutes,
                SessionTokenTtlMinutes: session.TokenTtlMinutes,
                AdmissionHostTokenTtlMinutes: admission.HostTokenTtlMinutes,
                AdmissionInviteTokenTtlMinutes: admission.InviteTokenTtlMinutes,
                RequireHostAuthentication: _hostSecurityOptions.Value.RequireHostAuthentication
            ),
            License: _licenseService.GetCurrentLicense(),
            Timestamp: DateTime.UtcNow
        );

        return Ok(response);
    }

    [HttpGet("license")]
    [ProducesResponseType(typeof(SystemLicenseInfoDto), StatusCodes.Status200OK)]
    public ActionResult<SystemLicenseInfoDto> GetLicense()
    {
        return Ok(_licenseService.GetCurrentLicense());
    }

    [HttpGet("audit")]
    [ProducesResponseType(typeof(IReadOnlyList<AuditEventRecord>), StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<AuditEventRecord>> GetAuditEvents([FromQuery] int limit = 50)
    {
        var clampedLimit = Math.Clamp(limit, 1, 200);
        var events = _auditLogService.GetRecentEvents(clampedLimit);
        return Ok(events);
    }

    [HttpPost("cleanup")]
    public async Task<ActionResult<SystemCleanupResponseDto>> TriggerCleanupAsync(CancellationToken cancellationToken)
    {
        var cleanup = _cleanupOptions.Value;
        var retentionWindow = TimeSpan.FromHours(Math.Max(1, cleanup.RetentionHours));
        var cutoff = DateTime.UtcNow.Subtract(retentionWindow);
        var result = await _databaseCleanupService.CleanupExpiredRecordsAsync(retentionWindow, cancellationToken);

        return Ok(new SystemCleanupResponseDto(
            DeletedAdmissions: result.DeletedAdmissions,
            DeletedSessions: result.DeletedSessions,
            CutoffUtc: cutoff,
            PurgedAtUtc: DateTime.UtcNow,
            EndedGhostMeetings: result.EndedGhostMeetings
        ));
    }

    [HttpPost("lead")]
    [ProducesResponseType(typeof(CreateLeadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CreateLeadResponse>> SubmitLeadAsync(
        [FromBody] CreateLeadRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid Name",
                Detail = "Họ và tên không được để trống.",
                Status = StatusCodes.Status400BadRequest
            });
        }

        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@') || !request.Email.Contains('.'))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid Email",
                Detail = "Email không hợp lệ.",
                Status = StatusCodes.Status400BadRequest
            });
        }

        _auditLogService.LogEvent(
            "EnterpriseLeadCaptured",
            meetingId: null,
            participantId: request.Email.Trim(),
            details: $"Lead: {request.FullName.Trim()} ({request.Company ?? "Individual"}), deployment={request.DeploymentModel ?? "on-premise"}, team={request.TeamSize ?? "unknown"}, lang={request.LanguagePair ?? "unknown"}"
        );

        await _leadService.SubmitLeadAsync(request, cancellationToken);

        return Ok(new CreateLeadResponse(
            Success: true,
            Message: "Yêu cầu tư vấn đã được ghi nhận thành công. Kỹ sư tư vấn sẽ liên hệ lại với bạn trong vòng 2 giờ.",
            SubmittedAtUtc: DateTime.UtcNow
        ));
    }
}
