using AITranslateMeeting.Api.DTOs;
using AITranslateMeeting.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AITranslateMeeting.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MeetingsController : ControllerBase
{
    private readonly IMeetingService _meetingService;

    public MeetingsController(IMeetingService meetingService)
    {
        _meetingService = meetingService;
    }

    [HttpPost]
    [ProducesResponseType(typeof(CreateMeetingResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CreateMeetingResponseDto>> CreateMeeting(
        [FromBody] CreateMeetingRequestDto request,
        CancellationToken ct)
    {
        var response = await _meetingService.CreateMeetingAsync(request, ct);
        return CreatedAtAction(nameof(GetMeeting), new { meetingCode = response.MeetingCode }, response);
    }

    [HttpGet("{meetingCode}")]
    [ProducesResponseType(typeof(MeetingDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MeetingDetailsDto>> GetMeeting(
        [FromRoute] string meetingCode,
        CancellationToken ct)
    {
        var meeting = await _meetingService.GetMeetingAsync(meetingCode, ct);
        return Ok(meeting);
    }

    [HttpPost("{meetingCode}/join")]
    [ProducesResponseType(typeof(JoinMeetingResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<JoinMeetingResponseDto>> JoinMeeting(
        [FromRoute] string meetingCode,
        [FromBody] JoinMeetingRequestDto request,
        CancellationToken ct)
    {
        var response = await _meetingService.JoinMeetingAsync(meetingCode, request, ct);
        return Ok(response);
    }

    [HttpPost("{meetingCode}/leave")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> LeaveMeeting(
        [FromRoute] string meetingCode,
        [FromBody] LeaveMeetingRequestDto request,
        CancellationToken ct)
    {
        await _meetingService.LeaveMeetingAsync(meetingCode, request, ct);
        return NoContent();
    }

    [HttpGet("{meetingCode}/participants")]
    [ProducesResponseType(typeof(IEnumerable<ParticipantDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IEnumerable<ParticipantDto>>> GetParticipants(
        [FromRoute] string meetingCode,
        CancellationToken ct)
    {
        var participants = await _meetingService.GetActiveParticipantsAsync(meetingCode, ct);
        return Ok(participants);
    }
}
