using AITranslateMeeting.Api.Controllers;
using AITranslateMeeting.Api.DTOs;
using AITranslateMeeting.Api.Options;
using AITranslateMeeting.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace AITranslateMeeting.Api.Tests;

public class MeetingsControllerTests
{
    private readonly Mock<IMeetingService> _mockMeetingService;
    private readonly Mock<IAuditLogService> _mockAuditLogService;
    private readonly MeetingsController _controller;

    public MeetingsControllerTests()
    {
        _mockMeetingService = new Mock<IMeetingService>();
        _mockAuditLogService = new Mock<IAuditLogService>();
        var hostSecurity = Microsoft.Extensions.Options.Options.Create(new HostSecurityOptions { RequireHostAuthentication = false });
        _controller = new MeetingsController(
            _mockMeetingService.Object,
            hostSecurity,
            _mockAuditLogService.Object);
    }

    [Fact]
    public async Task CreateMeeting_WhenHostAuthenticationRequired_RejectsWithoutValidKey()
    {
        var options = Microsoft.Extensions.Options.Options.Create(new HostSecurityOptions
        {
            RequireHostAuthentication = true,
            HostKey = "secure-host-secret-12345"
        });
        var controller = new MeetingsController(
            _mockMeetingService.Object,
            options,
            _mockAuditLogService.Object)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };

        var request = new CreateMeetingRequestDto("Confidential Meeting");
        var result = await controller.CreateMeeting(request, CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status401Unauthorized, problem.StatusCode);
    }

    [Fact]
    public async Task CreateMeeting_WhenHostAuthenticationRequired_AcceptsMatchingKey()
    {
        var options = Microsoft.Extensions.Options.Options.Create(new HostSecurityOptions
        {
            RequireHostAuthentication = true,
            HostKey = "secure-host-secret-12345"
        });
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-Host-Key"] = "secure-host-secret-12345";

        var controller = new MeetingsController(
            _mockMeetingService.Object,
            options,
            _mockAuditLogService.Object)
        {
            ControllerContext = new ControllerContext { HttpContext = httpContext }
        };

        var request = new CreateMeetingRequestDto("Confidential Meeting");
        _mockMeetingService
            .Setup(s => s.CreateMeetingAsync(request, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CreateMeetingResponseDto(Guid.NewGuid(), "SEC001", "room_SEC001", "Confidential Meeting", DateTime.UtcNow, "TOKEN"));

        var result = await controller.CreateMeeting(request, CancellationToken.None);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(StatusCodes.Status201Created, created.StatusCode);
    }

    [Fact]
    public async Task CreateMeeting_ReturnsCreatedAtAction_WithMeeting()
    {
        // Arrange
        var request = new CreateMeetingRequestDto("Sprint Review");
        var expectedResponse = new CreateMeetingResponseDto(
            Guid.NewGuid(),
            "REV123",
            "meeting_REV123",
            "Sprint Review",
            DateTime.UtcNow,
            "HOST_TOKEN"
        );

        _mockMeetingService
            .Setup(s => s.CreateMeetingAsync(request, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedResponse);

        // Act
        var result = await _controller.CreateMeeting(request, CancellationToken.None);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(nameof(MeetingsController.GetMeeting), createdResult.ActionName);
        var returnedDto = Assert.IsType<CreateMeetingResponseDto>(createdResult.Value);
        Assert.Equal("REV123", returnedDto.MeetingCode);
        Assert.Equal("Sprint Review", returnedDto.Name);
    }

    [Fact]
    public async Task GetMeeting_ReturnsOk_WithMeetingDetails()
    {
        // Arrange
        var meetingCode = "ABCXYZ";
        var expectedDetails = new MeetingDetailsDto(
            Guid.NewGuid(),
            meetingCode,
            "meeting_ABCXYZ",
            "Tech Sync",
            DateTime.UtcNow,
            null
        );

        _mockMeetingService
            .Setup(s => s.GetMeetingAsync(meetingCode, It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedDetails);

        // Act
        var result = await _controller.GetMeeting(meetingCode, CancellationToken.None);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returnedDto = Assert.IsType<MeetingDetailsDto>(okResult.Value);
        Assert.Equal(meetingCode, returnedDto.MeetingCode);
        Assert.Equal("Tech Sync", returnedDto.Name);
    }

    [Fact]
    public async Task JoinMeeting_ReturnsOk_WithJoinResponse()
    {
        // Arrange
        var meetingCode = "ABCXYZ";
        var request = new JoinMeetingRequestDto("Hieu", "vi", "ja");
        var expectedResponse = new JoinMeetingResponseDto(
            Guid.NewGuid(),
            meetingCode,
            Guid.NewGuid(),
            "p_identity123",
            "Hieu",
            "vi",
            "ja",
            "ws://127.0.0.1:7880",
            "MOCK_JWT_TOKEN",
            "MOCK_SUBTITLE_TOKEN",
            "participant",
            DateTime.UtcNow
        );

        _mockMeetingService
            .Setup(s => s.JoinMeetingAsync(meetingCode, request, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedResponse);

        // Act
        var result = await _controller.JoinMeeting(meetingCode, request, CancellationToken.None);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returnedDto = Assert.IsType<JoinMeetingResponseDto>(okResult.Value);
        Assert.Equal("MOCK_JWT_TOKEN", returnedDto.Token);
        Assert.Equal("MOCK_SUBTITLE_TOKEN", returnedDto.SubtitleToken);
        Assert.Equal("Hieu", returnedDto.DisplayName);
    }

    [Fact]
    public async Task JoinMeeting_WithCodeOnly_ReturnsAcceptedPending()
    {
        var meetingCode = "WAIT01";
        var request = new JoinMeetingRequestDto("Guest", "en", "vi");
        var pending = new AdmissionPendingResponseDto(
            Guid.NewGuid(),
            meetingCode,
            Guid.NewGuid(),
            "pending",
            "PENDING_TOKEN",
            DateTime.UtcNow.AddMinutes(15));
        _mockMeetingService
            .Setup(service => service.JoinMeetingAsync(meetingCode, request, It.IsAny<CancellationToken>()))
            .ReturnsAsync(pending);

        var result = await _controller.JoinMeeting(meetingCode, request, CancellationToken.None);

        var accepted = Assert.IsType<AcceptedResult>(result.Result);
        Assert.Same(pending, accepted.Value);
    }

    [Fact]
    public async Task LeaveMeeting_ReturnsNoContent()
    {
        // Arrange
        var meetingCode = "ABCXYZ";
        var participantId = Guid.NewGuid();
        var request = new LeaveMeetingRequestDto(participantId);

        _mockMeetingService
            .Setup(s => s.LeaveMeetingAsync(meetingCode, request, It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _controller.LeaveMeeting(meetingCode, request, CancellationToken.None);

        // Assert
        Assert.IsType<NoContentResult>(result);
        _mockMeetingService.Verify(s => s.LeaveMeetingAsync(meetingCode, request, It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task EndMeeting_ReturnsNoContent()
    {
        // Arrange
        var meetingCode = "ABCXYZ";

        _mockMeetingService
            .Setup(s => s.EndMeetingAsync(meetingCode, It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _controller.EndMeeting(meetingCode, CancellationToken.None);

        // Assert
        Assert.IsType<NoContentResult>(result);
        _mockMeetingService.Verify(s => s.EndMeetingAsync(meetingCode, It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetParticipants_ReturnsOk_WithParticipantList()
    {
        // Arrange
        var meetingCode = "ABCXYZ";
        var participants = new List<ParticipantDto>
        {
            new ParticipantDto(Guid.NewGuid(), "p_1", "Alice", "en", "vi", DateTime.UtcNow),
            new ParticipantDto(Guid.NewGuid(), "p_2", "Bob", "vi", "en", DateTime.UtcNow)
        };

        _mockMeetingService
            .Setup(s => s.GetActiveParticipantsAsync(meetingCode, It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(participants);

        // Act
        var result = await _controller.GetParticipants(meetingCode, CancellationToken.None);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returnedList = Assert.IsAssignableFrom<IEnumerable<ParticipantDto>>(okResult.Value);
        Assert.Equal(2, returnedList.Count());
    }

    [Fact]
    public async Task UpdateSubtitlePreferences_UsesBearerSessionAndReturnsRefreshedToken()
    {
        var context = new DefaultHttpContext();
        context.Request.Headers.Authorization = "Bearer SESSION_TOKEN";
        _controller.ControllerContext = new ControllerContext { HttpContext = context };
        var request = new UpdateSubtitlePreferencesRequestDto("en");
        var expected = new UpdateSubtitlePreferencesResponseDto("en", "NEW_SUBTITLE_TOKEN");
        _mockMeetingService
            .Setup(service => service.UpdateSubtitlePreferencesAsync(
                "ABCXYZ",
                request,
                "SESSION_TOKEN",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        var result = await _controller.UpdateSubtitlePreferences("ABCXYZ", request, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Same(expected, ok.Value);
    }

    [Fact]
    public async Task SaveMeetingMinutes_ReturnsOk_WithPersistedMinutes()
    {
        var request = new SaveMeetingMinutesRequest(
            "Sprint Review",
            "The team agreed on the release scope.",
            "# Sprint Review\n\nRelease scope approved.",
            ["Ship the approved scope"],
            [new ActionItemDto("Prepare release notes", "Hieu", "2026-10-05", "High")]);
        var expected = new MeetingMinutesResponse(
            Guid.NewGuid(),
            "ABCXYZ",
            request.Title,
            request.Summary,
            request.MarkdownContent,
            request.Decisions!,
            request.ActionItems!,
            DateTime.UtcNow);
        _mockMeetingService
            .Setup(service => service.SaveMeetingMinutesAsync(
                "ABCXYZ",
                request,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        var result = await _controller.SaveMeetingMinutes("ABCXYZ", request, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Same(expected, ok.Value);
    }

    [Fact]
    public async Task GetMeetingMinutes_ReturnsOk_WithSavedMinutes()
    {
        var expected = new MeetingMinutesResponse(
            Guid.NewGuid(),
            "ABCXYZ",
            "Sprint Review",
            "The team agreed on the release scope.",
            "# Sprint Review",
            ["Ship the approved scope"],
            [new ActionItemDto("Prepare release notes", "Hieu", null, "High")],
            DateTime.UtcNow);
        _mockMeetingService
            .Setup(service => service.GetMeetingMinutesAsync(
                "ABCXYZ",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        var result = await _controller.GetMeetingMinutes("ABCXYZ", CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Same(expected, ok.Value);
    }
}
