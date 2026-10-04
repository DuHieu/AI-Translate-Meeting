using AITranslateMeeting.Api.Data;
using AITranslateMeeting.Api.DTOs;
using AITranslateMeeting.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AITranslateMeeting.Api.Tests;

public class MeetingServiceTests
{
    private readonly AppDbContext _dbContext;
    private readonly Mock<ILiveKitService> _mockLiveKitService;
    private readonly Mock<ISubtitleTokenService> _mockSubtitleTokenService;
    private readonly Mock<IAdmissionTokenService> _mockAdmissionTokenService;
    private readonly Mock<ILogger<MeetingService>> _mockLogger;
    private readonly MeetingService _service;

    public MeetingServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _dbContext = new AppDbContext(options);
        _mockLiveKitService = new Mock<ILiveKitService>();
        _mockSubtitleTokenService = new Mock<ISubtitleTokenService>();
        _mockAdmissionTokenService = new Mock<IAdmissionTokenService>();
        _mockLogger = new Mock<ILogger<MeetingService>>();

        _mockLiveKitService
            .Setup(x => x.GenerateAccessToken(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns("MOCK_JWT_LIVEKIT_TOKEN");

        _mockLiveKitService
            .Setup(x => x.GetPublicUrl())
            .Returns("ws://127.0.0.1:7880");

        _mockSubtitleTokenService
            .Setup(x => x.GenerateAccessToken(It.IsAny<Guid>(), It.IsAny<Guid>()))
            .Returns("MOCK_SUBTITLE_SESSION_TOKEN");
        _mockSubtitleTokenService
            .Setup(x => x.GenerateAccessToken(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>()))
            .Returns("MOCK_SUBTITLE_SESSION_TOKEN");
        _mockSubtitleTokenService
            .Setup(x => x.GenerateAccessToken(
                It.IsAny<Guid>(),
                It.IsAny<Guid>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>()))
            .Returns("MOCK_SUBTITLE_SESSION_TOKEN");

        _mockAdmissionTokenService
            .Setup(x => x.GenerateHostToken(It.IsAny<Guid>()))
            .Returns("MOCK_HOST_TOKEN");
        _mockAdmissionTokenService
            .Setup(x => x.ValidateToken("MOCK_HOST_TOKEN"))
            .Returns(() => new AdmissionTokenClaims(
                _dbContext.Meetings.Single().Id,
                null,
                "host",
                AdmissionTokenScopes.Host,
                DateTime.UtcNow.AddHours(1)));

        var sessionOptions = Microsoft.Extensions.Options.Options.Create(new AITranslateMeeting.Api.Options.SessionTokenOptions
        {
            Issuer = "ai-translate-meeting-api",
            Audience = "ai-translate-meeting-web",
            SigningKey = "test_session_secret_key_32chars_long_12345",
            TokenTtlMinutes = 60
        });
        var sessionService = new ParticipantSessionService(_dbContext, sessionOptions, TimeProvider.System);

        _service = new MeetingService(
            _dbContext,
            _mockLiveKitService.Object,
            _mockSubtitleTokenService.Object,
            _mockAdmissionTokenService.Object,
            sessionService,
            TimeProvider.System,
            _mockLogger.Object);
    }

    [Fact]
    public async Task CreateMeeting_ReturnsCreatedMeeting()
    {
        // Arrange
        var request = new CreateMeetingRequestDto("Vietnam Japan Daily");

        // Act
        var result = await _service.CreateMeetingAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Vietnam Japan Daily", result.Name);
        Assert.NotEqual(Guid.Empty, result.MeetingId);
        Assert.StartsWith("meeting_", result.RoomName);
    }

    [Fact]
    public async Task CreateMeeting_GeneratesMeetingCode()
    {
        // Arrange
        var request = new CreateMeetingRequestDto("Team Sync");

        // Act
        var result = await _service.CreateMeetingAsync(request);

        // Assert
        Assert.NotNull(result.MeetingCode);
        Assert.Equal(6, result.MeetingCode.Length);
        Assert.Equal(result.MeetingCode.ToUpperInvariant(), result.MeetingCode);
    }

    [Fact]
    public async Task GetMeeting_ReturnsMeeting()
    {
        // Arrange
        var created = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("Test Meeting"));

        // Act
        var fetched = await _service.GetMeetingAsync(created.MeetingCode, created.HostToken);

        // Assert
        Assert.NotNull(fetched);
        Assert.Equal(created.MeetingId, fetched.MeetingId);
        Assert.Equal(created.MeetingCode, fetched.MeetingCode);
    }

    [Fact]
    public async Task GetMeeting_Invalid_Returns404()
    {
        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.GetMeetingAsync("INVALID_CODE", "MOCK_HOST_TOKEN"));
    }

    [Fact]
    public async Task JoinMeeting_ReturnsLiveKitToken()
    {
        // Arrange
        var meeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("LiveKit Room"));
        var joinReq = new JoinMeetingRequestDto("Hieu", "vi", "ja", meeting.HostToken);

        // Act
        var result = Assert.IsType<JoinMeetingResponseDto>(await _service.JoinMeetingAsync(meeting.MeetingCode, joinReq));

        // Assert
        Assert.NotNull(result);
        Assert.Equal("MOCK_JWT_LIVEKIT_TOKEN", result.Token);
        Assert.Equal("MOCK_SUBTITLE_SESSION_TOKEN", result.SubtitleToken);
        Assert.Equal("ws://127.0.0.1:7880", result.LiveKitUrl);
        Assert.StartsWith("p_", result.Identity);
        _mockSubtitleTokenService.Verify(
            service => service.GenerateAccessToken(
                result.MeetingId,
                result.ParticipantId,
                "Hieu",
                "vi",
                "ja",
                result.Identity),
            Times.Once);
    }

    [Fact]
    public async Task JoinMeeting_InvalidLanguage_Returns400()
    {
        // Arrange
        var meeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("Lang Test"));
        var invalidReq = new JoinMeetingRequestDto("Hieu", "xx", "ja", meeting.HostToken);

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() => _service.JoinMeetingAsync(meeting.MeetingCode, invalidReq));
    }

    [Theory]
    [InlineData("ko", "en")]
    [InlineData("zh", "vi")]
    [InlineData("fr", "ja")]
    [InlineData("de", "en")]
    [InlineData("es", "vi")]
    public async Task JoinMeeting_SupportedPopularLanguages_Succeeds(string spokenLang, string targetLang)
    {
        // Arrange
        var meeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("Multi-lang Test"));
        var req = new JoinMeetingRequestDto("Global User", spokenLang, targetLang, meeting.HostToken);

        // Act
        var result = Assert.IsType<JoinMeetingResponseDto>(await _service.JoinMeetingAsync(meeting.MeetingCode, req));

        // Assert
        Assert.NotNull(result);
        var participantInDb = await _dbContext.MeetingParticipants.FindAsync(result.ParticipantId);
        Assert.NotNull(participantInDb);
        Assert.Equal(spokenLang, participantInDb.SpokenLanguage);
        Assert.Equal(targetLang, participantInDb.TargetLanguage);
    }

    [Fact]
    public async Task JoinMeeting_CreatesParticipant()
    {
        // Arrange
        var meeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("Participant Test"));
        var joinReq = new JoinMeetingRequestDto("Tanaka", "ja", "vi", meeting.HostToken);

        // Act
        var result = Assert.IsType<JoinMeetingResponseDto>(await _service.JoinMeetingAsync(meeting.MeetingCode, joinReq));

        // Assert
        var participantInDb = await _dbContext.MeetingParticipants.FindAsync(result.ParticipantId);
        Assert.NotNull(participantInDb);
        Assert.Equal("Tanaka", participantInDb.DisplayName);
        Assert.Equal("ja", participantInDb.SpokenLanguage);
        Assert.Equal("vi", participantInDb.TargetLanguage);
        Assert.Null(participantInDb.LeftAt);
    }

    [Fact]
    public async Task UpdateSubtitlePreferences_UpdatesAuthenticatedParticipantAndIssuesBoundToken()
    {
        var meeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("Language switch"));
        var joined = Assert.IsType<JoinMeetingResponseDto>(await _service.JoinMeetingAsync(
            meeting.MeetingCode,
            new JoinMeetingRequestDto("Hieu", "vi", "ja", meeting.HostToken)));

        _mockSubtitleTokenService
            .Setup(service => service.GenerateAccessToken(
                joined.MeetingId,
                joined.ParticipantId,
                joined.DisplayName,
                joined.SpokenLanguage,
                "en",
                joined.Identity))
            .Returns("REFRESHED_SUBTITLE_TOKEN");

        var response = await _service.UpdateSubtitlePreferencesAsync(
            meeting.MeetingCode,
            new UpdateSubtitlePreferencesRequestDto("EN"),
            joined.SessionToken);

        Assert.Equal("en", response.TargetLanguage);
        Assert.Equal("REFRESHED_SUBTITLE_TOKEN", response.SubtitleToken);
        var participant = await _dbContext.MeetingParticipants.FindAsync(joined.ParticipantId);
        Assert.NotNull(participant);
        Assert.Equal("en", participant.TargetLanguage);
        _mockSubtitleTokenService.Verify(service => service.GenerateAccessToken(
            joined.MeetingId,
            joined.ParticipantId,
            joined.DisplayName,
            joined.SpokenLanguage,
            "en",
            joined.Identity), Times.Once);
    }

    [Fact]
    public async Task UpdateSubtitlePreferences_RejectsSessionFromAnotherRoom()
    {
        var firstMeeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("First room"));
        var firstParticipant = Assert.IsType<JoinMeetingResponseDto>(await _service.JoinMeetingAsync(
            firstMeeting.MeetingCode,
            new JoinMeetingRequestDto("Hieu", "vi", "ja", firstMeeting.HostToken)));
        var secondMeeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("Second room"));

        var error = await Assert.ThrowsAsync<AITranslateMeeting.Api.Exceptions.AdmissionException>(() =>
            _service.UpdateSubtitlePreferencesAsync(
                secondMeeting.MeetingCode,
                new UpdateSubtitlePreferencesRequestDto("en"),
                firstParticipant.SessionToken));

        Assert.Equal("session_cross_room", error.Code);
        Assert.Equal(StatusCodes.Status403Forbidden, error.StatusCode);
    }

    [Fact]
    public async Task UpdateSubtitlePreferences_RejectsUnsupportedLanguage()
    {
        var meeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("Invalid language"));
        var joined = Assert.IsType<JoinMeetingResponseDto>(await _service.JoinMeetingAsync(
            meeting.MeetingCode,
            new JoinMeetingRequestDto("Hieu", "vi", "ja", meeting.HostToken)));

        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.UpdateSubtitlePreferencesAsync(
                meeting.MeetingCode,
                new UpdateSubtitlePreferencesRequestDto("xx"),
                joined.SessionToken));
    }

    [Fact]
    public async Task JoinMeeting_MissingMeeting_Returns404()
    {
        // Arrange
        var joinReq = new JoinMeetingRequestDto("Hieu", "vi", "ja", "MOCK_HOST_TOKEN");

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.JoinMeetingAsync("NOTFOUND", joinReq));
    }

    [Fact]
    public async Task LeaveMeeting_SetsLeftAt()
    {
        // Arrange
        var meeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("Leave Test"));
        var joined = Assert.IsType<JoinMeetingResponseDto>(await _service.JoinMeetingAsync(meeting.MeetingCode, new JoinMeetingRequestDto("Hieu", "vi", "ja", meeting.HostToken)));

        // Act
        await _service.LeaveMeetingAsync(meeting.MeetingCode, new LeaveMeetingRequestDto(joined.ParticipantId), joined.SessionToken);

        // Assert
        var participantInDb = await _dbContext.MeetingParticipants.FindAsync(joined.ParticipantId);
        Assert.NotNull(participantInDb);
        Assert.NotNull(participantInDb.LeftAt);
    }

    [Fact]
    public async Task GetParticipants_ReturnsOnlyActiveParticipants()
    {
        // Arrange
        var meeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("Active Participants Test"));
        var p1 = Assert.IsType<JoinMeetingResponseDto>(await _service.JoinMeetingAsync(meeting.MeetingCode, new JoinMeetingRequestDto("Hieu", "vi", "ja", meeting.HostToken)));
        var p2 = Assert.IsType<JoinMeetingResponseDto>(await _service.JoinMeetingAsync(meeting.MeetingCode, new JoinMeetingRequestDto("Tanaka", "ja", "vi", meeting.HostToken)));

        // Hieu leaves
        await _service.LeaveMeetingAsync(meeting.MeetingCode, new LeaveMeetingRequestDto(p1.ParticipantId), p1.SessionToken);

        // Act
        var active = (await _service.GetActiveParticipantsAsync(meeting.MeetingCode, p2.SessionToken)).ToList();

        // Assert
        Assert.Single(active);
        Assert.Equal("Tanaka", active[0].DisplayName);
        Assert.Equal(p2.ParticipantId, active[0].ParticipantId);
    }

    [Fact]
    public async Task LeaveMeeting_WhenAllParticipantsLeave_AutomaticallySetsEndedAt()
    {
        var meeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("Auto End Test"));
        var joined = Assert.IsType<JoinMeetingResponseDto>(
            await _service.JoinMeetingAsync(meeting.MeetingCode, new JoinMeetingRequestDto("Hieu", "vi", "en", meeting.HostToken)));

        // Before leaving, EndedAt is null
        var meetingBefore = await _dbContext.Meetings.FindAsync(meeting.MeetingId);
        Assert.Null(meetingBefore!.EndedAt);

        // Leave meeting (last active participant)
        await _service.LeaveMeetingAsync(meeting.MeetingCode, new LeaveMeetingRequestDto(joined.ParticipantId), joined.SessionToken);

        // After leaving, meeting EndedAt is automatically set
        var meetingAfter = await _dbContext.Meetings.FindAsync(meeting.MeetingId);
        Assert.NotNull(meetingAfter!.EndedAt);
    }

    [Fact]
    public async Task EndMeeting_ByHost_SetsEndedAt_AndMarksParticipantsLeft()
    {
        var meeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("Host End Test"));
        var p1 = Assert.IsType<JoinMeetingResponseDto>(
            await _service.JoinMeetingAsync(meeting.MeetingCode, new JoinMeetingRequestDto("User 1", "vi", "en", meeting.HostToken)));
        var p2 = Assert.IsType<JoinMeetingResponseDto>(
            await _service.JoinMeetingAsync(meeting.MeetingCode, new JoinMeetingRequestDto("User 2", "en", "vi", meeting.HostToken)));

        // Host ends the meeting
        await _service.EndMeetingAsync(meeting.MeetingCode, meeting.HostToken);

        var meetingInDb = await _dbContext.Meetings.FindAsync(meeting.MeetingId);
        Assert.NotNull(meetingInDb!.EndedAt);

        var participant1 = await _dbContext.MeetingParticipants.FindAsync(p1.ParticipantId);
        var participant2 = await _dbContext.MeetingParticipants.FindAsync(p2.ParticipantId);
        Assert.NotNull(participant1!.LeftAt);
        Assert.NotNull(participant2!.LeftAt);
    }

    [Fact]
    public async Task EndMeeting_WhenAlreadyEnded_ThrowsConflict()
    {
        var meeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("Already Ended Test"));
        await _service.EndMeetingAsync(meeting.MeetingCode, meeting.HostToken);

        var ex = await Assert.ThrowsAsync<AITranslateMeeting.Api.Exceptions.AdmissionException>(() =>
            _service.EndMeetingAsync(meeting.MeetingCode, meeting.HostToken));

        Assert.Equal(409, ex.StatusCode);
        Assert.Equal("meeting_ended", ex.Code);
    }

    [Fact]
    public async Task SaveAndGetMeetingMinutes_PersistsStructuredRecap()
    {
        var meeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("Sprint Review"));
        var request = new SaveMeetingMinutesRequest(
            "Sprint Review",
            "The release scope was approved.",
            "# Sprint Review\n\nThe release scope was approved.",
            ["Ship the approved scope"],
            [new ActionItemDto("Prepare release notes", "Hieu", "2026-10-05", "High")]);

        var saved = await _service.SaveMeetingMinutesAsync(meeting.MeetingCode, request);
        var fetched = await _service.GetMeetingMinutesAsync(meeting.MeetingCode);

        Assert.Equal(saved.Id, fetched.Id);
        Assert.Equal(saved.CreatedAt, fetched.CreatedAt);
        Assert.Equal(saved.Title, fetched.Title);
        Assert.Equal(saved.Summary, fetched.Summary);
        Assert.Equal(saved.MarkdownContent, fetched.MarkdownContent);
        Assert.Equal(meeting.MeetingCode, fetched.MeetingCode);
        Assert.Equal(request.Decisions, fetched.Decisions);
        Assert.Equal(request.ActionItems, fetched.ActionItems);
    }

    [Fact]
    public async Task GetMeetingMinutes_WhenMeetingDoesNotExist_ThrowsNotFound()
    {
        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            _service.GetMeetingMinutesAsync("MISSING"));
    }
}
