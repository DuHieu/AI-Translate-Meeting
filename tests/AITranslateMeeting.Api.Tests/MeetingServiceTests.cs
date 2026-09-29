using AITranslateMeeting.Api.Data;
using AITranslateMeeting.Api.DTOs;
using AITranslateMeeting.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AITranslateMeeting.Api.Tests;

public class MeetingServiceTests
{
    private readonly AppDbContext _dbContext;
    private readonly Mock<ILiveKitService> _mockLiveKitService;
    private readonly Mock<ILogger<MeetingService>> _mockLogger;
    private readonly MeetingService _service;

    public MeetingServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _dbContext = new AppDbContext(options);
        _mockLiveKitService = new Mock<ILiveKitService>();
        _mockLogger = new Mock<ILogger<MeetingService>>();

        _mockLiveKitService
            .Setup(x => x.GenerateAccessToken(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns("MOCK_JWT_LIVEKIT_TOKEN");

        _mockLiveKitService
            .Setup(x => x.GetPublicUrl())
            .Returns("ws://127.0.0.1:7880");

        _service = new MeetingService(_dbContext, _mockLiveKitService.Object, _mockLogger.Object);
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
        var fetched = await _service.GetMeetingAsync(created.MeetingCode);

        // Assert
        Assert.NotNull(fetched);
        Assert.Equal(created.MeetingId, fetched.MeetingId);
        Assert.Equal(created.MeetingCode, fetched.MeetingCode);
    }

    [Fact]
    public async Task GetMeeting_Invalid_Returns404()
    {
        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.GetMeetingAsync("INVALID_CODE"));
    }

    [Fact]
    public async Task JoinMeeting_ReturnsLiveKitToken()
    {
        // Arrange
        var meeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("LiveKit Room"));
        var joinReq = new JoinMeetingRequestDto("Hieu", "vi", "ja");

        // Act
        var result = await _service.JoinMeetingAsync(meeting.MeetingCode, joinReq);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("MOCK_JWT_LIVEKIT_TOKEN", result.Token);
        Assert.Equal("ws://127.0.0.1:7880", result.LiveKitUrl);
        Assert.StartsWith("p_", result.Identity);
    }

    [Fact]
    public async Task JoinMeeting_InvalidLanguage_Returns400()
    {
        // Arrange
        var meeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("Lang Test"));
        var invalidReq = new JoinMeetingRequestDto("Hieu", "fr", "ja");

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() => _service.JoinMeetingAsync(meeting.MeetingCode, invalidReq));
    }

    [Fact]
    public async Task JoinMeeting_CreatesParticipant()
    {
        // Arrange
        var meeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("Participant Test"));
        var joinReq = new JoinMeetingRequestDto("Tanaka", "ja", "vi");

        // Act
        var result = await _service.JoinMeetingAsync(meeting.MeetingCode, joinReq);

        // Assert
        var participantInDb = await _dbContext.MeetingParticipants.FindAsync(result.ParticipantId);
        Assert.NotNull(participantInDb);
        Assert.Equal("Tanaka", participantInDb.DisplayName);
        Assert.Equal("ja", participantInDb.SpokenLanguage);
        Assert.Equal("vi", participantInDb.TargetLanguage);
        Assert.Null(participantInDb.LeftAt);
    }

    [Fact]
    public async Task JoinMeeting_MissingMeeting_Returns404()
    {
        // Arrange
        var joinReq = new JoinMeetingRequestDto("Hieu", "vi", "ja");

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.JoinMeetingAsync("NOTFOUND", joinReq));
    }

    [Fact]
    public async Task LeaveMeeting_SetsLeftAt()
    {
        // Arrange
        var meeting = await _service.CreateMeetingAsync(new CreateMeetingRequestDto("Leave Test"));
        var joined = await _service.JoinMeetingAsync(meeting.MeetingCode, new JoinMeetingRequestDto("Hieu", "vi", "ja"));

        // Act
        await _service.LeaveMeetingAsync(meeting.MeetingCode, new LeaveMeetingRequestDto(joined.ParticipantId));

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
        var p1 = await _service.JoinMeetingAsync(meeting.MeetingCode, new JoinMeetingRequestDto("Hieu", "vi", "ja"));
        var p2 = await _service.JoinMeetingAsync(meeting.MeetingCode, new JoinMeetingRequestDto("Tanaka", "ja", "vi"));

        // Hieu leaves
        await _service.LeaveMeetingAsync(meeting.MeetingCode, new LeaveMeetingRequestDto(p1.ParticipantId));

        // Act
        var active = (await _service.GetActiveParticipantsAsync(meeting.MeetingCode)).ToList();

        // Assert
        Assert.Single(active);
        Assert.Equal("Tanaka", active[0].DisplayName);
        Assert.Equal(p2.ParticipantId, active[0].ParticipantId);
    }
}
