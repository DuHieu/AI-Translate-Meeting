using AITranslateMeeting.Api.Data;
using AITranslateMeeting.Api.DTOs;
using AITranslateMeeting.Api.Exceptions;
using AITranslateMeeting.Api.Options;
using AITranslateMeeting.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Moq;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Xunit;

namespace AITranslateMeeting.Api.Tests;

public sealed class AdmissionFlowTests
{
    private readonly AppDbContext _dbContext;
    private readonly MutableTimeProvider _timeProvider;
    private readonly AdmissionTokenOptions _tokenOptions;
    private readonly MeetingService _service;

    public AdmissionFlowTests()
    {
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _dbContext = new AppDbContext(dbOptions);
        _timeProvider = new MutableTimeProvider(DateTimeOffset.UtcNow);
        _tokenOptions = new AdmissionTokenOptions
        {
            Issuer = "admission-tests",
            Audience = "admission-tests-web",
            SigningKey = "test-only-admission-signing-key-with-at-least-32-characters",
            HostTokenTtlMinutes = 240,
            InviteTokenTtlMinutes = 15,
            RequestTokenTtlMinutes = 15
        };

        var liveKit = new Mock<ILiveKitService>();
        liveKit.Setup(x => x.GenerateAccessToken(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns("LIVEKIT_TOKEN");
        liveKit.Setup(x => x.GetPublicUrl()).Returns("ws://127.0.0.1:7880");

        var subtitle = new Mock<ISubtitleTokenService>();
        subtitle.Setup(x => x.GenerateAccessToken(It.IsAny<Guid>(), It.IsAny<Guid>()))
            .Returns("SUBTITLE_TOKEN");
        subtitle.Setup(x => x.GenerateAccessToken(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>()))
            .Returns("SUBTITLE_TOKEN");
        subtitle.Setup(x => x.GenerateAccessToken(
                It.IsAny<Guid>(),
                It.IsAny<Guid>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>()))
            .Returns("SUBTITLE_TOKEN");

        var admissionTokens = new AdmissionTokenService(
            Microsoft.Extensions.Options.Options.Create(_tokenOptions),
            _timeProvider);

        var sessionOptions = Microsoft.Extensions.Options.Options.Create(new AITranslateMeeting.Api.Options.SessionTokenOptions
        {
            Issuer = "admission-tests",
            Audience = "admission-tests-web",
            SigningKey = "test-only-session-signing-key-with-at-least-32-characters",
            TokenTtlMinutes = 60
        });
        var sessionService = new ParticipantSessionService(_dbContext, sessionOptions, _timeProvider);

        _service = new MeetingService(
            _dbContext,
            liveKit.Object,
            subtitle.Object,
            admissionTokens,
            sessionService,
            _timeProvider,
            Mock.Of<ILogger<MeetingService>>());
    }

    [Fact]
    public async Task Host_CreatesMeeting_AndJoinsAsHost()
    {
        var meeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("Host flow"));

        var result = Assert.IsType<JoinMeetingResponseDto>(await _service.JoinMeetingAsync(
            meeting.MeetingCode,
            new JoinMeetingRequestDto("Owner", "vi", "en", meeting.HostToken)));

        Assert.Equal("host", result.Role);
        Assert.Equal("LIVEKIT_TOKEN", result.Token);
        Assert.Equal("SUBTITLE_TOKEN", result.SubtitleToken);
    }

    [Fact]
    public async Task InvitedParticipant_WithValidInvite_JoinsOnce()
    {
        var meeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("Invite flow"));
        var invite = await _service.CreateInviteAsync(
            meeting.MeetingCode,
            meeting.HostToken,
            new CreateInviteRequestDto(10));

        var request = new JoinMeetingRequestDto("Tanaka", "ja", "vi", invite.Token);
        var joined = Assert.IsType<JoinMeetingResponseDto>(
            await _service.JoinMeetingAsync(meeting.MeetingCode, request));

        Assert.Equal("participant", joined.Role);
        var replay = await Assert.ThrowsAsync<AdmissionException>(
            () => _service.JoinMeetingAsync(meeting.MeetingCode, request));
        Assert.Equal("admission_already_used", replay.Code);
    }

    [Fact]
    public async Task MeetingCodeOnly_CreatesPendingAdmission_WithoutParticipantTokens()
    {
        var meeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("Waiting room"));

        var result = Assert.IsType<AdmissionPendingResponseDto>(await _service.JoinMeetingAsync(
            meeting.MeetingCode,
            new JoinMeetingRequestDto("Guest", "en", "vi")));

        Assert.Equal("pending", result.Status);
        Assert.False(string.IsNullOrWhiteSpace(result.AdmissionToken));
        Assert.Empty(await _dbContext.MeetingParticipants.ToListAsync());
    }

    [Fact]
    public async Task Host_CanApprovePendingParticipant_WhoCanThenJoin()
    {
        var meeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("Approval flow"));
        var pending = Assert.IsType<AdmissionPendingResponseDto>(await _service.JoinMeetingAsync(
            meeting.MeetingCode,
            new JoinMeetingRequestDto("Guest", "en", "vi")));

        var waiting = await _service.GetAdmissionsAsync(meeting.MeetingCode, meeting.HostToken);
        Assert.Contains(waiting, item => item.AdmissionId == pending.AdmissionId && item.Status == "pending");

        await _service.DecideAdmissionAsync(
            meeting.MeetingCode,
            pending.AdmissionId,
            meeting.HostToken,
            new AdmissionDecisionRequestDto("approved"));

        var joined = Assert.IsType<JoinMeetingResponseDto>(await _service.JoinMeetingAsync(
            meeting.MeetingCode,
            new JoinMeetingRequestDto("Guest", "en", "vi", pending.AdmissionToken)));
        Assert.Equal("participant", joined.Role);
    }

    [Fact]
    public async Task ExpiredInvite_IsRejected()
    {
        var meeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("Expiry"));
        var invite = await _service.CreateInviteAsync(
            meeting.MeetingCode,
            meeting.HostToken,
            new CreateInviteRequestDto(1));
        _timeProvider.Advance(TimeSpan.FromMinutes(2));

        var error = await Assert.ThrowsAsync<AdmissionException>(() => _service.JoinMeetingAsync(
            meeting.MeetingCode,
            new JoinMeetingRequestDto("Late guest", "en", "vi", invite.Token)));

        Assert.Equal("admission_token_expired", error.Code);
    }

    [Fact]
    public async Task InviteBoundToDifferentMeeting_IsRejected()
    {
        var first = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("Room A"));
        var second = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("Room B"));
        var invite = await _service.CreateInviteAsync(
            first.MeetingCode,
            first.HostToken,
            new CreateInviteRequestDto(10));

        var error = await Assert.ThrowsAsync<AdmissionException>(() => _service.JoinMeetingAsync(
            second.MeetingCode,
            new JoinMeetingRequestDto("Wrong room", "en", "vi", invite.Token)));

        Assert.Equal("admission_wrong_meeting", error.Code);
    }

    [Fact]
    public async Task ParticipantInvite_CannotEscalateToHost()
    {
        var meeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("No escalation"));
        var invite = await _service.CreateInviteAsync(
            meeting.MeetingCode,
            meeting.HostToken,
            new CreateInviteRequestDto(10));

        var forgedRoleToken = CreateSignedToken(
            meeting.MeetingId,
            invite.AdmissionId,
            "host",
            AdmissionTokenScopes.Join,
            _timeProvider.GetUtcNow().AddMinutes(10).UtcDateTime);

        var error = await Assert.ThrowsAsync<AdmissionException>(() => _service.JoinMeetingAsync(
            meeting.MeetingCode,
            new JoinMeetingRequestDto("Guest", "en", "vi", forgedRoleToken)));
        Assert.Equal("admission_role_invalid", error.Code);
    }

    [Fact]
    public async Task RejectedAdmission_CannotJoin()
    {
        var meeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("Rejected flow"));
        var pending = Assert.IsType<AdmissionPendingResponseDto>(await _service.JoinMeetingAsync(
            meeting.MeetingCode,
            new JoinMeetingRequestDto("Guest", "en", "vi")));

        await _service.DecideAdmissionAsync(
            meeting.MeetingCode,
            pending.AdmissionId,
            meeting.HostToken,
            new AdmissionDecisionRequestDto("rejected"));

        var error = await Assert.ThrowsAsync<AdmissionException>(() => _service.JoinMeetingAsync(
            meeting.MeetingCode,
            new JoinMeetingRequestDto("Guest", "en", "vi", pending.AdmissionToken)));
        Assert.Equal("admission_rejected", error.Code);
    }

    private string CreateSignedToken(
        Guid meetingId,
        Guid admissionId,
        string role,
        string scope,
        DateTime expiresAt)
    {
        var descriptor = new SecurityTokenDescriptor
        {
            TokenType = "admission+jwt",
            Issuer = _tokenOptions.Issuer,
            Audience = _tokenOptions.Audience,
            Subject = new ClaimsIdentity([
                new Claim(JwtRegisteredClaimNames.Sub, $"admission:{admissionId}"),
                new Claim(JwtRegisteredClaimNames.Jti, admissionId.ToString()),
                new Claim("meetingId", meetingId.ToString()),
                new Claim("role", role),
                new Claim("scope", scope)
            ]),
            NotBefore = _timeProvider.GetUtcNow().AddSeconds(-5).UtcDateTime,
            Expires = expiresAt,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_tokenOptions.SigningKey)),
                SecurityAlgorithms.HmacSha256)
        };

        var handler = new JwtSecurityTokenHandler();
        return handler.WriteToken(handler.CreateToken(descriptor));
    }

    private sealed class MutableTimeProvider(DateTimeOffset now) : TimeProvider
    {
        private DateTimeOffset _utcNow = now;

        public override DateTimeOffset GetUtcNow() => _utcNow;

        public void Advance(TimeSpan duration) => _utcNow = _utcNow.Add(duration);
    }
}
