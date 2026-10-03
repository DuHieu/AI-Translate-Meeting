using AITranslateMeeting.Api.DTOs;
using AITranslateMeeting.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AITranslateMeeting.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ParticipantsController : ControllerBase
{
    private readonly IMeetingService _meetingService;

    public ParticipantsController(IMeetingService meetingService)
    {
        _meetingService = meetingService;
    }

    [HttpGet("meeting/{meetingCode}")]
    [ProducesResponseType(typeof(IEnumerable<ParticipantDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IEnumerable<ParticipantDto>>> GetParticipantsByMeeting(
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
