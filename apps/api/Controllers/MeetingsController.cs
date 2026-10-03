using AITranslateMeeting.Api.DTOs;
using AITranslateMeeting.Api.Options;
using AITranslateMeeting.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace AITranslateMeeting.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MeetingsController : ControllerBase
{
    private readonly IMeetingService _meetingService;
    private readonly IOptions<HostSecurityOptions> _hostSecurityOptions;
    private readonly IAuditLogService _auditLogService;

    public MeetingsController(
        IMeetingService meetingService,
        IOptions<HostSecurityOptions> hostSecurityOptions,
        IAuditLogService auditLogService)
    {
        _meetingService = meetingService;
        _hostSecurityOptions = hostSecurityOptions;
        _auditLogService = auditLogService;
    }

    [HttpPost]
    [EnableRateLimiting("CreateMeeting")]
    [ProducesResponseType(typeof(CreateMeetingResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<CreateMeetingResponseDto>> CreateMeeting(
        [FromBody] CreateMeetingRequestDto request,
        CancellationToken ct)
    {
        var hostSecurity = _hostSecurityOptions.Value;
        if (hostSecurity.RequireHostAuthentication)
        {
            var hostKey = Request.Headers["X-Host-Key"].ToString();
            if (string.IsNullOrWhiteSpace(hostKey) || hostKey != hostSecurity.HostKey)
            {
                return Problem(
                    statusCode: StatusCodes.Status401Unauthorized,
                    title: "Host authentication required",
                    detail: "A valid X-Host-Key header is required to create a meeting on this host.");
            }
        }

        var response = await _meetingService.CreateMeetingAsync(request, ct);
        _auditLogService.LogEvent("MeetingCreated", response.MeetingId.ToString(), null, $"Code={response.MeetingCode} Name={response.Name}");
        return CreatedAtAction(nameof(GetMeeting), new { meetingCode = response.MeetingCode }, response);
    }

    [HttpGet("{meetingCode}")]
    [ProducesResponseType(typeof(MeetingDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MeetingDetailsDto>> GetMeeting(
        [FromRoute] string meetingCode,
        CancellationToken ct)
    {
        var meeting = await _meetingService.GetMeetingAsync(meetingCode, ReadBearerToken(), ct);
        return Ok(meeting);
    }

    [HttpPost("{meetingCode}/join")]
    [EnableRateLimiting("JoinAdmission")]
    [ProducesResponseType(typeof(JoinMeetingResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AdmissionPendingResponseDto), StatusCodes.Status202Accepted)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<JoinMeetingResultDto>> JoinMeeting(
        [FromRoute] string meetingCode,
        [FromBody] JoinMeetingRequestDto request,
        CancellationToken ct)
    {
        var response = await _meetingService.JoinMeetingAsync(meetingCode, request, ct);
        _auditLogService.LogEvent(
            response is AdmissionPendingResponseDto ? "AdmissionPending" : "ParticipantJoined",
            null,
            null,
            $"Code={meetingCode} Lang={request.SpokenLanguage}->{request.TargetLanguage}");
        return response is AdmissionPendingResponseDto ? Accepted(response) : Ok(response);
    }

    [HttpPost("{meetingCode}/invites")]
    [EnableRateLimiting("HostAdmission")]
    [ProducesResponseType(typeof(InviteResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<InviteResponseDto>> CreateInvite(
        [FromRoute] string meetingCode,
        [FromBody] CreateInviteRequestDto request,
        CancellationToken ct)
    {
        var response = await _meetingService.CreateInviteAsync(meetingCode, ReadBearerToken(), request, ct);
        return StatusCode(StatusCodes.Status201Created, response);
    }

    [HttpGet("{meetingCode}/admissions")]
    [EnableRateLimiting("HostAdmission")]
    [ProducesResponseType(typeof(IReadOnlyList<AdmissionRequestDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IReadOnlyList<AdmissionRequestDto>>> GetAdmissions(
        [FromRoute] string meetingCode,
        CancellationToken ct)
    {
        var response = await _meetingService.GetAdmissionsAsync(meetingCode, ReadBearerToken(), ct);
        return Ok(response);
    }

    [HttpPost("{meetingCode}/admissions/{admissionId:guid}/decision")]
    [EnableRateLimiting("HostAdmission")]
    [ProducesResponseType(typeof(AdmissionRequestDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<AdmissionRequestDto>> DecideAdmission(
        [FromRoute] string meetingCode,
        [FromRoute] Guid admissionId,
        [FromBody] AdmissionDecisionRequestDto request,
        CancellationToken ct)
    {
        var response = await _meetingService.DecideAdmissionAsync(
            meetingCode,
            admissionId,
            ReadBearerToken(),
            request,
            ct);
        _auditLogService.LogEvent(
            "AdmissionDecided",
            null,
            null,
            $"Code={meetingCode} AdmissionId={admissionId} Decision={request.Decision}");
        return Ok(response);
    }

    [HttpPost("{meetingCode}/leave")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> LeaveMeeting(
        [FromRoute] string meetingCode,
        [FromBody] LeaveMeetingRequestDto request,
        CancellationToken ct)
    {
        await _meetingService.LeaveMeetingAsync(meetingCode, request, ReadBearerToken(), ct);
        _auditLogService.LogEvent("ParticipantLeft", null, request.ParticipantId.ToString(), $"Code={meetingCode}");
        return NoContent();
    }

    [HttpGet("{meetingCode}/participants")]
    [ProducesResponseType(typeof(IEnumerable<ParticipantDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IEnumerable<ParticipantDto>>> GetParticipants(
        [FromRoute] string meetingCode,
        CancellationToken ct)
    {
        var participants = await _meetingService.GetActiveParticipantsAsync(meetingCode, ReadBearerToken(), ct);
        return Ok(participants);
    }

    private string ReadBearerToken()
    {
        if (Request == null) return string.Empty;
        var authorization = Request.Headers.Authorization.ToString();
        const string prefix = "Bearer ";
        return authorization.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
            ? authorization[prefix.Length..].Trim()
            : string.Empty;
    }
}
