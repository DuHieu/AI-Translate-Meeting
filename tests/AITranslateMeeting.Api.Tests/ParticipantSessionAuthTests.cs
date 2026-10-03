using AITranslateMeeting.Api.Data;
using AITranslateMeeting.Api.DTOs;
using AITranslateMeeting.Api.Entities;
using AITranslateMeeting.Api.Exceptions;
using AITranslateMeeting.Api.Options;
using AITranslateMeeting.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace AITranslateMeeting.Api.Tests;

public class ParticipantSessionAuthTests
{
    private readonly AppDbContext _context;
    private readonly IParticipantSessionService _sessionTokenService;
    private readonly IAdmissionTokenService _admissionTokenService;
    private readonly ISubtitleTokenService _subtitleTokenService;
    private readonly MeetingService _meetingService;

    private const string StrongSessionKey = "session_secret_key_testing_32chars_long_12345";
    private const string StrongAdmissionKey = "admission_secret_key_testing_32chars_long_12345";
    private const string StrongSubtitleKey = "subtitle_secret_key_testing_32chars_long_12345";

    public ParticipantSessionAuthTests()
    {
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(dbOptions);

        var timeProvider = TimeProvider.System;

        var sessionOptions = Microsoft.Extensions.Options.Options.Create(new SessionTokenOptions
        {
            Issuer = "ai-translate-meeting-api",
            Audience = "ai-translate-meeting-web",
            SigningKey = StrongSessionKey,
            TokenTtlMinutes = 60
        });

        var admissionOptions = Microsoft.Extensions.Options.Options.Create(new AdmissionTokenOptions
        {
            Issuer = "ai-translate-meeting-api",
            Audience = "ai-translate-meeting-web",
            SigningKey = StrongAdmissionKey,
            HostTokenTtlMinutes = 240,
            InviteTokenTtlMinutes = 15,
            RequestTokenTtlMinutes = 15
        });

        var subtitleOptions = Microsoft.Extensions.Options.Options.Create(new SubtitleTokenOptions
        {
            Issuer = "ai-translate-meeting-api",
            Audience = "ai-translate-meeting-ai-service",
            SigningKey = StrongSubtitleKey,
            TokenTtlMinutes = 10
        });

        _sessionTokenService = new ParticipantSessionService(_context, sessionOptions, timeProvider);
        _admissionTokenService = new AdmissionTokenService(admissionOptions, timeProvider);
        _subtitleTokenService = new SubtitleTokenService(subtitleOptions);

        var mockLiveKit = new Mock<ILiveKitService>();
        mockLiveKit.Setup(l => l.GenerateAccessToken(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns("mock_livekit_token");
        mockLiveKit.Setup(l => l.GetPublicUrl())
            .Returns("ws://localhost:7880");

        var mockLogger = new Mock<ILogger<MeetingService>>();

        _meetingService = new MeetingService(
            _context,
            mockLiveKit.Object,
            _subtitleTokenService,
            _admissionTokenService,
            _sessionTokenService,
            timeProvider,
            mockLogger.Object,
            admissionOptions);
    }

    [Fact]
    public async Task JoinMeeting_IssuesDistinctSessionToken_WithExpectedScopes()
    {
        // Arrange
        var created = await _meetingService.CreateMeetingAsync(new CreateMeetingRequestDto("Security Test Meeting"));
        var invite = await _meetingService.CreateInviteAsync(created.MeetingCode, created.HostToken, new CreateInviteRequestDto());

        // Act
        var joinResult = await _meetingService.JoinMeetingAsync(created.MeetingCode, new JoinMeetingRequestDto("Alice", "vi", "en", invite.Token));
        var response = Assert.IsType<JoinMeetingResponseDto>(joinResult);

        // Assert
        Assert.False(string.IsNullOrWhiteSpace(response.SessionToken));
        Assert.NotEqual(response.Token, response.SessionToken);
        Assert.NotEqual(response.SubtitleToken, response.SessionToken);

        // Validate session token claims
        var claims = await _sessionTokenService.ValidateSessionTokenAsync(response.SessionToken, SessionScopes.Read, response.MeetingId);
        Assert.Equal(response.MeetingId, claims.MeetingId);
        Assert.Equal(response.ParticipantId, claims.ParticipantId);
        Assert.Equal("participant", claims.Role);
        Assert.Contains(SessionScopes.Read, claims.Scopes);
        Assert.Contains(SessionScopes.Leave, claims.Scopes);
        Assert.DoesNotContain(SessionScopes.Host, claims.Scopes);
    }

    [Fact]
    public async Task GetMeeting_ThrowsUnauthorized_WhenSessionTokenIsMissing()
    {
        var created = await _meetingService.CreateMeetingAsync(new CreateMeetingRequestDto("Auth Check"));

        var ex = await Assert.ThrowsAsync<AdmissionException>(() =>
            _meetingService.GetMeetingAsync(created.MeetingCode, ""));

        Assert.Equal(401, ex.StatusCode);
        Assert.Equal("session_token_missing", ex.Code);
    }

    [Fact]
    public async Task GetMeeting_ThrowsForbidden_WhenSessionTokenBelongsToDifferentMeeting()
    {
        var meeting1 = await _meetingService.CreateMeetingAsync(new CreateMeetingRequestDto("Meeting 1"));
        var meeting2 = await _meetingService.CreateMeetingAsync(new CreateMeetingRequestDto("Meeting 2"));

        var invite1 = await _meetingService.CreateInviteAsync(meeting1.MeetingCode, meeting1.HostToken, new CreateInviteRequestDto());
        var join1 = Assert.IsType<JoinMeetingResponseDto>(
            await _meetingService.JoinMeetingAsync(meeting1.MeetingCode, new JoinMeetingRequestDto("Bob", "vi", "en", invite1.Token)));

        // Try using meeting1 session token to access meeting2
        var ex = await Assert.ThrowsAsync<AdmissionException>(() =>
            _meetingService.GetMeetingAsync(meeting2.MeetingCode, join1.SessionToken));

        Assert.Equal(403, ex.StatusCode);
        Assert.Equal("session_cross_room", ex.Code);
    }

    [Fact]
    public async Task LeaveMeeting_ThrowsForbidden_WhenParticipantAttemptsImpersonation()
    {
        var meeting = await _meetingService.CreateMeetingAsync(new CreateMeetingRequestDto("Impersonation Test"));
        var invite1 = await _meetingService.CreateInviteAsync(meeting.MeetingCode, meeting.HostToken, new CreateInviteRequestDto());
        var invite2 = await _meetingService.CreateInviteAsync(meeting.MeetingCode, meeting.HostToken, new CreateInviteRequestDto());

        var user1 = Assert.IsType<JoinMeetingResponseDto>(
            await _meetingService.JoinMeetingAsync(meeting.MeetingCode, new JoinMeetingRequestDto("User 1", "vi", "en", invite1.Token)));
        var user2 = Assert.IsType<JoinMeetingResponseDto>(
            await _meetingService.JoinMeetingAsync(meeting.MeetingCode, new JoinMeetingRequestDto("User 2", "vi", "en", invite2.Token)));

        // User 1 attempts to leave User 2's participantId
        var ex = await Assert.ThrowsAsync<AdmissionException>(() =>
            _meetingService.LeaveMeetingAsync(meeting.MeetingCode, new LeaveMeetingRequestDto(user2.ParticipantId), user1.SessionToken));

        Assert.Equal(403, ex.StatusCode);
        Assert.Equal("participant_impersonation", ex.Code);
    }

    [Fact]
    public async Task HostEndpoints_RejectParticipantToken_PreventingRoleEscalation()
    {
        var meeting = await _meetingService.CreateMeetingAsync(new CreateMeetingRequestDto("Escalation Test"));
        var invite = await _meetingService.CreateInviteAsync(meeting.MeetingCode, meeting.HostToken, new CreateInviteRequestDto());

        var participant = Assert.IsType<JoinMeetingResponseDto>(
            await _meetingService.JoinMeetingAsync(meeting.MeetingCode, new JoinMeetingRequestDto("Attacker", "vi", "en", invite.Token)));

        // Participant tries to create an invite
        var ex = await Assert.ThrowsAsync<AdmissionException>(() =>
            _meetingService.CreateInviteAsync(meeting.MeetingCode, participant.SessionToken, new CreateInviteRequestDto()));

        Assert.Equal(403, ex.StatusCode);
        Assert.Equal("host_role_required", ex.Code);
    }

    [Fact]
    public async Task LeaveMeeting_Succeeds_AndRevokesSessionToken()
    {
        var meeting = await _meetingService.CreateMeetingAsync(new CreateMeetingRequestDto("Revocation Test"));
        var invite = await _meetingService.CreateInviteAsync(meeting.MeetingCode, meeting.HostToken, new CreateInviteRequestDto());

        var user = Assert.IsType<JoinMeetingResponseDto>(
            await _meetingService.JoinMeetingAsync(meeting.MeetingCode, new JoinMeetingRequestDto("User", "vi", "en", invite.Token)));

        // User leaves with their own session token
        await _meetingService.LeaveMeetingAsync(meeting.MeetingCode, new LeaveMeetingRequestDto(user.ParticipantId), user.SessionToken);

        // Subsequent API call with the revoked token must fail with 401
        var ex = await Assert.ThrowsAsync<AdmissionException>(() =>
            _meetingService.GetMeetingAsync(meeting.MeetingCode, user.SessionToken));

        Assert.Equal(401, ex.StatusCode);
        Assert.Equal("session_token_revoked", ex.Code);
    }

    [Fact]
    public async Task SubtitleToken_CannotBeUsedAsApiSessionToken()
    {
        var meeting = await _meetingService.CreateMeetingAsync(new CreateMeetingRequestDto("Subtitle Token Abuse Test"));
        var invite = await _meetingService.CreateInviteAsync(meeting.MeetingCode, meeting.HostToken, new CreateInviteRequestDto());

        var user = Assert.IsType<JoinMeetingResponseDto>(
            await _meetingService.JoinMeetingAsync(meeting.MeetingCode, new JoinMeetingRequestDto("User", "vi", "en", invite.Token)));

        // Attempt to call getMeeting using subtitleToken (which has subtitle:write scope)
        var ex = await Assert.ThrowsAsync<AdmissionException>(() =>
            _meetingService.GetMeetingAsync(meeting.MeetingCode, user.SubtitleToken));

        Assert.Equal(401, ex.StatusCode);
    }

    [Fact]
    public async Task JoinMeeting_DoesNotLeaveOrphanedParticipant_WhenSessionPersistenceFails()
    {
        var failingSessionService = new Mock<IParticipantSessionService>();
        failingSessionService
            .Setup(service => service.GenerateSessionTokenAsync(
                It.IsAny<Meeting>(),
                It.IsAny<MeetingParticipant>(),
                It.IsAny<string>(),
                It.IsAny<IEnumerable<string>>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Simulated session persistence failure."));

        var liveKit = new Mock<ILiveKitService>();
        liveKit.Setup(service => service.GenerateAccessToken(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns("mock_livekit_token");
        liveKit.Setup(service => service.GetPublicUrl()).Returns("ws://localhost:7880");

        var admissionOptions = Microsoft.Extensions.Options.Options.Create(new AdmissionTokenOptions
        {
            Issuer = "ai-translate-meeting-api",
            Audience = "ai-translate-meeting-web",
            SigningKey = StrongAdmissionKey,
            HostTokenTtlMinutes = 240,
            InviteTokenTtlMinutes = 15,
            RequestTokenTtlMinutes = 15
        });

        var service = new MeetingService(
            _context,
            liveKit.Object,
            _subtitleTokenService,
            _admissionTokenService,
            failingSessionService.Object,
            TimeProvider.System,
            Mock.Of<ILogger<MeetingService>>(),
            admissionOptions);

        var meeting = await service.CreateMeetingAsync(new CreateMeetingRequestDto("Atomic join"));
        var invite = await service.CreateInviteAsync(meeting.MeetingCode, meeting.HostToken, new CreateInviteRequestDto());

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.JoinMeetingAsync(
                meeting.MeetingCode,
                new JoinMeetingRequestDto("Alice", "vi", "en", invite.Token)));

        Assert.Empty(await _context.MeetingParticipants.ToListAsync());
        var admission = Assert.Single(await _context.MeetingAdmissions.ToListAsync());
        Assert.Null(admission.ConsumedAt);
    }
}
